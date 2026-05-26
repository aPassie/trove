package redact

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRedact_RealPAN(t *testing.T) {
	out, err := New().Redact(map[string]any{"pan": "ABCDE1234F"})
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(out)
	if !strings.Contains(string(raw), "REDACTED_PAN") {
		t.Errorf("pan not redacted: %s", raw)
	}
	if strings.Contains(string(raw), "ABCDE1234F") {
		t.Errorf("original pan leaked: %s", raw)
	}
}

func TestRedact_Aadhaar(t *testing.T) {
	out, err := New().Redact(map[string]any{"aadhaar": "123456789012"})
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(out)
	if !strings.Contains(string(raw), "REDACTED_AADHAAR") {
		t.Errorf("aadhaar not redacted: %s", raw)
	}
	if strings.Contains(string(raw), "123456789012") {
		t.Errorf("original aadhaar leaked: %s", raw)
	}
}

func TestRedact_NestedPayload(t *testing.T) {
	payload := map[string]any{
		"actor":  "agent",
		"target": "ABCDE1234F",
		"meta":   map[string]any{"taxpayer": "ABCDE1234F"},
	}
	out, err := New().Redact(payload)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(out)
	if strings.Contains(string(raw), "ABCDE1234F") {
		t.Errorf("nested pan leaked: %s", raw)
	}
}

func TestRedact_NoPII_Unchanged(t *testing.T) {
	payload := map[string]any{"summary": "₹27,000 refundable", "count": 3}
	out, err := New().Redact(payload)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(out)
	if strings.Contains(string(raw), "REDACTED") {
		t.Errorf("nothing should be redacted: %s", raw)
	}
}
