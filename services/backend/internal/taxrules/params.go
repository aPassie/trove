// assessment-year tax slabs, rebates and presumptive limits — verify with a ca before real filing
package taxrules

import "math"

type Regime string

const (
	RegimeOld  Regime = "old"
	RegimeNew  Regime = "new"
	RegimeAuto Regime = ""
)

type AgeBand string

const (
	AgeBelow60 AgeBand = "below60"
	Age60to80  AgeBand = "senior"
	AgeAbove80 AgeBand = "super_senior"
)

type Band struct {
	UpTo float64
	Rate float64
}

type SurchargeBand struct {
	Threshold float64
	Rate      float64
}

type YearParams struct {
	PresumptiveRate          float64
	PresumptiveReceiptsLimit float64

	OldExemption      map[AgeBand]float64
	OldBands          []Band
	OldRebate87ALimit float64
	OldRebate87AMax   float64

	NewExemption         float64
	NewBands             []Band
	NewStandardDeduction float64
	NewRebate87ALimit    float64
	NewRebate87AMax      float64

	CessRate       float64
	SurchargeBands []SurchargeBand

	Cap80C     float64
	Cap80D     float64
	Cap80CCD1B float64
}

var params = map[string]YearParams{
	"2025-26": {
		PresumptiveRate:          0.50,
		PresumptiveReceiptsLimit: 7500000,

		OldExemption: map[AgeBand]float64{
			AgeBelow60: 250000,
			Age60to80:  300000,
			AgeAbove80: 500000,
		},
		OldBands: []Band{
			{UpTo: 500000, Rate: 0.05},
			{UpTo: 1000000, Rate: 0.20},
			{UpTo: math.Inf(1), Rate: 0.30},
		},
		OldRebate87ALimit: 500000,
		OldRebate87AMax:   12500,

		NewExemption: 300000,
		NewBands: []Band{
			{UpTo: 700000, Rate: 0.05},
			{UpTo: 1000000, Rate: 0.10},
			{UpTo: 1200000, Rate: 0.15},
			{UpTo: 1500000, Rate: 0.20},
			{UpTo: math.Inf(1), Rate: 0.30},
		},
		NewStandardDeduction: 75000,
		NewRebate87ALimit:    700000,
		NewRebate87AMax:      25000,

		CessRate: 0.04,
		SurchargeBands: []SurchargeBand{
			{Threshold: 5000000, Rate: 0.10},
			{Threshold: 10000000, Rate: 0.15},
			{Threshold: 20000000, Rate: 0.25},
			{Threshold: 50000000, Rate: 0.37},
		},

		Cap80C:     150000,
		Cap80D:     100000,
		Cap80CCD1B: 50000,
	},

	"2026-27": {
		PresumptiveRate:          0.50,
		PresumptiveReceiptsLimit: 7500000,

		OldExemption: map[AgeBand]float64{
			AgeBelow60: 250000,
			Age60to80:  300000,
			AgeAbove80: 500000,
		},
		OldBands: []Band{
			{UpTo: 500000, Rate: 0.05},
			{UpTo: 1000000, Rate: 0.20},
			{UpTo: math.Inf(1), Rate: 0.30},
		},
		OldRebate87ALimit: 500000,
		OldRebate87AMax:   12500,

		NewExemption: 400000,
		NewBands: []Band{
			{UpTo: 800000, Rate: 0.05},
			{UpTo: 1200000, Rate: 0.10},
			{UpTo: 1600000, Rate: 0.15},
			{UpTo: 2000000, Rate: 0.20},
			{UpTo: 2400000, Rate: 0.25},
			{UpTo: math.Inf(1), Rate: 0.30},
		},
		NewStandardDeduction: 75000,
		NewRebate87ALimit:    1200000,
		NewRebate87AMax:      60000,

		CessRate: 0.04,
		SurchargeBands: []SurchargeBand{
			{Threshold: 5000000, Rate: 0.10},
			{Threshold: 10000000, Rate: 0.15},
			{Threshold: 20000000, Rate: 0.25},
		},

		Cap80C:     150000,
		Cap80D:     100000,
		Cap80CCD1B: 50000,
	},
}

func ForYear(ay string) (YearParams, bool) {
	p, ok := params[ay]
	return p, ok
}

func SupportedYears() []string {
	out := make([]string, 0, len(params))
	for ay := range params {
		out = append(out, ay)
	}
	return out
}
