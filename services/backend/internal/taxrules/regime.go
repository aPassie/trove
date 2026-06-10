// old vs new regime tax math
package taxrules

import "math"

type RegimeComputation struct {
	BaseTax   float64
	Rebate    float64
	Surcharge float64
	Cess      float64
	Total     float64
}

func bandedTax(exemption float64, bands []Band, income float64) float64 {
	if income <= exemption {
		return 0
	}
	lower := exemption
	var tax float64
	for _, b := range bands {
		if income <= lower {
			break
		}
		upper := math.Min(income, b.UpTo)
		if upper > lower {
			tax += (upper - lower) * b.Rate
		}
		lower = b.UpTo
	}
	return tax
}

func (p YearParams) surcharge(totalIncome, tax float64) float64 {
	rate := 0.0
	for _, b := range p.SurchargeBands {
		if totalIncome > b.Threshold {
			rate = b.Rate
		}
	}
	return tax * rate
}

func (p YearParams) ComputeOld(taxableIncome, totalIncome float64, age AgeBand) RegimeComputation {
	exemption, ok := p.OldExemption[age]
	if !ok {
		exemption = p.OldExemption[AgeBelow60]
	}
	base := bandedTax(exemption, p.OldBands, taxableIncome)
	rebate := 0.0
	if taxableIncome <= p.OldRebate87ALimit {
		rebate = math.Min(base, p.OldRebate87AMax)
	}
	afterRebate := base - rebate
	sur := p.surcharge(totalIncome, afterRebate)
	cess := (afterRebate + sur) * p.CessRate
	return RegimeComputation{
		BaseTax:   round2(base),
		Rebate:    round2(rebate),
		Surcharge: round2(sur),
		Cess:      round2(cess),
		Total:     round2(afterRebate + sur + cess),
	}
}

func (p YearParams) ComputeNew(taxableIncome, totalIncome float64) RegimeComputation {
	base := bandedTax(p.NewExemption, p.NewBands, taxableIncome)
	rebate := 0.0
	if taxableIncome <= p.NewRebate87ALimit {
		rebate = math.Min(base, p.NewRebate87AMax)
	} else if excess := taxableIncome - p.NewRebate87ALimit; base > excess {
		// marginal relief: tax just above the rebate cutoff can't exceed the income above it
		rebate = base - excess
	}
	afterRebate := base - rebate
	sur := p.surcharge(totalIncome, afterRebate)
	cess := (afterRebate + sur) * p.CessRate
	return RegimeComputation{
		BaseTax:   round2(base),
		Rebate:    round2(rebate),
		Surcharge: round2(sur),
		Cess:      round2(cess),
		Total:     round2(afterRebate + sur + cess),
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
