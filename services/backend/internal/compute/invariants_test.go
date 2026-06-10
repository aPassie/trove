// property-style tests: money invariants that must hold for every input
package compute

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

func TestInvariants_Grid(t *testing.T) {
	ays := []string{"2025-26", "2026-27"}
	receipts := []float64{0, 1, 999, 100001, 384999.5, 700000, 1200000, 1399999, 2400001, 2420010, 3333333, 4999999, 7499999, 7500000}
	regimes := []taxrules.Regime{taxrules.RegimeAuto, taxrules.RegimeOld, taxrules.RegimeNew}
	ages := []taxrules.AgeBand{taxrules.AgeBelow60, taxrules.Age60to80, taxrules.AgeAbove80}
	deductions := []Deductions{{}, {Sec80C: 150000, Sec80D: 25000}}
	credits := []struct{ tds, tcs, adv float64 }{{0, 0, 0}, {50000, 0, 0}, {90000, 45000, 20000}}

	cases := 0
	for _, ay := range ays {
		for _, rc := range receipts {
			for _, reg := range regimes {
				for _, age := range ages {
					for _, ded := range deductions {
						for _, cr := range credits {
							p := TaxpayerProfile{
								PAN: "ZZZZZ9999Z", AssessmentYear: ay, AgeBand: age, Regime: reg,
								GrossReceipts: rc, Deductions: ded,
								TDSEntries: tds(cr.tds), TCSCredit: cr.tcs, AdvanceTaxPaid: cr.adv,
							}
							r := Compute(p)
							cases++

							if r.Refund < 0 || r.Payable < 0 || r.TotalLiability < 0 {
								t.Fatalf("negative money: %+v (input %+v)", r, p)
							}
							if r.Refund > 0 && r.Payable > 0 {
								t.Fatalf("refund and payable both set: %+v", r)
							}
							if !r.Eligible {
								continue
							}
							paid := cr.tds + cr.tcs + cr.adv
							if r.Refund > paid+0.01 {
								t.Fatalf("refund %v exceeds taxes paid %v", r.Refund, paid)
							}
							if diff := (r.TotalLiability + r.Refund - r.Payable) - paid; diff > 0.01 || diff < -0.01 {
								t.Fatalf("liability+refund-payable=%v must equal paid=%v", r.TotalLiability+r.Refund-r.Payable, paid)
							}
							if reg == taxrules.RegimeAuto {
								min := r.TaxNewRegime
								if r.TaxOldRegime < min {
									min = r.TaxOldRegime
								}
								if r.TotalLiability != min {
									t.Fatalf("auto regime did not pick the lower tax: %+v", r)
								}
							}
							if n := len(r.LineItems); n > 0 {
								last := r.LineItems[n-1]
								want := r.Refund
								if r.Payable > 0 {
									want = r.Payable
								}
								if last.Amount != want {
									t.Fatalf("last line item %v should equal outcome %v", last.Amount, want)
								}
							}
						}
					}
				}
			}
		}
	}
	if cases < 1500 {
		t.Fatalf("grid too small: %d", cases)
	}
}

func TestInvariants_LiabilityMonotonicInIncome(t *testing.T) {
	// more income must never mean less tax, including across the marginal-relief window
	for _, ay := range []string{"2025-26", "2026-27"} {
		prev := -1.0
		for rc := 0.0; rc <= 4000000; rc += 7331 {
			r := Compute(TaxpayerProfile{
				PAN: "ZZZZZ9999Z", AssessmentYear: ay, AgeBand: taxrules.AgeBelow60,
				Regime: taxrules.RegimeNew, GrossReceipts: rc,
			})
			if r.TotalLiability < prev {
				t.Fatalf("ay %s: liability dropped from %v to %v at receipts %v", ay, prev, r.TotalLiability, rc)
			}
			prev = r.TotalLiability
		}
	}
}

func TestInvariants_Deterministic(t *testing.T) {
	p := TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", AgeBand: taxrules.AgeBelow60,
		GrossReceipts: 2420010, Deductions: Deductions{Sec80C: 99999.5},
		TDSEntries: tds(33333.33), TCSCredit: 1.5, AdvanceTaxPaid: 7,
	}
	if !reflect.DeepEqual(Compute(p), Compute(p)) {
		t.Fatal("Compute is not deterministic")
	}
}

func TestInvariants_AutoPicksOldWhenCheaper(t *testing.T) {
	// uncapped "other" deductions can make the old regime win — auto must follow
	p := TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", AgeBand: taxrules.AgeBelow60,
		GrossReceipts: 3200000, Deductions: Deductions{Other: 800000},
	}
	r := Compute(p)
	if r.TaxOldRegime >= r.TaxNewRegime {
		t.Skipf("fixture no longer makes old cheaper (old %v, new %v)", r.TaxOldRegime, r.TaxNewRegime)
	}
	if r.ChosenRegime != "old" || r.TotalLiability != r.TaxOldRegime {
		t.Fatalf("auto should have picked old: %+v", r)
	}
}

// the wasm boundary is stringly-typed json — these pin the ui contract
func TestContract_QuestionnaireJSON(t *testing.T) {
	uiPayload := `{"ageBand":"senior","regime":"old","deductions":{"sec80C":150000,"sec80D":25000},"advanceTaxPaid":20000}`
	var q Questionnaire
	if err := json.Unmarshal([]byte(uiPayload), &q); err != nil {
		t.Fatal(err)
	}
	if q.AgeBand != taxrules.Age60to80 || q.Regime != taxrules.RegimeOld {
		t.Errorf("ageBand/regime did not bind: %+v", q)
	}
	if q.Deductions.Sec80C != 150000 || q.Deductions.Sec80D != 25000 || q.AdvanceTaxPaid != 20000 {
		t.Errorf("numbers did not bind: %+v", q)
	}
}

func TestContract_TaxResultJSONKeys(t *testing.T) {
	r := Compute(TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", AgeBand: taxrules.AgeBelow60,
		GrossReceipts: 1200000, TDSEntries: tds(51000),
	})
	b, err := json.Marshal(r)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	// keys web/lib/engine.ts depends on — renaming a json tag must fail here
	for _, k := range []string{
		"itrForm", "eligible", "presumptiveIncome", "grossTotalIncome", "chosenRegime",
		"taxOldRegime", "taxNewRegime", "totalLiability", "tdsCredit", "tcsCredit",
		"refund", "payable", "lineItems",
	} {
		if _, ok := m[k]; !ok {
			t.Errorf("TaxResult json is missing %q (ui contract)", k)
		}
	}
	items := m["lineItems"].([]any)
	first := items[0].(map[string]any)
	if _, ok := first["label"]; !ok {
		t.Error("lineItems entries must carry \"label\"")
	}
	if _, ok := first["amount"]; !ok {
		t.Error("lineItems entries must carry \"amount\"")
	}
}

func TestContract_ProfileAcceptsStatementEntries(t *testing.T) {
	// BuildProfile output marshals and re-binds through json like the wasm boundary does
	st := &parsing.Statement{
		Source: "26AS", PAN: "ABCDE1234F", AssessmentYear: "2026-27", FinancialYear: "2025-26",
		Entries: []parsing.LedgerEntry{{Deductor: "X", TAN: "BLRA12345C", Section: "194J", AmountPaid: 1000000, TaxAmount: 100000, Kind: parsing.KindTDS}},
	}
	p := BuildProfile(st, nil, Questionnaire{AgeBand: taxrules.AgeBelow60})
	b, _ := json.Marshal(p)
	var back TaxpayerProfile
	if err := json.Unmarshal(b, &back); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(Compute(p), Compute(back)) {
		t.Fatal("profile does not survive a json round-trip")
	}
}
