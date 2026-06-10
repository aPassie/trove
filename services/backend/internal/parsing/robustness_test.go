// hostile-input tests: user-facing parsers must never panic or hang
package parsing

import (
	"fmt"
	"strings"
	"testing"
)

func TestParsers_NeverPanicOnHostileInput(t *testing.T) {
	inputs := []string{
		"",
		"\x00\x01\x02 binary \xff garbage",
		strings.Repeat("9,99,999.99 ", 5000),                          // amounts everywhere
		strings.Repeat("A", 1<<20),                                    // 1MB of one letter
		"PART A" + strings.Repeat("\n", 100000),                       // huge but empty
		"↳ Section: 194J | ↳ Section: 194J",                           // orphan section lines
		"{\"a\":" + strings.Repeat("[", 20000) + "1",                  // deep + truncated json
		strings.Repeat("[", 20000) + strings.Repeat("]", 20000),       // 20k-deep array (json depth limit)
		`{"infoCode":"194J","amountReceived":1e308,"taxDeducted":-1}`, // absurd numbers
		"Name of Taxpayer: " + strings.Repeat("x", 100000),
		"FORM 26AS ‮ु‍ unicode soup ₹₹₹",
	}
	for i, in := range inputs {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("input %d panicked: %v", i, r)
				}
			}()
			_ = ParseAny(in)
			_ = Parse26AS(in)
			_ = ParseAIS(in)
			_ = ParseJSON(in)
		}()
	}
}

func TestParse26AS_FiftyDeductorsTotalsCorrectly(t *testing.T) {
	var b strings.Builder
	b.WriteString("FORM 26AS\nAssessment Year (AY):\n2026-27\nFinancial Year (FY):\n2025-26\n")
	b.WriteString("PART A - Details of Tax Deducted at Source (TDS)\n")
	wantTotal := 0.0
	for i := 1; i <= 50; i++ {
		amt := float64(i * 1000)
		wantTotal += amt
		fmt.Fprintf(&b, "%d   CLIENT %d PVT LTD   BLRA%05dC   %d,00,000.00   %s   %s\n",
			i, i, i, i, indian(amt), indian(amt))
		b.WriteString("    ↳ Section: 194J | Transaction Date: 15/07/2025 | Status: Finalized\n")
	}
	b.WriteString("PART B - Details of Tax Collected at Source (TCS)\n")

	st := Parse26AS(b.String())
	if len(st.Entries) != 50 {
		t.Fatalf("entries: got %d, want 50", len(st.Entries))
	}
	if got := st.TotalTDS(); got != wantTotal {
		t.Errorf("total tds: got %v, want %v", got, wantTotal)
	}
	for i, e := range st.Entries {
		if e.Section != "194J" || e.TAN == "" {
			t.Fatalf("row %d lost its section or tan: %+v", i, e)
		}
	}
}

func indian(v float64) string {
	s := fmt.Sprintf("%.2f", v)
	whole := s[:len(s)-3]
	if len(whole) > 3 {
		head, tail := whole[:len(whole)-3], whole[len(whole)-3:]
		var parts []string
		for len(head) > 2 {
			parts = append([]string{head[len(head)-2:]}, parts...)
			head = head[:len(head)-2]
		}
		if head != "" {
			parts = append([]string{head}, parts...)
		}
		whole = strings.Join(parts, ",") + "," + tail
	}
	return whole + s[len(s)-3:]
}

func TestParseJSON_YearInference(t *testing.T) {
	// ay is the later range, fy the earlier — order in the document must not matter
	st := ParseJSON(`{"x":["2025-26","2026-27"],"rows":[{"section":"194J","amountReceived":100000,"taxDeducted":10000}]}`)
	if st.AssessmentYear != "2026-27" || st.FinancialYear != "2025-26" {
		t.Errorf("years: ay=%q fy=%q", st.AssessmentYear, st.FinancialYear)
	}
	st = ParseJSON(`{"x":["2026-27","2025-26"],"rows":[{"section":"194J","amountReceived":1,"taxDeducted":1}]}`)
	if st.AssessmentYear != "2026-27" || st.FinancialYear != "2025-26" {
		t.Errorf("reversed order: ay=%q fy=%q", st.AssessmentYear, st.FinancialYear)
	}
}
