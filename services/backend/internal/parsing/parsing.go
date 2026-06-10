// the tds entry type shared with the engine
package parsing

type TDSEntry struct {
	Deductor      string  `json:"deductor"`
	TAN           string  `json:"tan,omitempty"`
	Section       string  `json:"section"`
	Amount        float64 `json:"amount"`
	AmountPaid    float64 `json:"amountPaid,omitempty"`
	FinancialYear string  `json:"financialYear"`
}
