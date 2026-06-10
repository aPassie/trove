// tests the actual downloaded artifact, not just the in-memory map
package itr

import (
	"encoding/json"
	"math"
	"testing"
)

// the browser serialises draft.itr4 to a file and the user uploads that file —
// so the marshaled bytes themselves must validate, and every rupee must be whole
func TestArtifact_MarshaledFileStillValidates(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	raw, err := json.Marshal(out.ITR4)
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	if errs := validate("2026-27", doc); len(errs) != 0 {
		t.Errorf("marshaled artifact fails the official schema: %v", errs)
	}
}

func TestArtifact_AllAmountsAreWholeRupees(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	raw, _ := json.Marshal(out.ITR4)
	var doc any
	_ = json.Unmarshal(raw, &doc)

	var walk func(path string, v any)
	walk = func(path string, v any) {
		switch x := v.(type) {
		case float64:
			if x != math.Trunc(x) {
				t.Errorf("%s carries paise: %v", path, x)
			}
		case map[string]any:
			for k, c := range x {
				walk(path+"/"+k, c)
			}
		case []any:
			for i, c := range x {
				walk(path+"/"+string(rune('0'+i)), c)
			}
		}
	}
	walk("", doc)
}

// if someone swaps the embedded schema for a different year or form, fail loudly
func TestSchemaDriftGuard(t *testing.T) {
	var schema struct {
		Definitions map[string]struct {
			Required []string `json:"required"`
		} `json:"definitions"`
	}
	if err := json.Unmarshal(officialITR4Schema, &schema); err != nil {
		t.Fatal(err)
	}
	itr4, ok := schema.Definitions["ITR4"]
	if !ok {
		t.Fatal("embedded schema has no ITR4 definition — wrong file?")
	}
	want := []string{"CreationInfo", "Form_ITR4", "PersonalInfo", "FilingStatus", "IncomeDeductions", "TaxComputation", "TaxPaid", "Refund", "Verification"}
	got := map[string]bool{}
	for _, r := range itr4.Required {
		got[r] = true
	}
	for _, w := range want {
		if !got[w] {
			t.Errorf("schema no longer requires %q — builder assumptions are stale", w)
		}
	}
	if len(itr4.Required) != len(want) {
		t.Errorf("schema now requires %d blocks (we build %d) — review buildITR4", len(itr4.Required), len(want))
	}
}
