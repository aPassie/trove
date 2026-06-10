// the taxpayer's personal + bank details that go on the return itself
package compute

import "regexp"

type PersonalDetails struct {
	DOB        string `json:"dob"` // YYYY-MM-DD
	FatherName string `json:"fatherName"`
	Aadhaar    string `json:"aadhaar"` // 12 digits, optional

	Flat      string `json:"flat"` // house / flat / door no
	Locality  string `json:"locality"`
	City      string `json:"city"`
	StateCode string `json:"stateCode"` // official ITD two-digit code
	PinCode   string `json:"pinCode"`

	Mobile string `json:"mobile"`
	Email  string `json:"email"`

	BankIFSC    string `json:"bankIfsc"`
	BankName    string `json:"bankName"`
	BankAccount string `json:"bankAccount"`
}

// patterns taken from the official ITR-4 schema, so what we accept is what the portal accepts
var (
	reDOB     = regexp.MustCompile(`^[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$`)
	rePin     = regexp.MustCompile(`^[1-9][0-9]{5}$`)
	reMobile  = regexp.MustCompile(`^[1-9][0-9]{9}$`)
	reEmail   = regexp.MustCompile(`^[\.a-zA-Z0-9_\-]+@[a-zA-Z0-9_\-]+([a-zA-Z0-9_\-]*\.[a-zA-Z0-9_\-]+)+$`)
	reIFSC    = regexp.MustCompile(`^[A-Z]{4}0[A-Z0-9]{6}$`)
	reAccount = regexp.MustCompile(`^[0-9]{6,20}$`)
	reAadhaar = regexp.MustCompile(`^[0-9]{12}$`)
	reState   = regexp.MustCompile(`^(0[1-9]|[12][0-9]|3[0-7]|99)$`)
)

// Complete reports whether every field the return needs is present and well-formed.
// Aadhaar is the only optional field.
func (pd PersonalDetails) Complete() bool {
	required := pd.FatherName != "" && pd.Flat != "" && pd.Locality != "" && pd.City != "" &&
		pd.BankName != "" &&
		reDOB.MatchString(pd.DOB) && rePin.MatchString(pd.PinCode) &&
		reMobile.MatchString(pd.Mobile) && reEmail.MatchString(pd.Email) &&
		reIFSC.MatchString(pd.BankIFSC) && reAccount.MatchString(pd.BankAccount) &&
		reState.MatchString(pd.StateCode)
	if pd.Aadhaar != "" && !reAadhaar.MatchString(pd.Aadhaar) {
		return false
	}
	return required
}
