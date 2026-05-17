// redact — strips real-looking pan and aadhaar values from payloads before logging

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
	s := string(raw)
	s = panPattern.ReplaceAllString(s, "[REDACTED_PAN]")
	s = aadhaarPattern.ReplaceAllString(s, "[REDACTED_AADHAAR]")
	var out any
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, err
	}
	return out, nil
}
