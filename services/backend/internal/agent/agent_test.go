package agent

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/aPassie/trove/backend/internal/parsing"
)

type stubLLM struct {
	response string
	err      error
	prompts  []string
}

func (s *stubLLM) Generate(ctx context.Context, prompt string) (string, error) {
	s.prompts = append(s.prompts, prompt)
	return s.response, s.err
}

func sample() parsing.Parsed26AS {
	return parsing.Parsed26AS{
		PAN:              "ZZZZZ9999Z",
		AssessmentYear:   "2025-26",
		TaxpayerName:     "Aakash Singh",
		TDSEntries:       []parsing.TDSEntry{{Amount: 100}, {Amount: 200}},
		TotalTDSDeducted: 300,
	}
}

func TestAnalyse_NilLLM_UsesFallback(t *testing.T) {
	a := New(nil, nil)
	out := a.Analyse(context.Background(), sample())
	if !strings.Contains(out.Summary, "300") {
		t.Errorf("fallback should mention amount: %q", out.Summary)
	}
	if !strings.Contains(out.Summary, "2 entries") {
		t.Errorf("fallback should mention count: %q", out.Summary)
	}
}

func TestAnalyse_LLMSuccess(t *testing.T) {
	llm := &stubLLM{response: "you are owed roughly ₹300"}
	a := New(nil, llm)
	out := a.Analyse(context.Background(), sample())
	if out.Summary != "you are owed roughly ₹300" {
		t.Errorf("llm response not used: %q", out.Summary)
	}
	if len(llm.prompts) != 1 {
		t.Errorf("expected 1 prompt, got %d", len(llm.prompts))
	}
}

func TestAnalyse_LLMError_FallsBack(t *testing.T) {
	llm := &stubLLM{err: errors.New("rate limited")}
	a := New(nil, llm)
	out := a.Analyse(context.Background(), sample())
	if !strings.Contains(out.Summary, "300") {
		t.Errorf("should fall back on llm error: %q", out.Summary)
	}
}

func TestAnalyse_PassesThroughFields(t *testing.T) {
	a := New(nil, nil)
	out := a.Analyse(context.Background(), sample())
	if out.PAN != "ZZZZZ9999Z" || out.AssessmentYear != "2025-26" || out.TaxpayerName != "Aakash Singh" {
		t.Errorf("fields lost: %+v", out)
	}
	if out.RefundEstimate != 300 {
		t.Errorf("refund: got %v", out.RefundEstimate)
	}
}

func TestAnalyse_NoAuditor_DoesNotPanic(t *testing.T) {
	a := New(nil, nil)
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("panicked with nil auditor: %v", r)
		}
	}()
	a.Analyse(context.Background(), sample())
}
