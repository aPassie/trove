package compute

import (
	"os"
	"testing"

	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

func fixture(t *testing.T, name string) string {
	t.Helper()
	b, err := os.ReadFile("../parsing/testdata/" + name)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	return string(b)
}

// End-to-end over the real synthetic fixtures: the AIS shows a property sale,
// so the engine must REFUSE an ITR-4 and route to ITR-3 — not draft a wrong
// return. This is the audit-safe guardrail working on real document data.
func TestBuildProfile_PropertySaleRoutesToITR3(t *testing.T) {
	form26AS := parsing.Parse26AS(fixture(t, "form26as_ay2026_27.txt"))
	ais := parsing.ParseAIS(fixture(t, "ais_ay2026_27.txt"))

	p := BuildProfile(form26AS, ais, Questionnaire{AgeBand: taxrules.AgeBelow60})

	if !p.HasCapitalGains {
		t.Fatal("expected capital-gains signal from AIS property sale")
	}
	res := Compute(p)
	if res.Eligible {
		t.Errorf("expected ineligible (capital gains), got eligible: %+v", res)
	}
	if res.ITRForm == "ITR-4" {
		t.Errorf("must not draft ITR-4 when a property sale is present")
	}
}

// The real fixture has ₹12L of 194C (contract/business) income alongside the
// professional fees. We must NOT silently drop it and over-promise a refund —
// the engine flags HasOtherIncome and routes the user out.
func TestBuildProfile_MixedIncomeBounces(t *testing.T) {
	form26AS := parsing.Parse26AS(fixture(t, "form26as_ay2026_27.txt"))
	p := BuildProfile(form26AS, nil, Questionnaire{AgeBand: taxrules.AgeBelow60})

	// Extraction still works: 194J receipts + TCS captured.
	if p.GrossReceipts != 770000 {
		t.Errorf("professional receipts: got %v, want 770000", p.GrossReceipts)
	}
	if p.TCSCredit != 45000 {
		t.Errorf("TCS credit: got %v, want 45000", p.TCSCredit)
	}
	if !p.HasOtherIncome {
		t.Fatal("expected HasOtherIncome=true (194C present)")
	}
	res := Compute(p)
	if res.Eligible {
		t.Errorf("must not auto-draft when non-professional income is present: %+v", res)
	}
}

// A pure-professional freelancer (only 194J) is eligible and gets the refund.
func TestBuildProfile_PureProfessionalEligible(t *testing.T) {
	st := &parsing.Statement{
		Source: "26AS", PAN: "ABCDE1234F", AssessmentYear: "2026-27", FinancialYear: "2025-26",
		Entries: []parsing.LedgerEntry{
			{Deductor: "Studio A", TAN: "BLRA12345C", Section: "194J", AmountPaid: 1500000, TaxAmount: 90000, Kind: parsing.KindTDS},
			{Deductor: "Car Dealer", TAN: "DELM55443F", Section: "206C-1F", AmountPaid: 4500000, TaxAmount: 30000, Kind: parsing.KindTCS},
		},
	}
	p := BuildProfile(st, nil, Questionnaire{AgeBand: taxrules.AgeBelow60})
	if p.HasOtherIncome {
		t.Fatal("pure 194J should not flag other income")
	}
	res := Compute(p)
	if !res.Eligible || res.ITRForm != "ITR-4" {
		t.Fatalf("expected eligible ITR-4, got %+v", res)
	}
	// presumptive 50% of 15L = 7.5L → tax slabs (4-8L@5%=17500, rebate covers) → 0.
	if res.PresumptiveIncome != 750000 {
		t.Errorf("presumptive: got %v, want 750000", res.PresumptiveIncome)
	}
	if res.TotalLiability != 0 {
		t.Errorf("liability: got %v, want 0 (under 12L rebate)", res.TotalLiability)
	}
	if res.Refund != 120000 { // 90000 TDS + 30000 TCS
		t.Errorf("refund: got %v, want 120000", res.Refund)
	}
}

// a TCS-only statement (e.g. car purchase, no professional TDS) still yields the credit
func TestBuildProfile_TCSOnly(t *testing.T) {
	st := &parsing.Statement{
		Source: "26AS", PAN: "ABCDE1234F", AssessmentYear: "2026-27", FinancialYear: "2025-26",
		Entries: []parsing.LedgerEntry{
			{Deductor: "Car Dealer", TAN: "DELM55443F", Section: "206C-1F", AmountPaid: 4500000, TaxAmount: 45000, Kind: parsing.KindTCS},
		},
	}
	p := BuildProfile(st, nil, Questionnaire{AgeBand: taxrules.AgeBelow60})
	if p.GrossReceipts != 0 || p.TCSCredit != 45000 || len(p.TDSEntries) != 0 {
		t.Fatalf("tcs-only profile wrong: %+v", p)
	}
	r := Compute(p)
	if !r.Eligible || r.Refund != 45000 {
		t.Errorf("tcs-only: eligible=%v refund=%v, want refund 45000", r.Eligible, r.Refund)
	}
}

// when the 26AS parse misses identity fields, the AIS fills them in
func TestBuildProfile_IdentityFallsBackToAIS(t *testing.T) {
	f26 := &parsing.Statement{
		Source: "26AS",
		Entries: []parsing.LedgerEntry{
			{Deductor: "X", Section: "194J", AmountPaid: 1000000, TaxAmount: 100000, Kind: parsing.KindTDS},
		},
	}
	ais := &parsing.Statement{Source: "AIS", PAN: "ABCDE1234F", AssessmentYear: "2026-27", FinancialYear: "2025-26", TaxpayerName: "ARJUN MOCK SHARMA"}
	p := BuildProfile(f26, ais, Questionnaire{AgeBand: taxrules.AgeBelow60})
	if p.PAN != "ABCDE1234F" || p.AssessmentYear != "2026-27" || p.Name != "ARJUN MOCK SHARMA" {
		t.Errorf("identity fallback failed: %+v", p)
	}
	if p.TDSEntries[0].FinancialYear != "2025-26" {
		t.Errorf("fy fallback failed: %+v", p.TDSEntries[0])
	}
}

// AIS-only upload must still work (TDS read from AIS B1 when 26AS is absent).
func TestBuildProfile_AISOnly(t *testing.T) {
	ais := &parsing.Statement{
		Source: "AIS", PAN: "ABCDE1234F", AssessmentYear: "2026-27", FinancialYear: "2025-26",
		Entries: []parsing.LedgerEntry{
			{Deductor: "Client X", Section: "194J", AmountPaid: 1600000, TaxAmount: 80000, Kind: parsing.KindTDS},
		},
	}
	p := BuildProfile(nil, ais, Questionnaire{AgeBand: taxrules.AgeBelow60})
	if p.PAN != "ABCDE1234F" || p.AssessmentYear != "2026-27" {
		t.Errorf("identity not taken from AIS: %+v", p)
	}
	if p.GrossReceipts != 1600000 {
		t.Errorf("AIS receipts: got %v, want 1600000", p.GrossReceipts)
	}
	res := Compute(p)
	if !res.Eligible || res.Refund != 80000 {
		t.Errorf("AIS-only: expected eligible, refund 80000, got eligible=%v refund=%v", res.Eligible, res.Refund)
	}
}
