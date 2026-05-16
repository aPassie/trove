// itr — drafts an itr-1 return from an analysed 26as

package itr

import (
	"encoding/json"
	"net/http"

	"github.com/aPassie/trove/backend/internal/parsing"
)

type Drafter struct{}

func NewDrafter() *Drafter { return &Drafter{} }

type DraftInput struct {
	PAN            string             `json:"pan"`
	AssessmentYear string             `json:"assessmentYear"`
	TaxpayerName   string             `json:"taxpayerName"`
	TDSEntries     []parsing.TDSEntry `json:"tdsEntries"`
	RefundEstimate float64            `json:"refundEstimate"`
}

type DraftOutput struct {
	Schema       string         `json:"schema"`
	ITR1         map[string]any `json:"itr1"`
	RefundAmount float64        `json:"refundAmount"`
}

func (d *Drafter) Draft(in DraftInput) *DraftOutput {
	gross := in.RefundEstimate * 10
	return &DraftOutput{
		Schema:       "ITR-1-AY" + in.AssessmentYear,
		RefundAmount: in.RefundEstimate,
		ITR1: map[string]any{
			"PAN":            in.PAN,
			"AssessmentYear": in.AssessmentYear,
			"TaxpayerName":   in.TaxpayerName,
			"TDSEntries":     in.TDSEntries,
			"IncomeSummary": map[string]any{
				"OtherSources":     gross,
				"GrossTotalIncome": gross,
			},
			"TaxableIncome":     gross,
			"TotalTaxLiability": 0.0,
			"RefundClaimed":     in.RefundEstimate,
		},
	}
}

func Handler(d *Drafter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in DraftInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		_ = json.NewEncoder(w).Encode(d.Draft(in))
	}
}
