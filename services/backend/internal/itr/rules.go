// portal business rules from the cbdt itr-4 validation rules pdf, checked on every draft
package itr

import (
	"fmt"
	"regexp"
)

// CheckRules runs the Category-A validation rules (the ones the e-filing portal
// enforces at submission, beyond the JSON schema) that apply to a §44ADA-only
// return. It inspects the built document itself — the exact bytes the user
// files — so a passing draft is consistent by construction.
// Rule numbers reference "CBDT e-Filing ITR-4 Validation Rules AY 2026-27 v1.0".
func CheckRules(chosenRegime string, doc map[string]any) []string {
	var out []string
	bad := func(rule, msg string) { out = append(out, fmt.Sprintf("rule %s: %s", rule, msg)) }

	itr, _ := doc["ITR"].(map[string]any)
	itr4, _ := itr["ITR4"].(map[string]any)
	if itr4 == nil {
		return []string{"rule -: document is not an ITR4 envelope"}
	}

	num := func(path ...string) int {
		cur := any(itr4)
		for _, k := range path {
			m, ok := cur.(map[string]any)
			if !ok {
				return 0
			}
			cur = m[k]
		}
		switch v := cur.(type) {
		case int:
			return v
		case int64:
			return int(v)
		case float64:
			return int(v)
		}
		return 0
	}
	str := func(path ...string) string {
		cur := any(itr4)
		for _, k := range path {
			m, ok := cur.(map[string]any)
			if !ok {
				return ""
			}
			cur = m[k]
		}
		s, _ := cur.(string)
		return s
	}

	businessInc := num("IncomeDeductions", "IncomeFromBusinessProf")
	presumptive := num("ScheduleBP", "PersumptiveInc44ADA", "TotPersumptiveInc44ADA")
	receipts := num("ScheduleBP", "PersumptiveInc44ADA", "GrsReceipt")
	gti := num("IncomeDeductions", "GrossTotIncome")
	viaTotal := num("IncomeDeductions", "DeductUndChapVIA", "TotalChapVIADeductions")
	totalIncome := num("IncomeDeductions", "TotalIncome")

	// A1/A2 — business income in Part B must match Schedule BP
	if businessInc != presumptive {
		bad("A1/A2", fmt.Sprintf("business income %d does not match Schedule BP presumptive income %d", businessInc, presumptive))
	}
	// A140 — ITR-4 without presumptive income is the wrong form
	if presumptive <= 0 {
		bad("A140", "no presumptive income disclosed — ITR-4 requires income u/s 44AD/44ADA/44AE")
	}
	// A13 — presumptive income cannot exceed gross receipts
	if presumptive > receipts {
		bad("A13", fmt.Sprintf("presumptive income %d exceeds gross receipts %d", presumptive, receipts))
	}
	// A14 — §44ADA deemed income must be at least 50%% of receipts
	if presumptive*2 < receipts {
		bad("A14", fmt.Sprintf("presumptive income %d is below 50%% of gross receipts %d", presumptive, receipts))
	}
	// A16/A17 — declared 44ADA income needs a business code
	bp, _ := itr4["ScheduleBP"].(map[string]any)
	if nat, ok := bp["NatOfBus44ADA"].([]map[string]any); !ok || len(nat) == 0 || nat[0]["CodeADA"] == "" {
		bad("A16", "44ADA income declared without a business code in Schedule BP")
	}
	// A238 — receipts above ₹50L are only allowed when ≥95%% of receipts are digital
	if receipts > 5000000 {
		bad("A238", fmt.Sprintf("gross receipts %d exceed ₹50L — allowed only if cash receipts are under 5%%; confirm before filing or use ITR-3", receipts))
	}
	// A267 — ITR-4 caps total income at ₹50L
	if totalIncome > 5000000 {
		bad("A267", fmt.Sprintf("total income %d exceeds the ₹50L ITR-4 limit", totalIncome))
	}

	// A18 — Chapter VI-A total must equal its breakup
	incDed, _ := itr4["IncomeDeductions"].(map[string]any)
	if via, ok := incDed["DeductUndChapVIA"].(map[string]any); ok {
		sum := 0
		for k, v := range via {
			if k == "TotalChapVIADeductions" {
				continue
			}
			if n, ok := v.(int); ok {
				sum += n
			}
		}
		if sum != viaTotal {
			bad("A18", fmt.Sprintf("Chapter VI-A total %d does not match breakup sum %d", viaTotal, sum))
		}
	}
	// A19 — deductions cannot exceed gross total income
	if viaTotal > gti {
		bad("A19", fmt.Sprintf("Chapter VI-A deductions %d exceed gross total income %d", viaTotal, gti))
	}
	// A21 — old regime 80C+80CCC+80CCD(1) capped at ₹1.5L
	c80 := num("IncomeDeductions", "DeductUndChapVIA", "Section80C") +
		num("IncomeDeductions", "DeductUndChapVIA", "Section80CCC") +
		num("IncomeDeductions", "DeductUndChapVIA", "Section80CCDEmployeeOrSE")
	if c80 > 150000 {
		bad("A21", fmt.Sprintf("80C+80CCC+80CCD(1) claim %d exceeds ₹1,50,000", c80))
	}
	// A46 — total income = GTI − deductions
	want := gti - viaTotal
	if want < 0 {
		want = 0
	}
	if totalIncome != want {
		bad("A46", fmt.Sprintf("total income %d is not GTI %d minus deductions %d", totalIncome, gti, viaTotal))
	}

	taxOnIncome := num("TaxComputation", "TotalTaxPayable")
	rebate := num("TaxComputation", "Rebate87A")
	afterRebate := num("TaxComputation", "TaxPayableOnRebate")
	cess := num("TaxComputation", "EducationCess")
	gross := num("TaxComputation", "GrossTaxLiability")
	net := num("TaxComputation", "NetTaxLiability")
	withInterest := num("TaxComputation", "TotTaxPlusIntrstPay")
	interest := num("TaxComputation", "IntrstPay", "IntrstPayUs234A") +
		num("TaxComputation", "IntrstPay", "IntrstPayUs234B") +
		num("TaxComputation", "IntrstPay", "IntrstPayUs234C") +
		num("TaxComputation", "IntrstPay", "LateFilingFee234F")

	// A52 — tax after rebate = tax on total income − rebate
	if afterRebate != taxOnIncome-rebate {
		bad("A52", fmt.Sprintf("tax after rebate %d ≠ tax on income %d − rebate %d", afterRebate, taxOnIncome, rebate))
	}
	// A53 — gross liability = tax after rebate + cess
	if gross != afterRebate+cess {
		bad("A53", fmt.Sprintf("gross tax liability %d ≠ tax after rebate %d + cess %d", gross, afterRebate, cess))
	}
	// A54 — total tax+interest = net liability + interest & fees
	if withInterest != net+interest {
		bad("A54", fmt.Sprintf("total tax+interest %d ≠ net liability %d + interest %d", withInterest, net, interest))
	}
	// A124 — tax computed on zero gross total income
	if gross > 0 && gti <= 0 {
		bad("A124", "tax liability computed but gross total income is zero")
	}

	tds := num("TaxPaid", "TaxesPaid", "TDS")
	tcs := num("TaxPaid", "TaxesPaid", "TCS")
	adv := num("TaxPaid", "TaxesPaid", "AdvanceTax")
	selfAsmt := num("TaxPaid", "TaxesPaid", "SelfAssessmentTax")
	paid := num("TaxPaid", "TaxesPaid", "TotalTaxesPaid")
	balPayable := num("TaxPaid", "BalTaxPayable")
	refund := num("Refund", "RefundDue")

	// A127 — total taxes paid is the sum of its parts
	if paid != tds+tcs+adv+selfAsmt {
		bad("A127", fmt.Sprintf("total taxes paid %d ≠ TDS %d + TCS %d + advance %d + self-assessment %d", paid, tds, tcs, adv, selfAsmt))
	}
	// A128/A129 — refund and balance payable must mirror paid − liability
	if paid >= withInterest {
		if refund != paid-withInterest || balPayable != 0 {
			bad("A128", fmt.Sprintf("refund %d ≠ taxes paid %d − liability %d", refund, paid, withInterest))
		}
	} else if balPayable != withInterest-paid || refund != 0 {
		bad("A129", fmt.Sprintf("balance payable %d ≠ liability %d − taxes paid %d", balPayable, withInterest, paid))
	}

	// A131 — TDS claimed must equal the Schedule TDS2 rows
	schedTDS := num("TDSonOthThanSals", "TotalTDSonOthThanSals")
	if tds != schedTDS {
		bad("A131", fmt.Sprintf("TDS claimed (%d) exceeds the scheduled rows (%d) — usually a deductor missing a valid TAN in your statement; after importing, add that row in Schedule TDS on the portal (the TAN is on your Form 16A / 26AS) before submitting", tds, schedTDS))
	}
	tdsSched, _ := itr4["TDSonOthThanSals"].(map[string]any)
	if rows, ok := tdsSched["TDSonOthThanSalDtls"].([]map[string]any); ok {
		sum := 0
		for i, row := range rows {
			claimed, _ := row["TDSClaimed"].(int)
			deducted, _ := row["TDSDeducted"].(int)
			sum += claimed
			// A113 — cannot claim more than was deducted
			if claimed > deducted {
				bad("A113", fmt.Sprintf("TDS row %d claims %d but only %d was deducted", i+1, claimed, deducted))
			}
			// A116 — claim cannot exceed the income it was deducted against
			if grossAmt, ok := row["GrossAmount"].(int); ok && claimed > grossAmt {
				bad("A116", fmt.Sprintf("TDS row %d claims %d against income of only %d", i+1, claimed, grossAmt))
			}
			tan, _ := row["TANOfDeductor"].(string)
			if !reTAN.MatchString(tan) {
				bad("A-TAN", fmt.Sprintf("TDS row %d has malformed TAN %q", i+1, tan))
			}
			if sec, _ := row["TDSSection"].(string); sec == "" {
				bad("B6", fmt.Sprintf("TDS row %d has a section that cannot be reported on ITR-4", i+1))
			}
		}
		if sum != schedTDS {
			bad("A119", fmt.Sprintf("Schedule TDS total %d ≠ sum of rows %d", schedTDS, sum))
		}
	}
	// A132 — TCS claimed must equal the Schedule TCS rows
	schedTCS := num("ScheduleTCS", "TotalSchTCS")
	if tcs != schedTCS {
		bad("A132", fmt.Sprintf("TCS claimed %d does not match Schedule TCS total %d", tcs, schedTCS))
	}
	// A133 — advance tax needs challan rows in Schedule IT, which require
	// BSR code / date / serial number we never fabricate
	if adv > 0 {
		if _, ok := itr4["ScheduleIT"]; !ok {
			bad("A133", fmt.Sprintf("advance tax of %d claimed without challan details — after importing, add your challan (BSR code, date, serial no.) in Schedule IT on the portal before submitting", adv))
		}
	}

	// A51/A229 — old-regime rebate only below ₹5L income, capped at ₹12,500
	// A227 — new-regime rebate above ₹12L only as marginal relief
	if rebate > 0 {
		if chosenRegime == "old" {
			if totalIncome > 500000 {
				bad("A51", fmt.Sprintf("old-regime §87A rebate claimed with total income %d above ₹5,00,000", totalIncome))
			}
			if rebate > 12500 {
				bad("A229", fmt.Sprintf("old-regime §87A rebate %d exceeds ₹12,500", rebate))
			}
		} else if totalIncome > 1200000 {
			relief := taxOnIncome - (totalIncome - 1200000)
			if relief < 0 {
				relief = 0
			}
			if rebate > relief {
				bad("A227", fmt.Sprintf("§87A rebate %d above ₹12L income exceeds marginal relief %d", rebate, relief))
			}
		}
	}

	// A234 — due date is pinned by the portal
	if due := str("FilingStatus", "ItrFilingDueDate"); due != "2026-08-31" {
		bad("A234", fmt.Sprintf("filing due date %q is not the notified 2026-08-31", due))
	}
	// A259 — a valid mobile number is mandatory
	if mob := num("PersonalInfo", "Address", "MobileNo"); mob < 1000000000 || mob > 9999999999 {
		bad("A259", fmt.Sprintf("mobile number %d is not a valid 10-digit number", mob))
	}

	return out
}

var reTAN = regexp.MustCompile(`^[A-Z]{4}[0-9]{5}[A-Z]$`)
