// parses form 26as / ais text into a tax ledger
package parsing

import (
	"regexp"
	"strconv"
	"strings"
)

type EntryKind string

const (
	KindTDS EntryKind = "TDS"
	KindTCS EntryKind = "TCS"
)

type LedgerEntry struct {
	Deductor   string    `json:"deductor"`
	TAN        string    `json:"tan,omitempty"`
	Section    string    `json:"section"`
	AmountPaid float64   `json:"amountPaid"`
	TaxAmount  float64   `json:"taxAmount"`
	Kind       EntryKind `json:"kind"`
}

type SFTEntry struct {
	Code      string  `json:"code"`
	Detail    string  `json:"detail"`
	Value     float64 `json:"value"`
	ShareType string  `json:"shareType,omitempty"`
}

type Statement struct {
	Source         string        `json:"source"`
	PAN            string        `json:"pan"`
	TaxpayerName   string        `json:"taxpayerName"`
	AssessmentYear string        `json:"assessmentYear"`
	FinancialYear  string        `json:"financialYear"`
	Entries        []LedgerEntry `json:"entries"`
	SFT            []SFTEntry    `json:"sft,omitempty"`
}

var (
	reTAN      = regexp.MustCompile(`[A-Z]{4}[0-9]{5}[A-Z]`)
	rePAN      = regexp.MustCompile(`[A-Z]{5}[0-9]{4}[A-Z]`)
	reAmount   = regexp.MustCompile(`[0-9][0-9,]*\.[0-9]{2}|[0-9]{1,3}(,[0-9]{2,3})+`)
	reSection  = regexp.MustCompile(`Section:\s*([0-9A-Za-z\-]+)`)
	reLeadNum  = regexp.MustCompile(`^\s*\d+\s+`)
	reInfoCode = regexp.MustCompile(`^\s*([0-9]{3}[A-Z]{1,2})\b`)
	reSFTCode  = regexp.MustCompile(`^\s*(SFT-[0-9]+)\b`)
	reWS       = regexp.MustCompile(`\s{2,}`)
)

func parseAmount(s string) (float64, bool) {
	v, err := strconv.ParseFloat(strings.ReplaceAll(s, ",", ""), 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

func amountsIn(line string) []float64 {
	matches := reAmount.FindAllString(line, -1)
	out := make([]float64, 0, len(matches))
	for _, m := range matches {
		if v, ok := parseAmount(m); ok {
			out = append(out, v)
		}
	}
	return out
}

func firstField(s string) string {
	parts := reWS.Split(strings.TrimSpace(s), -1)
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}

func capture(re *regexp.Regexp, text string) string {
	if m := re.FindStringSubmatch(text); len(m) > 1 {
		return strings.TrimSpace(m[1])
	}
	return ""
}

func Parse26AS(text string) *Statement {
	st := &Statement{Source: "26AS"}
	st.PAN = capture(regexp.MustCompile(`Permanent Account Number \(PAN\):\s*(`+rePAN.String()+`)`), text)
	st.TaxpayerName = firstField(capture(regexp.MustCompile(`Name of Taxpayer:\s*(.+)`), text))
	st.AssessmentYear = capture(regexp.MustCompile(`(?s)Assessment Year \(AY\):\s*([0-9]{4}-[0-9]{2})`), text)
	st.FinancialYear = capture(regexp.MustCompile(`(?s)Financial Year \(FY\):\s*([0-9]{4}-[0-9]{2})`), text)

	partA, partB := text, ""
	if i := strings.Index(text, "PART B"); i >= 0 {
		partA, partB = text[:i], text[i:]
	}
	if j := strings.Index(partA, "PART A"); j >= 0 {
		partA = partA[j:]
	}
	st.Entries = append(st.Entries, parse26ASRows(partA, KindTDS)...)
	st.Entries = append(st.Entries, parse26ASRows(partB, KindTCS)...)
	return st
}

func parse26ASRows(region string, kind EntryKind) []LedgerEntry {
	var out []LedgerEntry
	var curDeductor, curTAN string

	assignSection := func(section string) {
		for i := len(out) - 1; i >= 0; i-- {
			if out[i].Section == "" {
				out[i].Section = section
				return
			}
		}
	}

	for _, raw := range strings.Split(region, "\n") {
		line := strings.TrimRight(raw, " ")
		if strings.TrimSpace(line) == "" {
			continue
		}
		if s := capture(reSection, line); s != "" {
			assignSection(s)
			continue
		}
		if strings.Contains(line, "PART ") || strings.Contains(line, "Sl.No") ||
			strings.Contains(line, "TAN of") || strings.Contains(line, "Total Amount") ||
			strings.Contains(line, "Total Tax") || strings.Contains(line, "Deductor") ||
			strings.Contains(line, "Collector") || strings.Contains(line, "Deposited") {
			continue
		}

		amts := amountsIn(line)
		if tan := reTAN.FindString(line); tan != "" {
			name := strings.TrimSpace(line[:strings.Index(line, tan)])
			name = reLeadNum.ReplaceAllString(name, "")
			name = strings.TrimSpace(name)
			curDeductor, curTAN = name, tan
			if len(amts) >= 2 {
				out = append(out, LedgerEntry{Deductor: name, TAN: tan, AmountPaid: amts[0], TaxAmount: amts[1], Kind: kind})
			}
			continue
		}
		if len(amts) >= 2 {
			out = append(out, LedgerEntry{Deductor: curDeductor, TAN: curTAN, AmountPaid: amts[0], TaxAmount: amts[1], Kind: kind})
			continue
		}
		if curDeductor != "" && len(out) > 0 && out[len(out)-1].Section == "" &&
			!strings.ContainsAny(line, "0123456789") {
			extra := strings.TrimSpace(line)
			if extra != "" {
				out[len(out)-1].Deductor = strings.TrimSpace(out[len(out)-1].Deductor + " " + extra)
				curDeductor = out[len(out)-1].Deductor
			}
		}
	}
	return out
}

func ParseAIS(text string) *Statement {
	st := &Statement{Source: "AIS"}
	st.PAN = capture(regexp.MustCompile(`PAN:\s*(`+rePAN.String()+`)`), text)
	st.TaxpayerName = firstField(capture(regexp.MustCompile(`Name:\s*(.+)`), text))
	st.AssessmentYear = capture(regexp.MustCompile(`Assessment Year:\s*([0-9]{4}-[0-9]{2})`), text)
	st.FinancialYear = capture(regexp.MustCompile(`Financial Year:\s*([0-9]{4}-[0-9]{2})`), text)

	b1, b2 := text, ""
	if i := strings.Index(text, "PART B2"); i >= 0 {
		b2 = text[i:]
		if j := strings.Index(text, "PART B1"); j >= 0 {
			b1 = text[j:i]
		}
	}

	for _, raw := range strings.Split(b1, "\n") {
		m := reInfoCode.FindStringSubmatch(raw)
		if m == nil {
			continue
		}
		amts := amountsIn(raw)
		if len(amts) < 2 {
			continue
		}
		st.Entries = append(st.Entries, LedgerEntry{
			Deductor:   aisPayer(raw, m[1]),
			Section:    m[1],
			AmountPaid: amts[0],
			TaxAmount:  amts[1],
			Kind:       KindTDS,
		})
	}

	for _, raw := range strings.Split(b2, "\n") {
		m := reSFTCode.FindStringSubmatch(raw)
		if m == nil {
			continue
		}
		amts := amountsIn(raw)
		val := 0.0
		if len(amts) > 0 {
			val = amts[0]
		}
		st.SFT = append(st.SFT, SFTEntry{
			Code:      m[1],
			Detail:    sftDetail(raw, m[1]),
			Value:     val,
			ShareType: sftShareType(raw),
		})
	}
	return st
}

func aisPayer(line, code string) string {
	rest := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), code))
	fields := reWS.Split(rest, -1)
	for _, f := range fields {
		f = strings.TrimSpace(f)
		if f == "" || reAmount.MatchString(f) {
			continue
		}
		if strings.ToUpper(f) == f && len(f) > 2 {
			return f
		}
	}
	return ""
}

func sftDetail(line, code string) string {
	rest := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), code))
	if idx := reAmount.FindStringIndex(rest); idx != nil {
		rest = rest[:idx[0]]
	}
	return strings.TrimSpace(rest)
}

func sftShareType(line string) string {
	idx := reAmount.FindAllStringIndex(line, -1)
	if len(idx) == 0 {
		return ""
	}
	return strings.TrimSpace(line[idx[len(idx)-1][1]:])
}

func (s *Statement) TotalByKind(kind EntryKind) float64 {
	var total float64
	for _, e := range s.Entries {
		if e.Kind == kind {
			total += e.TaxAmount
		}
	}
	return total
}

func (s *Statement) TotalTDS() float64 { return s.TotalByKind(KindTDS) }
func (s *Statement) TotalTCS() float64 { return s.TotalByKind(KindTCS) }

func (s *Statement) TotalTaxCredit() float64 { return s.TotalTDS() + s.TotalTCS() }

func (s *Statement) ReceiptsBySection() map[string]float64 {
	out := map[string]float64{}
	for _, e := range s.Entries {
		if e.Kind == KindTDS {
			out[e.Section] += e.AmountPaid
		}
	}
	return out
}

func (s *Statement) HasCapitalGainsSignal() bool {
	for _, e := range s.SFT {
		d := strings.ToLower(e.Detail)
		disposal := strings.Contains(d, "sale") || strings.Contains(d, "redemption") || strings.Contains(d, "off market") || strings.Contains(d, "off-market")
		if !disposal {
			continue
		}
		asset := strings.Contains(d, "immovable property") || strings.Contains(d, "securit") ||
			strings.Contains(d, "mutual fund") || strings.Contains(d, "equity") ||
			strings.Contains(d, "share") || strings.Contains(d, "unit") ||
			strings.Contains(d, "off market") || strings.Contains(d, "off-market")
		if asset {
			return true
		}
	}
	return false
}

func (s *Statement) HasEntries() bool {
	return s != nil && len(s.Entries) > 0
}
