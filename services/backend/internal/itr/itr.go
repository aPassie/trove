// builds the official itr-4 json from a computed result
package itr

import (
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/aPassie/trove/backend/internal/compute"
)

type Drafter struct{}

func NewDrafter() *Drafter { return &Drafter{} }

type DraftInput struct {
	Profile compute.TaxpayerProfile `json:"profile"`
	Result  compute.TaxResult       `json:"result"`
}

type DraftOutput struct {
	Schema           string         `json:"schema"`
	ITR4             map[string]any `json:"itr4,omitempty"`
	RefundAmount     float64        `json:"refundAmount"`
	Eligible         bool           `json:"eligible"`
	Placeholders     bool           `json:"placeholders,omitempty"`
	Message          string         `json:"message,omitempty"`
	ValidationErrors []string       `json:"validationErrors,omitempty"`
	RuleViolations   []string       `json:"ruleViolations,omitempty"`
}

const draftableAY = "2026-27"

func (d *Drafter) Draft(in DraftInput) *DraftOutput {
	r := in.Result
	if !r.Eligible {
		return &DraftOutput{
			Schema:   r.ITRForm,
			Eligible: false,
			Message:  "cannot draft ITR-4 — " + stripPrefix(r.ITRForm),
		}
	}

	// the embedded official schema is AY-specific — never emit a filing json for another year
	if in.Profile.AssessmentYear != draftableAY {
		return &DraftOutput{
			Schema:       "ITR-4-AY" + in.Profile.AssessmentYear,
			RefundAmount: r.Refund,
			Eligible:     true,
			Message:      "the downloadable filing JSON is only available for AY " + draftableAY + " right now — your refund computation above still stands",
		}
	}

	var msgs []string
	if r.ChosenRegime == "old" {
		msgs = append(msgs, "you picked the old regime — the portal will ask about Form 10-IEA during filing; complete that step before submitting")
	}
	placeholders := !in.Profile.Personal.Complete()
	if placeholders {
		msgs = append(msgs, "this draft still contains placeholder personal and bank details — fill them in before filing or your refund will go to the wrong account")
	}

	itr4 := buildITR4(in.Profile, r)
	return &DraftOutput{
		Schema:           "ITR-4-AY" + in.Profile.AssessmentYear,
		ITR4:             itr4,
		RefundAmount:     r.Refund,
		Eligible:         true,
		Placeholders:     placeholders,
		Message:          strings.Join(msgs, " · "),
		ValidationErrors: validate(in.Profile.AssessmentYear, itr4),
		RuleViolations:   CheckRules(r.ChosenRegime, itr4),
	}
}

func ri(v float64) int { return int(math.Round(v)) }

func name75(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "NA"
	}
	if len(s) > 75 {
		return s[:75]
	}
	return s
}

func panOf(p string) string {
	p = strings.ToUpper(strings.TrimSpace(p))
	if p == "" {
		return "AAAAA1111A"
	}
	return p
}

func or(v, fallback string) string {
	if s := strings.TrimSpace(v); s != "" {
		return s
	}
	return fallback
}

func digits(s string, fallback int64) int64 {
	var n int64
	seen := false
	for _, c := range s {
		if c < '0' || c > '9' {
			return fallback
		}
		n = n*10 + int64(c-'0')
		seen = true
	}
	if !seen {
		return fallback
	}
	return n
}

func chapVIA(p compute.TaxpayerProfile, allow bool) (map[string]any, int) {
	c80C, c80D, c80CCD := 0, 0, 0
	if allow {
		c80C, c80D, c80CCD = ri(p.Deductions.Sec80C), ri(p.Deductions.Sec80D), ri(p.Deductions.Sec80CCD)
	}
	total := c80C + c80D + c80CCD
	return map[string]any{
		"Section80C": c80C, "Section80CCC": 0, "Section80CCDEmployeeOrSE": c80CCD,
		"Section80CCD1B": 0, "Section80CCDEmployer": 0, "Section80D": c80D,
		"Section80DD": 0, "Section80DDB": 0, "Section80E": 0, "Section80G": 0,
		"Section80GG": 0, "Section80GGC": 0, "Section80U": 0, "Section80TTA": 0,
		"Section80TTB": 0, "AnyOthSec80CCH": 0, "TotalChapVIADeductions": total,
	}, total
}

// personalInfo prefers the user's real details, falling back to schema-valid
// placeholders (flagged via DraftOutput.Placeholders) when a field is missing.
func personalInfo(p compute.TaxpayerProfile) map[string]any {
	pd := p.Personal
	dob := "1990-01-01"
	if _, err := time.Parse("2006-01-02", pd.DOB); err == nil {
		dob = pd.DOB
	}
	info := map[string]any{
		"AssesseeName": map[string]any{"SurNameOrOrgName": name75(p.Name)},
		"PAN":          panOf(p.PAN),
		"Address": map[string]any{
			"ResidenceNo":          name75(or(pd.Flat, "NA")),
			"LocalityOrArea":       name75(or(pd.Locality, "NA")),
			"CityOrTownOrDistrict": name75(or(pd.City, "NA")),
			"StateCode":            or(pd.StateCode, "29"),
			"CountryCode":          "91",
			"PinCode":              int(digits(pd.PinCode, 560001)),
			"CountryCodeMobile":    91,
			"MobileNo":             digits(pd.Mobile, 9999999999),
			"EmailAddress":         or(pd.Email, "noreply@trove.example"),
		},
		"SecondaryAdd":     "N",
		"DOB":              dob,
		"EmployerCategory": "PE",
		"Status":           "I",
	}
	if len(pd.Aadhaar) == 12 {
		info["AadhaarCardNo"] = pd.Aadhaar
	}
	return info
}

func buildITR4(p compute.TaxpayerProfile, r compute.TaxResult) map[string]any {
	pd := p.Personal
	ay4 := p.AssessmentYear
	if len(ay4) >= 4 {
		ay4 = ay4[:4]
	}
	oldRegime := r.ChosenRegime == "old"

	// every total derives from already-rounded ints so the portal's cross-field
	// checks (gti = business + other, refund = paid - liability) can't drift by a rupee
	presumptiveInt := ri(r.PresumptiveIncome)
	otherInt := ri(p.OtherIncome)
	gtiInt := presumptiveInt + otherInt
	via, viaTotal := chapVIA(p, oldRegime)
	totalIncomeInt := gtiInt
	if oldRegime {
		totalIncomeInt = gtiInt - viaTotal
		if totalIncomeInt < 0 {
			totalIncomeInt = 0
		}
	}
	// totals derive from per-row rounded ints so they equal the schedule sums exactly
	tdsRows, tdsInt := tdsSchedule(p)
	tcsRows, tcsInt := tcsSchedule(p)
	if tdsRows == nil {
		tdsInt = ri(r.TDSCredit)
	}
	if tcsRows == nil {
		tcsInt = ri(r.TCSCredit)
	}
	advInt := ri(p.AdvanceTaxPaid)
	paidInt := tdsInt + tcsInt + advInt
	liabInt := ri(r.TotalLiability)
	cessInt, surInt, rebateInt := ri(r.Cess), ri(r.Surcharge), ri(r.Rebate87A)
	refundInt, balInt := 0, 0
	if paidInt >= liabInt {
		refundInt = paidInt - liabInt
	} else {
		balInt = liabInt - paidInt
	}

	itr4 := map[string]any{
		"CreationInfo": map[string]any{
			"SWVersionNo": "1.0", "SWCreatedBy": "SW10000000", "JSONCreatedBy": "SW10000000",
			"JSONCreationDate": time.Now().Format("2006-01-02"), "IntermediaryCity": "Bengaluru", "Digest": "-",
		},
		"Form_ITR4": map[string]any{
			"FormName": "ITR-4", "Description": "Presumptive income u/s 44AD, 44ADA, 44AE",
			"AssessmentYear": ay4, "SchemaVer": "Ver1.0", "FormVer": "Ver1.0",
		},
		"PersonalInfo": personalInfo(p),
		"FilingStatus": map[string]any{
			"ReturnFileSec": 11, "Form10IEAEarlierAYOldRegime": "N",
			"AsseseeRepFlg": "N", "ItrFilingDueDate": "2026-08-31",
		},
		"IncomeDeductions": map[string]any{
			"IncomeFromBusinessProf": presumptiveInt,
			"GrossSalary":            0, "NetSalary": 0, "DeductionUs16": 0, "IncomeFromSal": 0,
			"IncomeOthSrc":              otherInt,
			"TotalIncomeChargeableUnHP": 0,
			"GrossTotIncome":            gtiInt,
			"GrossTotIncomeIncLTCG112A": gtiInt,
			"UsrDeductUndChapVIA":       via,
			"DeductUndChapVIA":          via,
			"TotalIncome":               totalIncomeInt,
		},
		"TaxComputation": map[string]any{
			"TotalTaxPayable":    liabInt - cessInt - surInt + rebateInt,
			"Rebate87A":          rebateInt,
			"TaxPayableOnRebate": liabInt - cessInt - surInt,
			"EducationCess":      cessInt,
			"GrossTaxLiability":  liabInt,
			"NetTaxLiability":    liabInt,
			"IntrstPay": map[string]any{
				"IntrstPayUs234A": 0, "IntrstPayUs234B": 0, "IntrstPayUs234C": 0, "LateFilingFee234F": 0,
			},
			"TotTaxPlusIntrstPay": liabInt,
		},
		"TaxPaid": map[string]any{
			"TaxesPaid": map[string]any{
				"AdvanceTax": advInt, "TDS": tdsInt, "TCS": tcsInt,
				"SelfAssessmentTax": 0,
				"TotalTaxesPaid":    paidInt,
			},
			"BalTaxPayable": balInt,
		},
		"Refund": map[string]any{
			"RefundDue": refundInt,
			"BankAccountDtls": map[string]any{
				"AddtnlBankDetails": []map[string]any{{
					"IFSCCode":      or(pd.BankIFSC, "SBIN0000001"),
					"BankName":      name75(or(pd.BankName, "NA")),
					"BankAccountNo": or(pd.BankAccount, "12345678901"),
					"AccountType":   "SB", "UseForRefund": "true",
				}},
			},
		},
		"Verification": map[string]any{
			"Declaration": map[string]any{
				"AssesseeVerName": name75(p.Name), "FatherName": name75(or(pd.FatherName, "NA")),
				"AssesseeVerPAN": panOf(p.PAN),
			},
			"Capacity": "S", "Place": or(pd.City, "Bengaluru"),
		},
		"ScheduleBP": map[string]any{
			"NatOfBus44ADA": []map[string]any{{"NameOfBusiness": "Professional services", "CodeADA": "14001"}},
			"PersumptiveInc44ADA": map[string]any{
				"GrsReceipt":             ri(p.GrossReceipts),
				"TotPersumptiveInc44ADA": presumptiveInt,
			},
		},
	}

	// the portal rejects returns that claim TDS/TCS credit without the matching
	// schedule rows (validation rules A126/A131/A132), even though the json
	// schema marks these schedules optional
	if tdsRows != nil {
		itr4["TDSonOthThanSals"] = map[string]any{
			"TDSonOthThanSalDtls":   tdsRows,
			"TotalTDSonOthThanSals": tdsInt,
		}
	}
	if tcsRows != nil {
		itr4["ScheduleTCS"] = map[string]any{
			"TCS":         tcsRows,
			"TotalSchTCS": tcsInt,
		}
	}

	return map[string]any{"ITR": map[string]any{"ITR4": itr4}}
}

// tdsSectionCode maps statement sections to the schema's TDSSection enum.
func tdsSectionCode(s string) string {
	switch strings.ToUpper(strings.TrimSpace(s)) {
	case "194JA":
		return "94J-A" // fees for technical services
	case "194J", "194JB":
		return "94J-B" // fees for professional services
	case "194C":
		return "94C"
	case "194A":
		return "94A"
	case "194H":
		return "4H"
	}
	return ""
}

// the schema's TAN pattern only accepts these RTO-style city prefixes —
// a row with any other TAN would make the whole json schema-invalid
var reSchemaTAN = regexp.MustCompile(`^(HYD|VPN|BBN|BPL|JBP|CHE|CMB|MRI|DEL|CAL|MRT|AHM|BRD|RKT|SRT|BLR|AGR|KNP|CHN|TVD|ALD|LKN|MUM|NGP|AMR|JLD|PTL|RTK|KLP|NSK|PNE|PTN|RCH|JDH|JPR|SHL)[A-Z][0-9]{5}[A-Z]$`)

func tdsSchedule(p compute.TaxpayerProfile) ([]map[string]any, int) {
	var rows []map[string]any
	total := 0
	for _, e := range p.TDSEntries {
		amt := ri(e.Amount)
		if amt <= 0 {
			continue // §197 zero-deduction rows carry no credit to claim
		}
		tan := strings.ToUpper(strings.TrimSpace(e.TAN))
		if !reSchemaTAN.MatchString(tan) {
			// statements (AIS json especially) sometimes omit the TAN; skipping
			// the row keeps the json schema-valid and rule A131 surfaces the gap
			continue
		}
		row := map[string]any{
			"TANOfDeductor":       tan,
			"TDSSection":          tdsSectionCode(e.Section),
			"TDSDeducted":         amt,
			"TDSClaimed":          amt,
			"TDSCreditCarriedFwd": 0,
		}
		// rules A121/A122: a claim must say what income it was deducted against
		if paid := ri(e.AmountPaid); paid > 0 {
			row["GrossAmount"] = paid
			row["HeadOfIncome"] = "BP"
		}
		rows = append(rows, row)
		total += amt
	}
	return rows, total
}

func tcsSchedule(p compute.TaxpayerProfile) ([]map[string]any, int) {
	var rows []map[string]any
	total := 0
	for _, e := range p.TCSEntries {
		amt := ri(e.Amount)
		if amt <= 0 {
			continue
		}
		tan := strings.ToUpper(strings.TrimSpace(e.TAN))
		if !reSchemaTAN.MatchString(tan) {
			continue // rule A132 surfaces the gap without breaking schema validity
		}
		rows = append(rows, map[string]any{
			"EmployerOrDeductorOrCollectDetl": map[string]any{
				"TAN":                               tan,
				"EmployerOrDeductorOrCollecterName": name75(or(e.Deductor, "NA")),
			},
			"Amtfrom26AS":           amt,
			"TotalTCS":              amt,
			"AmtTCSClaimedThisYear": amt,
		})
		total += amt
	}
	return rows, total
}

func stripPrefix(s string) string {
	const p = "not-eligible:"
	if len(s) >= len(p) && s[:len(p)] == p {
		return s[len(p):]
	}
	return s
}
