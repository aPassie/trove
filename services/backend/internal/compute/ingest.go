// turns parsed statements + a questionnaire into a taxpayer profile
package compute

import (
	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

type Questionnaire struct {
	AgeBand        taxrules.AgeBand `json:"ageBand"`
	Regime         taxrules.Regime  `json:"regime"`
	Deductions     Deductions       `json:"deductions"`
	AdvanceTaxPaid float64          `json:"advanceTaxPaid"`
	DeclaredProfit float64          `json:"declaredProfit"`
	Personal       PersonalDetails  `json:"personal"`
}

var professionalSections = map[string]bool{
	"194J":  true,
	"194JA": true,
	"194JB": true,
}

func emptyStatement() *parsing.Statement { return &parsing.Statement{} }

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func BuildProfile(form26AS *parsing.Statement, ais *parsing.Statement, q Questionnaire) TaxpayerProfile {
	if form26AS == nil {
		form26AS = emptyStatement()
	}
	aisOrEmpty := ais
	if aisOrEmpty == nil {
		aisOrEmpty = emptyStatement()
	}

	ledger := form26AS
	if len(ledger.Entries) == 0 && len(aisOrEmpty.Entries) > 0 {
		ledger = aisOrEmpty
	}

	p := TaxpayerProfile{
		PAN:            firstNonEmpty(form26AS.PAN, aisOrEmpty.PAN),
		AssessmentYear: firstNonEmpty(form26AS.AssessmentYear, aisOrEmpty.AssessmentYear),
		Name:           firstNonEmpty(form26AS.TaxpayerName, aisOrEmpty.TaxpayerName),
		AgeBand:        q.AgeBand,
		Regime:         q.Regime,
		Deductions:     q.Deductions,
		AdvanceTaxPaid: q.AdvanceTaxPaid,
		DeclaredProfit: q.DeclaredProfit,
		Personal:       q.Personal,
	}
	fy := firstNonEmpty(form26AS.FinancialYear, aisOrEmpty.FinancialYear)

	var maxOther float64
	for _, e := range ledger.Entries {
		switch e.Kind {
		case parsing.KindTDS:
			p.TDSEntries = append(p.TDSEntries, parsing.TDSEntry{
				Deductor:      e.Deductor,
				TAN:           e.TAN,
				Section:       e.Section,
				Amount:        e.TaxAmount,
				AmountPaid:    e.AmountPaid,
				FinancialYear: fy,
			})
			if e.AmountPaid > 0 {
				if professionalSections[e.Section] {
					p.GrossReceipts += e.AmountPaid
				} else {
					p.HasOtherIncome = true
					if e.AmountPaid > maxOther {
						maxOther = e.AmountPaid
						p.OtherIncomeSection = e.Section
					}
				}
			}
		case parsing.KindTCS:
			p.TCSEntries = append(p.TCSEntries, parsing.TDSEntry{
				Deductor:      e.Deductor,
				TAN:           e.TAN,
				Section:       e.Section,
				Amount:        e.TaxAmount,
				AmountPaid:    e.AmountPaid,
				FinancialYear: fy,
			})
			p.TCSCredit += e.TaxAmount
		}
	}

	if form26AS.HasCapitalGainsSignal() || aisOrEmpty.HasCapitalGainsSignal() {
		p.HasCapitalGains = true
	}

	return p
}
