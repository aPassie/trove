package itr

import (
	"testing"

	"github.com/aPassie/trove/backend/internal/parsing"
)

func newInput() DraftInput {
	return DraftInput{
		PAN:            "ZZZZZ9999Z",
		AssessmentYear: "2025-26",
		TaxpayerName:   "Aakash Singh",
		TDSEntries: []parsing.TDSEntry{
			{Deductor: "Acme", Section: "194J", Amount: 12500, FinancialYear: "2024-25"},
			{Deductor: "Brightline", Section: "194J", Amount: 8400, FinancialYear: "2024-25"},
		},
		RefundEstimate: 20900,
	}
}

func TestDraft_PassesThroughFields(t *testing.T) {
	out := NewDrafter().Draft(newInput())
	if out.ITR1["PAN"] != "ZZZZZ9999Z" {
		t.Errorf("PAN: got %v", out.ITR1["PAN"])
	}
	if out.ITR1["AssessmentYear"] != "2025-26" {
		t.Errorf("AY: got %v", out.ITR1["AssessmentYear"])
	}
	if out.ITR1["TaxpayerName"] != "Aakash Singh" {
		t.Errorf("name: got %v", out.ITR1["TaxpayerName"])
	}
}

func TestDraft_RefundAmount(t *testing.T) {
	out := NewDrafter().Draft(newInput())
	if out.RefundAmount != 20900 {
		t.Errorf("refund: got %v", out.RefundAmount)
	}
	if out.ITR1["RefundClaimed"] != 20900.0 {
		t.Errorf("refundClaimed in itr1: got %v", out.ITR1["RefundClaimed"])
	}
}

func TestDraft_SchemaForYear(t *testing.T) {
	out := NewDrafter().Draft(newInput())
	if out.Schema != "ITR-1-AY2025-26" {
		t.Errorf("schema: got %q", out.Schema)
	}
}

func TestDraft_PreservesEntries(t *testing.T) {
	out := NewDrafter().Draft(newInput())
	entries, ok := out.ITR1["TDSEntries"].([]parsing.TDSEntry)
	if !ok {
		t.Fatalf("entries type: %T", out.ITR1["TDSEntries"])
	}
	if len(entries) != 2 {
		t.Errorf("entries: got %d", len(entries))
	}
}
