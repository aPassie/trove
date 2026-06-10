package itr

import (
	"testing"

	"github.com/aPassie/trove/backend/internal/compute"
	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

func eligibleInput() DraftInput {
	profile := compute.TaxpayerProfile{
		PAN:            "ZZZZZ9999Z",
		AssessmentYear: "2026-27",
		Name:           "Aakash Singh",
		AgeBand:        taxrules.AgeBelow60,
		GrossReceipts:  1200000,
		TDSEntries: []parsing.TDSEntry{
			{Deductor: "Acme", TAN: "BLRA12345E", Section: "194J", Amount: 51000, FinancialYear: "2025-26"},
		},
	}
	return DraftInput{Profile: profile, Result: compute.Compute(profile)}
}

// itr4Of extracts the nested ITR4 object from the { "ITR": { "ITR4": {…} } } doc.
func itr4Of(out *DraftOutput) map[string]any {
	return out.ITR4["ITR"].(map[string]any)["ITR4"].(map[string]any)
}

func TestDraft_EmitsITR4Schema(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	if out.Schema != "ITR-4-AY2026-27" {
		t.Errorf("schema: got %q, want ITR-4-AY2026-27", out.Schema)
	}
	if !out.Eligible {
		t.Errorf("expected eligible draft")
	}
}

func TestDraft_RealStructure(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	itr4 := itr4Of(out)
	form := itr4["Form_ITR4"].(map[string]any)
	if form["FormName"] != "ITR-4" {
		t.Errorf("FormName: got %v, want ITR-4", form["FormName"])
	}
	// All 9 required blocks present.
	for _, blk := range []string{"CreationInfo", "Form_ITR4", "PersonalInfo", "FilingStatus", "IncomeDeductions", "TaxComputation", "TaxPaid", "Refund", "Verification"} {
		if _, ok := itr4[blk]; !ok {
			t.Errorf("missing required block %q", blk)
		}
	}
}

// The generated return validates against the OFFICIAL CBDT ITR-4 schema.
func TestDraft_ValidatesAgainstOfficialSchema(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	if len(out.ValidationErrors) != 0 {
		t.Errorf("draft failed official schema validation: %v", out.ValidationErrors)
	}
}

func TestDraft_PresumptiveAndRefund(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	bp := itr4Of(out)["ScheduleBP"].(map[string]any)["PersumptiveInc44ADA"].(map[string]any)
	if bp["TotPersumptiveInc44ADA"].(int) != 600000 {
		t.Errorf("presumptive income: got %v, want 600000", bp["TotPersumptiveInc44ADA"])
	}
	if out.RefundAmount != 51000 {
		t.Errorf("refund: got %v, want 51000", out.RefundAmount)
	}
}

func TestDraft_IneligibleRefusesITR4(t *testing.T) {
	profile := compute.TaxpayerProfile{
		PAN:            "ZZZZZ9999Z",
		AssessmentYear: "2025-26",
		AgeBand:        taxrules.AgeBelow60,
		GrossReceipts:  8000000, // above the §44ADA ₹75L ceiling
	}
	out := NewDrafter().Draft(DraftInput{Profile: profile, Result: compute.Compute(profile)})
	if out.Eligible {
		t.Errorf("expected ineligible draft")
	}
	if out.ITR4 != nil {
		t.Errorf("ineligible draft must not contain an ITR-4 document")
	}
	if out.Message == "" {
		t.Errorf("expected an explanatory message")
	}
}

func TestDraft_LongNameAndLowercasePANStillValidate(t *testing.T) {
	profile := compute.TaxpayerProfile{
		PAN:            "zzzzz9999z", // lowercase from a json export
		AssessmentYear: "2026-27",
		Name:           "Thiruvananthapuram Venkatanarasimharajuvaripeta Subrahmanyam Chandrasekhara Iyer III", // 85 chars
		AgeBand:        taxrules.AgeBelow60,
		GrossReceipts:  1000000,
		TDSEntries:     []parsing.TDSEntry{{Deductor: "X", Section: "194J", Amount: 10000, FinancialYear: "2025-26"}},
	}
	out := NewDrafter().Draft(DraftInput{Profile: profile, Result: compute.Compute(profile)})
	if !out.Eligible {
		t.Fatal("expected eligible")
	}
	if len(out.ValidationErrors) != 0 {
		t.Errorf("long name / lowercase PAN broke schema validation: %v", out.ValidationErrors)
	}
	pi := itr4Of(out)["PersonalInfo"].(map[string]any)
	if pi["PAN"] != "ZZZZZ9999Z" {
		t.Errorf("PAN not uppercased: %v", pi["PAN"])
	}
	if n := pi["AssesseeName"].(map[string]any)["SurNameOrOrgName"].(string); len(n) > 75 {
		t.Errorf("name not truncated: %d chars", len(n))
	}
}

func TestDraft_OtherAYHasNoFilingJSON(t *testing.T) {
	profile := compute.TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2025-26", Name: "A",
		AgeBand: taxrules.AgeBelow60, GrossReceipts: 1000000,
		TDSEntries: []parsing.TDSEntry{{Deductor: "X", Section: "194J", Amount: 10000, FinancialYear: "2024-25"}},
	}
	out := NewDrafter().Draft(DraftInput{Profile: profile, Result: compute.Compute(profile)})
	if !out.Eligible {
		t.Fatal("refund math must still be shown for other AYs")
	}
	if out.ITR4 != nil {
		t.Error("must not emit a filing JSON for a year the schema doesn't cover")
	}
	if out.Message == "" {
		t.Error("expected an explanatory message")
	}
}

func TestDraft_OldRegimeCarriesForm10IEAWarning(t *testing.T) {
	profile := compute.TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", Name: "A",
		AgeBand: taxrules.AgeBelow60, GrossReceipts: 1200000, Regime: taxrules.RegimeOld,
		TDSEntries: []parsing.TDSEntry{{Deductor: "X", Section: "194J", Amount: 10000, FinancialYear: "2025-26"}},
	}
	out := NewDrafter().Draft(DraftInput{Profile: profile, Result: compute.Compute(profile)})
	if out.ITR4 == nil || len(out.ValidationErrors) != 0 {
		t.Fatalf("old-regime draft should still validate: %v", out.ValidationErrors)
	}
	if out.Message == "" {
		t.Error("expected a Form 10-IEA caveat for the old regime")
	}
}

func TestValidate_FlagsInvalidDocument(t *testing.T) {
	// An incomplete document must fail validation against the official schema.
	errs := validate("2026-27", map[string]any{"ITR": map[string]any{"ITR4": map[string]any{"Form_ITR4": map[string]any{"FormName": "ITR-4"}}}})
	if len(errs) == 0 {
		t.Errorf("expected validation errors for an incomplete document")
	}
}

func personalDetails() compute.PersonalDetails {
	return compute.PersonalDetails{
		DOB:         "1994-06-15",
		FatherName:  "Rajesh Singh",
		Aadhaar:     "234567890123",
		Flat:        "B-204, Sunrise Apartments",
		Locality:    "Indiranagar 2nd Stage",
		City:        "Bengaluru",
		StateCode:   "15",
		PinCode:     "560038",
		Mobile:      "9876543210",
		Email:       "aakash@example.com",
		BankIFSC:    "HDFC0001234",
		BankName:    "HDFC Bank",
		BankAccount: "50100123456789",
	}
}

// Real personal details land in PersonalInfo, Refund bank block, and Verification —
// and the result still validates against the official schema.
func TestDraft_PersonalDetailsFlowThrough(t *testing.T) {
	in := eligibleInput()
	in.Profile.Personal = personalDetails()
	in.Result = compute.Compute(in.Profile)

	out := NewDrafter().Draft(in)
	if out.Placeholders {
		t.Errorf("complete personal details should clear the placeholders flag (msg: %q)", out.Message)
	}
	if len(out.ValidationErrors) != 0 {
		t.Fatalf("draft with personal details failed schema validation: %v", out.ValidationErrors)
	}

	itr4 := itr4Of(out)
	pi := itr4["PersonalInfo"].(map[string]any)
	if pi["DOB"] != "1994-06-15" {
		t.Errorf("DOB: got %v", pi["DOB"])
	}
	if pi["AadhaarCardNo"] != "234567890123" {
		t.Errorf("AadhaarCardNo: got %v", pi["AadhaarCardNo"])
	}
	addr := pi["Address"].(map[string]any)
	if addr["CityOrTownOrDistrict"] != "Bengaluru" || addr["StateCode"] != "15" {
		t.Errorf("address: got city=%v state=%v", addr["CityOrTownOrDistrict"], addr["StateCode"])
	}
	if addr["PinCode"] != 560038 {
		t.Errorf("PinCode: got %v", addr["PinCode"])
	}
	if addr["MobileNo"] != int64(9876543210) {
		t.Errorf("MobileNo: got %v", addr["MobileNo"])
	}

	bank := itr4["Refund"].(map[string]any)["BankAccountDtls"].(map[string]any)["AddtnlBankDetails"].([]map[string]any)[0]
	if bank["IFSCCode"] != "HDFC0001234" || bank["BankAccountNo"] != "50100123456789" {
		t.Errorf("bank: got %v / %v", bank["IFSCCode"], bank["BankAccountNo"])
	}

	decl := itr4["Verification"].(map[string]any)["Declaration"].(map[string]any)
	if decl["FatherName"] != "Rajesh Singh" {
		t.Errorf("FatherName: got %v", decl["FatherName"])
	}
	if itr4["Verification"].(map[string]any)["Place"] != "Bengaluru" {
		t.Errorf("Place: got %v", itr4["Verification"].(map[string]any)["Place"])
	}
}

// Without details the draft must say so loudly.
func TestDraft_MissingPersonalDetailsAreFlagged(t *testing.T) {
	out := NewDrafter().Draft(eligibleInput())
	if !out.Placeholders {
		t.Errorf("expected placeholders flag when no personal details given")
	}
	if out.Message == "" {
		t.Errorf("expected a placeholder warning message")
	}
}

// Half-filled or malformed details must NOT clear the flag.
func TestDraft_PartialOrBadDetailsStayFlagged(t *testing.T) {
	bad := []func(*compute.PersonalDetails){
		func(d *compute.PersonalDetails) { d.BankIFSC = "" },            // missing
		func(d *compute.PersonalDetails) { d.BankIFSC = "hdfc0001234" }, // lowercase
		func(d *compute.PersonalDetails) { d.PinCode = "0560038" },      // leading zero
		func(d *compute.PersonalDetails) { d.Mobile = "12345" },         // too short
		func(d *compute.PersonalDetails) { d.DOB = "15-06-1994" },       // wrong format
		func(d *compute.PersonalDetails) { d.Aadhaar = "12345" },        // bad optional field
		func(d *compute.PersonalDetails) { d.StateCode = "55" },         // not a state code
		func(d *compute.PersonalDetails) { d.Email = "not-an-email" },   // bad email
		func(d *compute.PersonalDetails) { d.BankAccount = "12ab34" },   // letters in account
	}
	for i, mutate := range bad {
		in := eligibleInput()
		d := personalDetails()
		mutate(&d)
		in.Profile.Personal = d
		in.Result = compute.Compute(in.Profile)
		if out := NewDrafter().Draft(in); !out.Placeholders {
			t.Errorf("case %d: bad details should keep the placeholders flag", i)
		}
	}
}
