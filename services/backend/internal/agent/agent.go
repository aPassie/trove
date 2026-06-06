package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/aPassie/trove/backend/internal/audit"
	"github.com/aPassie/trove/backend/internal/parsing"
)

type LLM interface {
	Generate(ctx context.Context, prompt string) (string, error)
}

type Agent struct {
	auditor *audit.Auditor
	llm     LLM
}

func New(auditor *audit.Auditor, llm LLM) *Agent {
	return &Agent{auditor: auditor, llm: llm}
}

type AnalyseOutput struct {
	PAN            string             `json:"pan"`
	AssessmentYear string             `json:"assessmentYear"`
	TaxpayerName   string             `json:"taxpayerName"`
	TDSEntries     []parsing.TDSEntry `json:"tdsEntries"`
	RefundEstimate float64            `json:"refundEstimate"`
	Summary        string             `json:"summary"`
}

func (a *Agent) Analyse(ctx context.Context, in parsing.Parsed26AS) *AnalyseOutput {
	out := &AnalyseOutput{
		PAN:            in.PAN,
		AssessmentYear: in.AssessmentYear,
		TaxpayerName:   in.TaxpayerName,
		TDSEntries:     in.TDSEntries,
		RefundEstimate: in.TotalTDSDeducted,
		Summary:        a.summarize(ctx, in),
	}
	if a.auditor != nil {
		_ = a.auditor.Record(audit.Entry{
			Actor:     "agent",
			Action:    "analyse",
			Target:    in.PAN,
			Payload:   out,
			Timestamp: time.Now(),
		})
	}
	return out
}

func (a *Agent) summarize(ctx context.Context, in parsing.Parsed26AS) string {
	fallback := fmt.Sprintf("₹%.0f withheld as tds across %d entries — likely fully refundable", in.TotalTDSDeducted, len(in.TDSEntries))
	if a.llm == nil {
		return fallback
	}
	prompt := fmt.Sprintf(
		"In one calm sentence, summarise this indian freelancer's tax situation for assessment year %s. They have ₹%.0f of tds withheld across %d deductors. Do not invent numbers. Write in lowercase.",
		in.AssessmentYear, in.TotalTDSDeducted, len(in.TDSEntries),
	)
	llmCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	out, err := a.llm.Generate(llmCtx, prompt)
	if err != nil {
		log.Printf("agent: gemini fallback: %v", err)
		return fallback
	}
	return out
}

func Handler(a *Agent) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in parsing.Parsed26AS
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			log.Printf("agent: decode: %v", err)
			http.Error(w, "invalid request", 400)
			return
		}
		_ = json.NewEncoder(w).Encode(a.Analyse(r.Context(), in))
	}
}
