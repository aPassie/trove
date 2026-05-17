// agent — analyses a parsed form 26as and records the action to the audit log

package agent

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aPassie/trove/backend/internal/audit"
	"github.com/aPassie/trove/backend/internal/parsing"
)

type Agent struct {
	auditor *audit.Auditor
}

func New(auditor *audit.Auditor) *Agent {
	return &Agent{auditor: auditor}
}

type AnalyseOutput struct {
	PAN            string             `json:"pan"`
	AssessmentYear string             `json:"assessmentYear"`
	TaxpayerName   string             `json:"taxpayerName"`
	TDSEntries     []parsing.TDSEntry `json:"tdsEntries"`
	RefundEstimate float64            `json:"refundEstimate"`
	Summary        string             `json:"summary"`
}

func (a *Agent) Analyse(in parsing.Parsed26AS) *AnalyseOutput {
	out := &AnalyseOutput{
		PAN:            in.PAN,
		AssessmentYear: in.AssessmentYear,
		TaxpayerName:   in.TaxpayerName,
		TDSEntries:     in.TDSEntries,
		RefundEstimate: in.TotalTDSDeducted,
		Summary:        fmt.Sprintf("found ₹%.0f across %d tds entries", in.TotalTDSDeducted, len(in.TDSEntries)),
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

func Handler(a *Agent) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in parsing.Parsed26AS
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		_ = json.NewEncoder(w).Encode(a.Analyse(in))
	}
}
