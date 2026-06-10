package compute

import (
	"testing"

	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

// Golden suite for the presumptive-tax engine.
//
// VERIFY(ca): the expected values below are derived from the PLACEHOLDER
// parameters in taxrules/params.go. They prove the machinery wires correctly
// (presumptive → dual-regime → rebate → cess → TDS credit → refund). When the
// CA-verified parameters land, re-confirm these expected numbers — the test
// structure does not change, only the constants.

func tds(amounts ...float64) []parsing.TDSEntry {
	out := make([]parsing.TDSEntry, len(amounts))
	for i, a := range amounts {
		out[i] = parsing.TDSEntry{Deductor: "X", Section: "194J", Amount: a, FinancialYear: "2024-25"}
	}
	return out
}

func TestGolden(t *testing.T) {
	cases := []struct {
		name          string
		profile       TaxpayerProfile
		wantForm      string
		wantEligible  bool
		wantRegime    string
		wantLiability float64
		wantRefund    float64
		wantPayable   float64
	}{
		{
			name: "low-income freelancer fully refunded under new regime",
			profile: TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "Aakash",
				AgeBand: taxrules.AgeBelow60, GrossReceipts: 1200000,
				TDSEntries: tds(51000),
			},
			wantForm: "ITR-4", wantEligible: true, wantRegime: "new",
			wantLiability: 0, wantRefund: 51000,
		},
		{
			name: "mid-income freelancer, new regime beats old, partial refund",
			profile: TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "Rohan",
				AgeBand: taxrules.AgeBelow60, GrossReceipts: 3000000,
				Deductions: Deductions{Sec80C: 150000},
				TDSEntries: tds(200000),
			},
			wantForm: "ITR-4", wantEligible: true, wantRegime: "new",
			wantLiability: 145600, wantRefund: 54400,
		},
		{
			name: "pinned old regime changes the chosen liability",
			profile: TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "Aakash",
				AgeBand: taxrules.AgeBelow60, GrossReceipts: 1200000,
				Regime:     taxrules.RegimeOld,
				TDSEntries: tds(51000),
			},
			wantForm: "ITR-4", wantEligible: true, wantRegime: "old",
			wantLiability: 33800, wantRefund: 17200,
		},
		{
			name: "receipts above presumptive ceiling → not ITR-4 eligible",
			profile: TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "Meera",
				AgeBand: taxrules.AgeBelow60, GrossReceipts: 8000000,
				TDSEntries: tds(300000),
			},
			wantForm:     "not-eligible:gross receipts ₹8000000 exceed the §44ADA presumptive ceiling ₹7500000 — file ITR-3",
			wantEligible: false,
		},
		{
			name: "unknown assessment year is surfaced, not computed",
			profile: TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "1999-00", GrossReceipts: 1000000,
			},
			wantForm:     "not-eligible:no tax parameters configured for assessment year \"1999-00\"",
			wantEligible: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Compute(tc.profile)
			if got.ITRForm != tc.wantForm {
				t.Errorf("ITRForm: got %q, want %q", got.ITRForm, tc.wantForm)
			}
			if got.Eligible != tc.wantEligible {
				t.Errorf("Eligible: got %v, want %v", got.Eligible, tc.wantEligible)
			}
			if !tc.wantEligible {
				return
			}
			if got.ChosenRegime != tc.wantRegime {
				t.Errorf("ChosenRegime: got %q, want %q", got.ChosenRegime, tc.wantRegime)
			}
			if got.TotalLiability != tc.wantLiability {
				t.Errorf("TotalLiability: got %v, want %v", got.TotalLiability, tc.wantLiability)
			}
			if got.Refund != tc.wantRefund {
				t.Errorf("Refund: got %v, want %v", got.Refund, tc.wantRefund)
			}
			if got.Payable != tc.wantPayable {
				t.Errorf("Payable: got %v, want %v", got.Payable, tc.wantPayable)
			}
		})
	}
}

// Locks the real Finance Act 2025 / AY 2026-27 new-regime numbers.
func TestGolden_AY2026_27_NewRegime(t *testing.T) {
	cases := []struct {
		name          string
		grossReceipts float64
		tds           float64
		wantPresump   float64
		wantLiability float64
		wantRefund    float64
		wantPayable   float64
	}{
		{
			// ₹24L receipts → ₹12L presumptive → zero tax (₹60k rebate) → full refund.
			name: "freelancer billing 24L pays zero tax", grossReceipts: 2400000, tds: 90000,
			wantPresump: 1200000, wantLiability: 0, wantRefund: 90000,
		},
		{
			// ₹30L receipts → ₹15L presumptive → base 105000, no rebate, +4% cess.
			name: "15L taxable income", grossReceipts: 3000000, tds: 50000,
			wantPresump: 1500000, wantLiability: 109200, wantRefund: 0, wantPayable: 59200,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := Compute(TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", AgeBand: taxrules.AgeBelow60,
				GrossReceipts: tc.grossReceipts, TDSEntries: tds(tc.tds),
			})
			if r.ChosenRegime != "new" {
				t.Errorf("regime: got %s, want new", r.ChosenRegime)
			}
			if r.PresumptiveIncome != tc.wantPresump {
				t.Errorf("presumptive: got %v, want %v", r.PresumptiveIncome, tc.wantPresump)
			}
			if r.TotalLiability != tc.wantLiability {
				t.Errorf("liability: got %v, want %v", r.TotalLiability, tc.wantLiability)
			}
			if r.Refund != tc.wantRefund {
				t.Errorf("refund: got %v, want %v", r.Refund, tc.wantRefund)
			}
			if r.Payable != tc.wantPayable {
				t.Errorf("payable: got %v, want %v", r.Payable, tc.wantPayable)
			}
		})
	}
}

// Boundary and hostile-input edge cases.
func TestGolden_EdgeCases(t *testing.T) {
	base := func(ay string, receipts float64, tdsAmt float64) TaxpayerProfile {
		return TaxpayerProfile{
			PAN: "ZZZZZ9999Z", AssessmentYear: ay, AgeBand: taxrules.AgeBelow60,
			GrossReceipts: receipts, TDSEntries: tds(tdsAmt),
		}
	}

	t.Run("marginal relief just above the 12L rebate cutoff (AY 2026-27)", func(t *testing.T) {
		// receipts 24.2L → presumptive 12,10,000; slab tax 61,500 but relief caps
		// tax at the 10,000 excess (+4% cess) = 10,400.
		r := Compute(base("2026-27", 2420000, 50000))
		if r.TotalLiability != 10400 {
			t.Errorf("liability: got %v, want 10400 (marginal relief)", r.TotalLiability)
		}
		if r.Refund != 39600 {
			t.Errorf("refund: got %v, want 39600", r.Refund)
		}
	})

	t.Run("marginal relief just above the 7L cutoff (AY 2025-26)", func(t *testing.T) {
		// presumptive 7,10,000 → slab tax 21,000, relief caps at 10,000 + cess.
		r := Compute(base("2025-26", 1420000, 0))
		if r.TotalLiability != 10400 {
			t.Errorf("liability: got %v, want 10400", r.TotalLiability)
		}
	})

	t.Run("no relief past the crossover point", func(t *testing.T) {
		// presumptive 13,00,000 → excess 1,00,000 > slab tax 75,000 → plain slabs.
		r := Compute(base("2026-27", 2600000, 0))
		if r.TotalLiability != 78000 { // 75,000 + 4% cess
			t.Errorf("liability: got %v, want 78000", r.TotalLiability)
		}
	})

	t.Run("receipts exactly at the 75L ceiling stay eligible", func(t *testing.T) {
		r := Compute(base("2026-27", 7500000, 0))
		if !r.Eligible || r.ITRForm != "ITR-4" {
			t.Errorf("expected eligible at exactly ₹75L, got %+v", r.ITRForm)
		}
	})

	t.Run("one rupee over the ceiling bounces", func(t *testing.T) {
		r := Compute(base("2026-27", 7500001, 0))
		if r.Eligible {
			t.Error("expected ineligible just above ₹75L")
		}
	})

	t.Run("senior old-regime exemption", func(t *testing.T) {
		p := base("2025-26", 1200000, 0) // presumptive 6L
		p.Regime = taxrules.RegimeOld
		p.AgeBand = taxrules.Age60to80
		r := Compute(p)
		if r.TotalLiability != 31200 { // 3-5L@5% + 5-6L@20% = 30,000 + cess
			t.Errorf("senior liability: got %v, want 31200", r.TotalLiability)
		}
	})

	t.Run("negative inputs are clamped, never inflate a refund", func(t *testing.T) {
		p := base("2026-27", -500000, -1000)
		p.Deductions = Deductions{Sec80C: -200000}
		p.AdvanceTaxPaid = -5000
		p.TCSCredit = -3000
		r := Compute(p)
		if r.Refund != 0 || r.Payable != 0 || r.TotalLiability != 0 {
			t.Errorf("hostile input leaked into the math: %+v", r)
		}
	})

	t.Run("zero receipts with TDS still refunds the credit", func(t *testing.T) {
		r := Compute(base("2026-27", 0, 5000))
		if !r.Eligible || r.Refund != 5000 {
			t.Errorf("got eligible=%v refund=%v, want refund 5000", r.Eligible, r.Refund)
		}
	})

	t.Run("deductions are capped at statutory limits", func(t *testing.T) {
		// ₹10L typed into 80C must count as the legal ₹1.5L, not slash the tax
		p := base("2026-27", 3000000, 0) // presumptive 15L, old regime relevant
		p.Regime = taxrules.RegimeOld
		p.Deductions = Deductions{Sec80C: 1000000, Sec80D: 500000}
		r := Compute(p)
		// old taxable = 15L - (1.5L + 1L) = 12.5L → 12,500 + 1,00,000 + 75,000 = 1,87,500 + cess
		if r.TaxableIncomeOld != 1250000 {
			t.Errorf("old taxable: got %v, want 1250000 (caps applied)", r.TaxableIncomeOld)
		}
		if r.TotalLiability != 195000 {
			t.Errorf("liability: got %v, want 195000", r.TotalLiability)
		}
	})

	t.Run("declared profit above the deemed 50% is honoured", func(t *testing.T) {
		p := base("2026-27", 1000000, 0)
		p.DeclaredProfit = 800000
		r := Compute(p)
		if r.PresumptiveIncome != 800000 {
			t.Errorf("presumptive: got %v, want 800000", r.PresumptiveIncome)
		}
	})
}

// Sanity: a payable case (no TDS, modest income under old regime pin).
func TestGolden_Payable(t *testing.T) {
	got := Compute(TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "NoTDS",
		AgeBand: taxrules.AgeBelow60, GrossReceipts: 1200000, Regime: taxrules.RegimeOld,
	})
	if got.Payable != 33800 {
		t.Errorf("Payable: got %v, want 33800", got.Payable)
	}
	if got.Refund != 0 {
		t.Errorf("Refund: got %v, want 0", got.Refund)
	}
}
