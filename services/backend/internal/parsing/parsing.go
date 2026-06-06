package parsing

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

type Parser struct{}

func New() *Parser { return &Parser{} }

type TDSEntry struct {
	Deductor      string  `json:"deductor"`
	TAN           string  `json:"tan,omitempty"`
	Section       string  `json:"section"`
	Amount        float64 `json:"amount"`
	FinancialYear string  `json:"financialYear"`
}

type Parsed26AS struct {
	PAN              string     `json:"pan"`
	AssessmentYear   string     `json:"assessmentYear"`
	TaxpayerName     string     `json:"taxpayerName"`
	TDSEntries       []TDSEntry `json:"tdsEntries"`
	TotalTDSDeducted float64    `json:"totalTdsDeducted"`
}

func (p *Parser) Parse(raw []byte) (*Parsed26AS, error) {
	var out Parsed26AS
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.TotalTDSDeducted == 0 {
		for _, e := range out.TDSEntries {
			out.TotalTDSDeducted += e.Amount
		}
	}
	return &out, nil
}

func Handler(p *Parser) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("parsing: read body: %v", err)
			http.Error(w, "invalid request", 400)
			return
		}
		out, err := p.Parse(body)
		if err != nil {
			log.Printf("parsing: parse: %v", err)
			http.Error(w, "invalid request", 400)
			return
		}
		_ = json.NewEncoder(w).Encode(out)
	}
}
