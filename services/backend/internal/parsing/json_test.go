package parsing

import (
	"os"
	"testing"
)

func TestParseJSON_AIS(t *testing.T) {
	raw, err := os.ReadFile("testdata/ais_ay2026_27.json")
	if err != nil {
		t.Fatal(err)
	}
	st := ParseJSON(string(raw))

	if st.PAN != "ABCDE1234F" {
		t.Errorf("PAN: got %q", st.PAN)
	}
	if st.AssessmentYear != "2026-27" || st.FinancialYear != "2025-26" {
		t.Errorf("years: AY=%q FY=%q", st.AssessmentYear, st.FinancialYear)
	}
	// 194J 77000 + 194C 24000 = 101000 — extracted regardless of nesting.
	if got := st.TotalTDS(); got != 101000 {
		t.Errorf("total TDS: got %v, want 101000", got)
	}
	if len(st.SFT) != 2 {
		t.Errorf("SFT entries: got %d, want 2", len(st.SFT))
	}
	if !st.HasCapitalGainsSignal() {
		t.Error("expected immovable-property-sale (capital-gains) signal")
	}
	// Section classification: 194J professional, 194C present.
	r := st.ReceiptsBySection()
	if r["194J"] != 770000 || r["194C"] != 1200000 {
		t.Errorf("receipts by section: %+v", r)
	}
}

func TestParseAny_Routing(t *testing.T) {
	json26 := `{"PartA":{"pan":"ABCDE1234F","assessmentYear":"2026-27"},"rows":[{"section":"194J","amountReceived":500000,"taxDeducted":50000}]}`
	if st := ParseAny(json26); st.TotalTDS() != 50000 {
		t.Errorf("JSON route: got %v", st.TotalTDS())
	}
	text26 := readFixture(t, "form26as_ay2026_27.txt")
	if st := ParseAny(text26); st.PAN != "ABCDE1234F" || len(st.Entries) == 0 {
		t.Errorf("26AS text route failed: %+v", st)
	}
}
