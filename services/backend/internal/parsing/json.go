// parses the ais json export without assuming its exact shape
package parsing

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

var (
	reSectionCode = regexp.MustCompile(`^(19[0-9][A-Z]{0,2}|20[0-9]C(-[0-9A-Za-z]+)?|SFT-[0-9]+)$`)
	reFYRange     = regexp.MustCompile(`^[0-9]{4}-[0-9]{2}$`)
)

func ParseJSON(raw string) *Statement {
	var root any
	if err := json.Unmarshal([]byte(raw), &root); err != nil {
		return &Statement{Source: "AIS"}
	}
	st := &Statement{Source: "AIS"}

	strs := []string{}
	collectStrings(root, &strs)
	for _, s := range strs {
		if st.PAN == "" && rePAN.MatchString(s) && len(strings.TrimSpace(s)) == 10 {
			st.PAN = strings.TrimSpace(s)
		}
	}
	var ranges []string
	for _, s := range strs {
		if reFYRange.MatchString(strings.TrimSpace(s)) {
			ranges = append(ranges, strings.TrimSpace(s))
		}
	}
	st.AssessmentYear, st.FinancialYear = pickYears(ranges)

	walkMaps(root, func(m map[string]any) {
		section := findSection(m)
		if section == "" {
			return
		}
		amount := numByHints(m, []string{"amount", "value", "paid", "credited", "received", "transaction", "debited"})
		tax := numByHints(m, []string{"tax", "deducted", "tds", "collected", "tcs"})
		if amount == 0 && tax == 0 {
			return
		}
		if strings.HasPrefix(section, "SFT") {
			st.SFT = append(st.SFT, SFTEntry{
				Code:      section,
				Detail:    strByHints(m, []string{"description", "detail", "nature"}),
				Value:     amount,
				ShareType: strByHints(m, []string{"share", "ownership"}),
			})
			return
		}
		kind := KindTDS
		if strings.HasPrefix(section, "20") {
			kind = KindTCS
		}
		st.Entries = append(st.Entries, LedgerEntry{
			Deductor:   strByHints(m, []string{"deductor", "payer", "source", "name", "collector", "entity"}),
			TAN:        findTAN(m),
			Section:    section,
			AmountPaid: amount,
			TaxAmount:  tax,
			Kind:       kind,
		})
	})
	return st
}

func pickYears(ranges []string) (ay, fy string) {
	for _, r := range ranges {
		if r > ay {
			fy = ay
			ay = r
		} else if r > fy {
			fy = r
		}
	}
	return ay, fy
}

func findSection(m map[string]any) string {
	for k, v := range m {
		lk := strings.ToLower(k)
		if strings.Contains(lk, "section") || strings.Contains(lk, "code") || strings.Contains(lk, "info") {
			if s, ok := v.(string); ok && reSectionCode.MatchString(strings.TrimSpace(s)) {
				return strings.TrimSpace(s)
			}
		}
	}
	for _, v := range m {
		if s, ok := v.(string); ok && reSectionCode.MatchString(strings.TrimSpace(s)) {
			return strings.TrimSpace(s)
		}
	}
	return ""
}

func findTAN(m map[string]any) string {
	for _, v := range m {
		if s, ok := v.(string); ok && reTAN.MatchString(strings.TrimSpace(s)) {
			return strings.TrimSpace(s)
		}
	}
	return ""
}

func numByHints(m map[string]any, hints []string) float64 {
	for k, v := range m {
		lk := strings.ToLower(k)
		for _, h := range hints {
			if strings.Contains(lk, h) {
				if n, ok := toNumber(v); ok {
					return n
				}
			}
		}
	}
	return 0
}

func strByHints(m map[string]any, hints []string) string {
	for k, v := range m {
		lk := strings.ToLower(k)
		for _, h := range hints {
			if strings.Contains(lk, h) {
				if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
					return strings.TrimSpace(s)
				}
			}
		}
	}
	return ""
}

func toNumber(v any) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case json.Number:
		f, err := x.Float64()
		return f, err == nil
	case string:
		f, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(x), ",", ""), 64)
		return f, err == nil
	}
	return 0, false
}

func walkMaps(v any, fn func(map[string]any)) {
	switch x := v.(type) {
	case map[string]any:
		fn(x)
		for _, child := range x {
			walkMaps(child, fn)
		}
	case []any:
		for _, child := range x {
			walkMaps(child, fn)
		}
	}
}

func collectStrings(v any, out *[]string) {
	switch x := v.(type) {
	case string:
		*out = append(*out, x)
	case map[string]any:
		for _, child := range x {
			collectStrings(child, out)
		}
	case []any:
		for _, child := range x {
			collectStrings(child, out)
		}
	}
}

func ParseAny(text string) *Statement {
	t := strings.TrimSpace(text)
	if strings.HasPrefix(t, "{") || strings.HasPrefix(t, "[") {
		return ParseJSON(t)
	}
	if strings.Contains(strings.ToUpper(t), "ANNUAL INFORMATION STATEMENT") || strings.Contains(t, "PART B1") {
		return ParseAIS(t)
	}
	return Parse26AS(t)
}
