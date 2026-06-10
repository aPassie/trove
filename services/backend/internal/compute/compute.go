// the deterministic tax engine — profile in, refund out
package compute

import (
	"fmt"
	"math"

	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

type Deductions struct {
	Sec80C   float64 `json:"sec80C"`
	Sec80D   float64 `json:"sec80D"`
	Sec80CCD float64 `json:"sec80CCD"`
	Other    float64 `json:"other"`
}

func (d Deductions) total() float64 { return d.Sec80C + d.Sec80D + d.Sec80CCD + d.Other }

type TaxpayerProfile struct {
	PAN            string             `json:"pan"`
	AssessmentYear string             `json:"assessmentYear"`
	Name           string             `json:"taxpayerName"`
	AgeBand        taxrules.AgeBand   `json:"ageBand"`
	Regime         taxrules.Regime    `json:"regime"`
	GrossReceipts  float64            `json:"grossReceipts"`
	DeclaredProfit float64            `json:"declaredProfit"`
	OtherIncome    float64            `json:"otherIncome"`
	Deductions     Deductions         `json:"deductions"`
	TDSEntries     []parsing.TDSEntry `json:"tdsEntries"`
	TCSEntries     []parsing.TDSEntry `json:"tcsEntries,omitempty"`
	TCSCredit      float64            `json:"tcsCredit"`
	AdvanceTaxPaid float64            `json:"advanceTaxPaid"`
	Personal       PersonalDetails    `json:"personal"`

	Resident           *bool  `json:"resident,omitempty"`
	HasCapitalGains    bool   `json:"hasCapitalGains"`
	HasOtherIncome     bool   `json:"hasOtherIncome"`
	OtherIncomeSection string `json:"otherIncomeSection"`
	HouseProperties    int    `json:"houseProperties"`
	ForeignIncome      bool   `json:"foreignIncome"`
	ForeignAssets      bool   `json:"foreignAssets"`
	IsDirector         bool   `json:"isDirector"`
	HasUnlistedShares  bool   `json:"hasUnlistedShares"`
}

type LineItem struct {
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
}

type TaxResult struct {
	ITRForm           string     `json:"itrForm"`
	Eligible          bool       `json:"eligible"`
	PresumptiveIncome float64    `json:"presumptiveIncome"`
	GrossTotalIncome  float64    `json:"grossTotalIncome"`
	TaxableIncomeOld  float64    `json:"taxableIncomeOld"`
	TaxableIncomeNew  float64    `json:"taxableIncomeNew"`
	TaxOldRegime      float64    `json:"taxOldRegime"`
	TaxNewRegime      float64    `json:"taxNewRegime"`
	ChosenRegime      string     `json:"chosenRegime"`
	Rebate87A         float64    `json:"rebate87A"`
	Surcharge         float64    `json:"surcharge"`
	Cess              float64    `json:"cess"`
	TotalLiability    float64    `json:"totalLiability"`
	TDSCredit         float64    `json:"tdsCredit"`
	TCSCredit         float64    `json:"tcsCredit"`
	AdvanceTaxPaid    float64    `json:"advanceTaxPaid"`
	Refund            float64    `json:"refund"`
	Payable           float64    `json:"payable"`
	LineItems         []LineItem `json:"lineItems"`
}

func Compute(p TaxpayerProfile) TaxResult {
	params, ok := taxrules.ForYear(p.AssessmentYear)
	if !ok {
		return TaxResult{
			ITRForm: fmt.Sprintf("not-eligible:no tax parameters configured for assessment year %q", p.AssessmentYear),
		}
	}

	// negative inputs must never inflate a refund; deductions are capped at their statutory limits
	p.GrossReceipts = clamp0(p.GrossReceipts)
	p.DeclaredProfit = clamp0(p.DeclaredProfit)
	p.OtherIncome = clamp0(p.OtherIncome)
	p.TCSCredit = clamp0(p.TCSCredit)
	p.AdvanceTaxPaid = clamp0(p.AdvanceTaxPaid)
	p.Deductions = Deductions{
		Sec80C:   math.Min(clamp0(p.Deductions.Sec80C), params.Cap80C),
		Sec80D:   math.Min(clamp0(p.Deductions.Sec80D), params.Cap80D),
		Sec80CCD: math.Min(clamp0(p.Deductions.Sec80CCD), params.Cap80CCD1B),
		Other:    clamp0(p.Deductions.Other),
	}

	presumptive := p.GrossReceipts * params.PresumptiveRate
	if p.DeclaredProfit > presumptive {
		presumptive = p.DeclaredProfit
	}

	gti := presumptive + p.OtherIncome

	resident := true
	if p.Resident != nil {
		resident = *p.Resident
	}
	eligible, reason := taxrules.CheckEligibility(taxrules.EligibilityInput{
		AY:                 p.AssessmentYear,
		GrossReceipts:      p.GrossReceipts,
		TotalIncome:        gti,
		Resident:           resident,
		HasCapitalGains:    p.HasCapitalGains,
		HasOtherIncome:     p.HasOtherIncome,
		OtherIncomeSection: p.OtherIncomeSection,
		HouseProperties:    p.HouseProperties,
		ForeignIncome:      p.ForeignIncome,
		ForeignAssets:      p.ForeignAssets,
		IsDirector:         p.IsDirector,
		HasUnlistedShares:  p.HasUnlistedShares,
	})
	if !eligible {
		return TaxResult{
			ITRForm:           "not-eligible:" + reason,
			Eligible:          false,
			PresumptiveIncome: round2(presumptive),
			GrossTotalIncome:  round2(gti),
		}
	}

	deductions := p.Deductions.total()
	if deductions > gti {
		deductions = gti
	}
	taxableOld := gti - deductions
	taxableNew := gti

	oldComp := params.ComputeOld(taxableOld, gti, p.AgeBand)
	newComp := params.ComputeNew(taxableNew, gti)

	chosen, comp := chooseRegime(p.Regime, oldComp, newComp)

	tdsCredit := 0.0
	for _, e := range p.TDSEntries {
		tdsCredit += clamp0(e.Amount)
	}
	totalPaid := tdsCredit + p.TCSCredit + p.AdvanceTaxPaid
	refund, payable := 0.0, 0.0
	if totalPaid >= comp.Total {
		refund = totalPaid - comp.Total
	} else {
		payable = comp.Total - totalPaid
	}

	res := TaxResult{
		ITRForm:           "ITR-4",
		Eligible:          true,
		PresumptiveIncome: round2(presumptive),
		GrossTotalIncome:  round2(gti),
		TaxableIncomeOld:  round2(taxableOld),
		TaxableIncomeNew:  round2(taxableNew),
		TaxOldRegime:      oldComp.Total,
		TaxNewRegime:      newComp.Total,
		ChosenRegime:      chosen,
		Rebate87A:         comp.Rebate,
		Surcharge:         comp.Surcharge,
		Cess:              comp.Cess,
		TotalLiability:    comp.Total,
		TDSCredit:         round2(tdsCredit),
		TCSCredit:         round2(p.TCSCredit),
		AdvanceTaxPaid:    round2(p.AdvanceTaxPaid),
		Refund:            round2(refund),
		Payable:           round2(payable),
	}
	res.LineItems = buildLineItems(p, res, comp)
	return res
}

func chooseRegime(pref taxrules.Regime, old, new taxrules.RegimeComputation) (string, taxrules.RegimeComputation) {
	switch pref {
	case taxrules.RegimeOld:
		return "old", old
	case taxrules.RegimeNew:
		return "new", new
	default:
		if new.Total <= old.Total {
			return "new", new
		}
		return "old", old
	}
}

func buildLineItems(p TaxpayerProfile, r TaxResult, comp taxrules.RegimeComputation) []LineItem {
	items := []LineItem{
		{Label: "Gross professional receipts", Amount: round2(p.GrossReceipts)},
		{Label: "Presumptive income (§44ADA)", Amount: r.PresumptiveIncome},
		{Label: "Other income", Amount: round2(p.OtherIncome)},
		{Label: "Gross total income", Amount: r.GrossTotalIncome},
	}
	if r.ChosenRegime == "old" {
		items = append(items, LineItem{Label: "Chapter VI-A deductions", Amount: round2(p.Deductions.total())})
	}
	items = append(items,
		LineItem{Label: "Base tax (" + r.ChosenRegime + " regime)", Amount: comp.BaseTax},
		LineItem{Label: "§87A rebate", Amount: -comp.Rebate},
		LineItem{Label: "Surcharge", Amount: comp.Surcharge},
		LineItem{Label: "Health & education cess", Amount: comp.Cess},
		LineItem{Label: "Total tax liability", Amount: r.TotalLiability},
		LineItem{Label: "TDS credit", Amount: -r.TDSCredit},
	)
	if r.TCSCredit > 0 {
		items = append(items, LineItem{Label: "TCS credit", Amount: -r.TCSCredit})
	}
	items = append(items,
		LineItem{Label: "Advance/self-assessment tax", Amount: -r.AdvanceTaxPaid},
	)
	if r.Refund > 0 {
		items = append(items, LineItem{Label: "Refund due", Amount: r.Refund})
	} else {
		items = append(items, LineItem{Label: "Tax payable", Amount: r.Payable})
	}
	return items
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func clamp0(v float64) float64 {
	if v < 0 || math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return v
}
