package parsing

import (
	"os"
	"testing"
)

func readFixture(t *testing.T, name string) string {
	t.Helper()
	b, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return string(b)
}

func TestParse26AS(t *testing.T) {
	st := Parse26AS(readFixture(t, "form26as_ay2026_27.txt"))

	if st.PAN != "ABCDE1234F" {
		t.Errorf("PAN: got %q", st.PAN)
	}
	if st.AssessmentYear != "2026-27" {
		t.Errorf("AY: got %q", st.AssessmentYear)
	}
	if st.FinancialYear != "2025-26" {
		t.Errorf("FY: got %q", st.FinancialYear)
	}
	if st.TaxpayerName != "ARJUN MOCK SHARMA" {
		t.Errorf("name: got %q", st.TaxpayerName)
	}

	// 3 TDS rows (2 for Nexus incl. the second transaction, 1 Global, 1 Alpha §197) + 1 TCS.
	var tds, tcs int
	for _, e := range st.Entries {
		switch e.Kind {
		case KindTDS:
			tds++
		case KindTCS:
			tcs++
		}
	}
	if tds != 4 {
		t.Errorf("TDS entries: got %d, want 4", tds)
	}
	if tcs != 1 {
		t.Errorf("TCS entries: got %d, want 1", tcs)
	}

	if got := st.TotalTDS(); got != 101000 {
		t.Errorf("total TDS: got %v, want 101000", got)
	}
	if got := st.TotalTCS(); got != 45000 {
		t.Errorf("total TCS: got %v, want 45000", got)
	}
	if got := st.TotalTaxCredit(); got != 146000 {
		t.Errorf("total credit (TDS+TCS): got %v, want 146000", got)
	}
}

func TestParse26AS_MultiRowAndSections(t *testing.T) {
	st := Parse26AS(readFixture(t, "form26as_ay2026_27.txt"))

	// The two Nexus 194J transactions must both bind to the same deductor + TAN.
	var nexus []LedgerEntry
	for _, e := range st.Entries {
		if e.TAN == "BLRN12345C" {
			nexus = append(nexus, e)
		}
	}
	if len(nexus) != 2 {
		t.Fatalf("Nexus rows: got %d, want 2", len(nexus))
	}
	for _, e := range nexus {
		if e.Section != "194J" {
			t.Errorf("Nexus section: got %q, want 194J", e.Section)
		}
		if e.Deductor != "NEXUS TECH SOLUTIONS PRIVATE LIMITED" {
			t.Errorf("Nexus deductor: got %q", e.Deductor)
		}
	}

	// §197 zero-TDS entry must be captured with its receipts (gross ≠ TDS rows).
	var has197 bool
	for _, e := range st.Entries {
		if e.Section == "197" {
			has197 = true
			if e.AmountPaid != 150000 {
				t.Errorf("§197 receipts: got %v, want 150000", e.AmountPaid)
			}
			if e.TaxAmount != 0 {
				t.Errorf("§197 tax: got %v, want 0", e.TaxAmount)
			}
		}
	}
	if !has197 {
		t.Error("§197 entry not captured")
	}

	// Receipts by section.
	r := st.ReceiptsBySection()
	if r["194J"] != 770000 {
		t.Errorf("194J receipts: got %v, want 770000", r["194J"])
	}
	if r["194C"] != 1200000 {
		t.Errorf("194C receipts: got %v, want 1200000", r["194C"])
	}
}

func TestParse26AS_TCS(t *testing.T) {
	st := Parse26AS(readFixture(t, "form26as_ay2026_27.txt"))
	for _, e := range st.Entries {
		if e.Kind == KindTCS {
			if e.Section != "206C-1F" {
				t.Errorf("TCS section: got %q, want 206C-1F", e.Section)
			}
			if e.TaxAmount != 45000 {
				t.Errorf("TCS tax: got %v, want 45000", e.TaxAmount)
			}
		}
	}
}

func TestParseAIS(t *testing.T) {
	st := ParseAIS(readFixture(t, "ais_ay2026_27.txt"))

	if st.PAN != "ABCDE1234F" {
		t.Errorf("PAN: got %q", st.PAN)
	}
	if st.AssessmentYear != "2026-27" {
		t.Errorf("AY: got %q", st.AssessmentYear)
	}

	// B1 consolidated TDS reconciles with 26AS totals (₹77k + ₹24k = ₹101k).
	if got := st.TotalTDS(); got != 101000 {
		t.Errorf("AIS B1 total TDS: got %v, want 101000", got)
	}

	// B2 SFT: 3 entries, including the immovable-property sale.
	if len(st.SFT) != 3 {
		t.Errorf("SFT entries: got %d, want 3", len(st.SFT))
	}
	if !st.HasCapitalGainsSignal() {
		t.Error("expected immovable-property sale (capital-gains signal) to be detected")
	}
}

func TestParse26AS_AmountsWithoutDecimals(t *testing.T) {
	// some extractors drop the trailing .00 — lakh-grouped integers must still parse
	text := "FORM 26AS\n" +
		"Assessment Year (AY):\n2026-27\n" +
		"PART A - Details of Tax Deducted at Source (TDS)\n" +
		"1   ACME LLP   BLRA12345C   4,50,000   45,000   45,000\n" +
		"    ↳ Section: 194J\n"
	st := Parse26AS(text)
	if len(st.Entries) != 1 {
		t.Fatalf("entries: got %d, want 1", len(st.Entries))
	}
	if st.Entries[0].AmountPaid != 450000 || st.Entries[0].TaxAmount != 45000 {
		t.Errorf("amounts: got paid=%v tax=%v", st.Entries[0].AmountPaid, st.Entries[0].TaxAmount)
	}
}

func TestParse26AS_GarbageYieldsNoEntries(t *testing.T) {
	for _, junk := range []string{"", "hello world", "invoice #42 total 1200", "%PDF-1.7 binary noise"} {
		if st := Parse26AS(junk); st.HasEntries() {
			t.Errorf("garbage %q produced entries: %+v", junk, st.Entries)
		}
	}
	var nilStatement *Statement
	if nilStatement.HasEntries() {
		t.Error("nil statement must report no entries")
	}
}

func TestCapitalGainsSignal_CoversSecuritiesToo(t *testing.T) {
	cases := []struct {
		detail string
		want   bool
	}{
		{"Sale of immovable property", true},
		{"Sale of securities and units of mutual fund", true},
		{"Off market debit transactions", true},
		{"Redemption of mutual fund units", true},
		{"Purchase of mutual funds", false},
		{"Outward Foreign Remittance", false},
		{"Interest from savings bank", false},
	}
	for _, tc := range cases {
		st := &Statement{SFT: []SFTEntry{{Code: "SFT-1", Detail: tc.detail}}}
		if got := st.HasCapitalGainsSignal(); got != tc.want {
			t.Errorf("%q: got %v, want %v", tc.detail, got, tc.want)
		}
	}
}

func TestAIS_ReconcilesWith26AS(t *testing.T) {
	a := Parse26AS(readFixture(t, "form26as_ay2026_27.txt"))
	b := ParseAIS(readFixture(t, "ais_ay2026_27.txt"))
	if a.TotalTDS() != b.TotalTDS() {
		t.Errorf("TDS mismatch between 26AS (%v) and AIS (%v)", a.TotalTDS(), b.TotalTDS())
	}
}
