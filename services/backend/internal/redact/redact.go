package redact

import (
	"encoding/json"
	"regexp"
)

var (
	panPattern     = regexp.MustCompile(`[A-PR-WYZ]{5}[0-9]{4}[A-PR-WYZ]`)
	aadhaarPattern = regexp.MustCompile(`\b\d{12}\b`)
)

type Redactor struct{}

func New() *Redactor { return &Redactor{} }

func (r *Redactor) Redact(v any) (any, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	s := r.RedactString(string(raw))
	var out any
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Redactor) RedactString(s string) string {
	s = panPattern.ReplaceAllString(s, "[REDACTED_PAN]")
	s = aadhaarPattern.ReplaceAllString(s, "[REDACTED_AADHAAR]")
	return s
}
