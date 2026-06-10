package taxrules

import (
	"strings"
	"testing"
)

func TestCheckEligibility(t *testing.T) {
	base := EligibilityInput{AY: "2025-26", GrossReceipts: 1200000, TotalIncome: 600000, Resident: true}

	cases := []struct {
		name      string
		mutate    func(*EligibilityInput)
		wantOK    bool
		reasonHas string
	}{
		{"simple freelancer is eligible", func(*EligibilityInput) {}, true, ""},
		{"unknown AY", func(in *EligibilityInput) { in.AY = "1999-00" }, false, "no tax parameters"},
		{"non-resident", func(in *EligibilityInput) { in.Resident = false }, false, "non-resident"},
		{"over receipts ceiling", func(in *EligibilityInput) { in.GrossReceipts = 8000000 }, false, "presumptive ceiling"},
		{"over total income cap", func(in *EligibilityInput) { in.TotalIncome = 6000000 }, false, "₹50,00,000"},
		{"capital gains", func(in *EligibilityInput) { in.HasCapitalGains = true }, false, "capital gains"},
		{"multiple house properties", func(in *EligibilityInput) { in.HouseProperties = 2 }, false, "house property"},
		{"foreign assets", func(in *EligibilityInput) { in.ForeignAssets = true }, false, "foreign"},
		{"director", func(in *EligibilityInput) { in.IsDirector = true }, false, "director"},
		{"unlisted shares", func(in *EligibilityInput) { in.HasUnlistedShares = true }, false, "unlisted"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := base
			tc.mutate(&in)
			ok, reason := CheckEligibility(in)
			if ok != tc.wantOK {
				t.Errorf("eligible: got %v, want %v (reason %q)", ok, tc.wantOK, reason)
			}
			if tc.reasonHas != "" && !strings.Contains(reason, tc.reasonHas) {
				t.Errorf("reason %q does not contain %q", reason, tc.reasonHas)
			}
		})
	}
}

func TestCheckEligibility_TotalIncomeCapBoundary(t *testing.T) {
	in := EligibilityInput{AY: "2026-27", GrossReceipts: 7000000, Resident: true}
	in.TotalIncome = 5000000
	if ok, reason := CheckEligibility(in); !ok {
		t.Errorf("exactly ₹50L must stay eligible: %s", reason)
	}
	in.TotalIncome = 5000001
	if ok, _ := CheckEligibility(in); ok {
		t.Error("one rupee over ₹50L must bounce")
	}
}

func TestForYearAndSupported(t *testing.T) {
	if _, ok := ForYear("2025-26"); !ok {
		t.Fatal("expected 2025-26 params")
	}
	if _, ok := ForYear("nope"); ok {
		t.Fatal("did not expect params for unknown year")
	}
	if len(SupportedYears()) == 0 {
		t.Fatal("expected at least one supported year")
	}
}
