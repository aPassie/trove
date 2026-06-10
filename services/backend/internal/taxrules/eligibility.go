// decides whether a taxpayer can use the presumptive itr-4 path
package taxrules

import "fmt"

type EligibilityInput struct {
	AY                 string
	GrossReceipts      float64
	TotalIncome        float64
	Resident           bool
	HasCapitalGains    bool
	HasOtherIncome     bool
	OtherIncomeSection string
	HouseProperties    int
	ForeignIncome      bool
	ForeignAssets      bool
	IsDirector         bool
	HasUnlistedShares  bool
}

func CheckEligibility(in EligibilityInput) (eligible bool, reason string) {
	p, ok := ForYear(in.AY)
	if !ok {
		return false, fmt.Sprintf("no tax parameters configured for assessment year %q", in.AY)
	}
	switch {
	case !in.Resident:
		return false, "non-residents cannot use ITR-4 — file ITR-3"
	case in.GrossReceipts > p.PresumptiveReceiptsLimit:
		return false, fmt.Sprintf("gross receipts ₹%.0f exceed the §44ADA presumptive ceiling ₹%.0f — file ITR-3", in.GrossReceipts, p.PresumptiveReceiptsLimit)
	case in.TotalIncome > 5000000:
		return false, "total income exceeds ₹50,00,000 — file ITR-3"
	case in.HasCapitalGains:
		return false, "capital gains income — file ITR-3"
	case in.HasOtherIncome:
		sec := in.OtherIncomeSection
		if sec == "" {
			sec = "non-professional"
		}
		return false, "income beyond professional fees (e.g. §" + sec + " contract/business income) — needs a fuller return (ITR-3/§44AD); we don't auto-draft this yet"
	case in.HouseProperties > 1:
		return false, "more than one house property — file ITR-3"
	case in.ForeignIncome || in.ForeignAssets:
		return false, "foreign income or assets — file ITR-3"
	case in.IsDirector:
		return false, "company directors cannot use ITR-4 — file ITR-3"
	case in.HasUnlistedShares:
		return false, "holding unlisted equity shares — file ITR-3"
	default:
		return true, ""
	}
}
