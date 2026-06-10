// unit tests for the band math itself — slab edges, relief, surcharge selection
package taxrules

import (
	"math"
	"testing"
)

func TestBandedTax_Boundaries(t *testing.T) {
	p, _ := ForYear("2026-27")
	cases := []struct {
		income float64
		want   float64
	}{
		{0, 0},
		{399999, 0},
		{400000, 0},          // exactly at the exemption
		{400001, 0.05},       // first rupee above
		{800000, 20000},      // top of the 5% band
		{1200000, 60000},     // 20k + 40k
		{1600000, 120000},    // + 60k
		{2000000, 200000},    // + 80k
		{2400000, 300000},    // + 100k
		{2400001, 300000.30}, // first rupee at 30%
	}
	for _, tc := range cases {
		got := bandedTax(p.NewExemption, p.NewBands, tc.income)
		if math.Abs(got-tc.want) > 0.001 {
			t.Errorf("bandedTax(%v): got %v, want %v", tc.income, got, tc.want)
		}
	}
}

func TestBandedTax_OldRegimeSeniorEdges(t *testing.T) {
	p, _ := ForYear("2025-26")
	if got := bandedTax(p.OldExemption[Age60to80], p.OldBands, 300000); got != 0 {
		t.Errorf("senior at exemption: got %v, want 0", got)
	}
	if got := bandedTax(p.OldExemption[AgeAbove80], p.OldBands, 500000); got != 0 {
		t.Errorf("super senior at exemption: got %v, want 0", got)
	}
	// super senior skips the 5% band entirely: 5L exemption straight into 20%
	if got := bandedTax(p.OldExemption[AgeAbove80], p.OldBands, 600000); got != 20000 {
		t.Errorf("super senior 6L: got %v, want 20000", got)
	}
}

func TestComputeNew_ReliefExactlyAtCutoffAndCrossover(t *testing.T) {
	p, _ := ForYear("2026-27")
	if c := p.ComputeNew(1200000, 1200000); c.Total != 0 {
		t.Errorf("exactly 12L must be zero tax, got %v", c.Total)
	}
	// relief crossover: base = excess at 12,70,588.24; just below relief applies
	if c := p.ComputeNew(1270000, 1270000); c.Total != round2(70000*1.04) {
		t.Errorf("just under crossover: got %v, want %v", c.Total, round2(70000*1.04))
	}
	// past crossover plain slabs win: 13L → 75,000 + cess
	if c := p.ComputeNew(1300000, 1300000); c.Total != 78000 {
		t.Errorf("past crossover: got %v, want 78000", c.Total)
	}
}

func TestSurcharge_BandSelection(t *testing.T) {
	p, _ := ForYear("2025-26")
	cases := []struct {
		totalIncome float64
		rate        float64
	}{
		{4999999, 0}, {5000000, 0}, {5000001, 0.10},
		{10000001, 0.15}, {20000001, 0.25}, {50000001, 0.37},
	}
	for _, tc := range cases {
		if got := p.surcharge(tc.totalIncome, 100); got != round2(100*tc.rate) {
			t.Errorf("surcharge at %v: got %v, want %v", tc.totalIncome, got, 100*tc.rate)
		}
	}
}
