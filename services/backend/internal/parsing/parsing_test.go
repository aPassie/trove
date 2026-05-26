package parsing

import (
	"strings"
	"testing"
)

func TestParse_FullFixture(t *testing.T) {
	raw := []byte(`{
		"pan": "ZZZZZ9999Z",
		"assessmentYear": "2025-26",
		"taxpayerName": "Aakash Singh",
		"tdsEntries": [
			{"deductor": "Acme", "section": "194J", "amount": 12500, "financialYear": "2024-25"},
			{"deductor": "Brightline", "section": "194J", "amount": 8400, "financialYear": "2024-25"}
		],
		"totalTdsDeducted": 20900
	}`)
	p := New()
	out, err := p.Parse(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if out.PAN != "ZZZZZ9999Z" {
		t.Errorf("PAN: got %q", out.PAN)
	}
	if out.TotalTDSDeducted != 20900 {
		t.Errorf("total: got %v", out.TotalTDSDeducted)
	}
	if len(out.TDSEntries) != 2 {
		t.Errorf("entries: got %d", len(out.TDSEntries))
	}
}

func TestParse_ComputesTotalWhenMissing(t *testing.T) {
	raw := []byte(`{
		"pan": "ZZZZZ9999Z",
		"assessmentYear": "2025-26",
		"taxpayerName": "Aakash",
		"tdsEntries": [
			{"deductor": "A", "section": "194J", "amount": 100, "financialYear": "2024-25"},
			{"deductor": "B", "section": "194C", "amount": 250, "financialYear": "2024-25"}
		]
	}`)
	out, err := New().Parse(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if out.TotalTDSDeducted != 350 {
		t.Errorf("expected 350 (computed), got %v", out.TotalTDSDeducted)
	}
}

func TestParse_PrefersExplicitTotal(t *testing.T) {
	raw := []byte(`{
		"pan": "ZZZZZ9999Z",
		"tdsEntries": [{"deductor": "X", "section": "194J", "amount": 100, "financialYear": "2024-25"}],
		"totalTdsDeducted": 999
	}`)
	out, err := New().Parse(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if out.TotalTDSDeducted != 999 {
		t.Errorf("expected explicit 999, got %v", out.TotalTDSDeducted)
	}
}

func TestParse_MalformedJSON(t *testing.T) {
	_, err := New().Parse([]byte(`{not json`))
	if err == nil {
		t.Fatal("expected parse error")
	}
}

func TestParse_EmptyEntries(t *testing.T) {
	raw := []byte(`{"pan": "ZZZZZ9999Z", "tdsEntries": []}`)
	out, err := New().Parse(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if out.TotalTDSDeducted != 0 {
		t.Errorf("expected 0, got %v", out.TotalTDSDeducted)
	}
	if !strings.Contains(out.PAN, "ZZZZZ") {
		t.Errorf("PAN lost: %q", out.PAN)
	}
}
