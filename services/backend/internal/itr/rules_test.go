// exercises the cbdt category-a portal rules against drafts we build
package itr

import (
	"strings"
	"testing"

	"github.com/aPassie/trove/backend/internal/compute"
	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/taxrules"
)

func violations(out *DraftOutput) string { return strings.Join(out.RuleViolations, " | ") }

func hasRule(out *DraftOutput, rule string) bool {
	for _, v := range out.RuleViolations {
		if strings.HasPrefix(v, "rule "+rule+":") {
			return true
		}
	}
	return false
}

// A clean, fully-specified draft must pass every portal rule.
func TestRules_CleanDraftHasNoViolations(t *testing.T) {
	in := eligibleInput()
	in.Profile.TDSEntries[0].AmountPaid = 510000
	in.Profile.Personal = personalDetails()
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)
	if len(out.RuleViolations) != 0 {
		t.Fatalf("clean draft has violations: %s", violations(out))
	}
	if len(out.ValidationErrors) != 0 {
		t.Fatalf("clean draft fails schema: %v", out.ValidationErrors)
	}
}

// The TDS credit claimed in TaxPaid must be backed by Schedule TDS rows.
func TestRules_TDSScheduleEmittedAndConsistent(t *testing.T) {
	in := eligibleInput()
	in.Profile.TDSEntries[0].AmountPaid = 510000
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)

	itr4 := itr4Of(out)
	sched, ok := itr4["TDSonOthThanSals"].(map[string]any)
	if !ok {
		t.Fatal("Schedule TDS2 missing — the portal rejects unscheduled TDS claims (rule A126/A131)")
	}
	rows := sched["TDSonOthThanSalDtls"].([]map[string]any)
	if len(rows) != 1 {
		t.Fatalf("expected 1 TDS row, got %d", len(rows))
	}
	row := rows[0]
	if row["TANOfDeductor"] != "BLRA12345E" || row["TDSSection"] != "94J-B" {
		t.Errorf("row: tan=%v section=%v", row["TANOfDeductor"], row["TDSSection"])
	}
	if row["TDSClaimed"] != 51000 || row["GrossAmount"] != 510000 || row["HeadOfIncome"] != "BP" {
		t.Errorf("row claim/gross/head: %v / %v / %v", row["TDSClaimed"], row["GrossAmount"], row["HeadOfIncome"])
	}
	if sched["TotalTDSonOthThanSals"] != 51000 {
		t.Errorf("schedule total: %v", sched["TotalTDSonOthThanSals"])
	}
	if hasRule(out, "A131") {
		t.Errorf("consistent schedule still flagged: %s", violations(out))
	}
}

// A deductor without a usable TAN cannot appear in the schedule — the draft
// stays schema-valid and rule A131 tells the user what to fix on the portal.
func TestRules_MissingTANSurfacesA131(t *testing.T) {
	in := eligibleInput()
	in.Profile.TDSEntries = []parsing.TDSEntry{
		{Deductor: "No-TAN Client", Section: "194J", Amount: 51000, AmountPaid: 510000, FinancialYear: "2025-26"},
	}
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)
	if len(out.ValidationErrors) != 0 {
		t.Fatalf("draft must stay schema-valid even without TANs: %v", out.ValidationErrors)
	}
	if !hasRule(out, "A131") {
		t.Fatalf("expected A131 for unscheduled TDS, got: %s", violations(out))
	}
}

// TCS credit flows into Schedule TCS with the collector's TAN.
func TestRules_TCSScheduleEmitted(t *testing.T) {
	in := eligibleInput()
	in.Profile.TDSEntries[0].AmountPaid = 510000
	in.Profile.TCSEntries = []parsing.TDSEntry{
		{Deductor: "Foreign Remit Bank", TAN: "MUMF67890C", Section: "206C", Amount: 45000, FinancialYear: "2025-26"},
	}
	in.Profile.TCSCredit = 45000
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)
	if len(out.ValidationErrors) != 0 {
		t.Fatalf("schema: %v", out.ValidationErrors)
	}
	if hasRule(out, "A132") {
		t.Fatalf("consistent TCS schedule flagged: %s", violations(out))
	}
	sched := itr4Of(out)["ScheduleTCS"].(map[string]any)
	if sched["TotalSchTCS"] != 45000 {
		t.Errorf("TCS total: %v", sched["TotalSchTCS"])
	}
}

// Advance tax needs challan rows we never fabricate — A133 must say so.
func TestRules_AdvanceTaxWithoutChallanFlagsA133(t *testing.T) {
	in := eligibleInput()
	in.Profile.TDSEntries[0].AmountPaid = 510000
	in.Profile.AdvanceTaxPaid = 20000
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)
	if !hasRule(out, "A133") {
		t.Fatalf("expected A133 challan warning, got: %s", violations(out))
	}
}

// Receipts above ₹50L are conditional on ≥95%% digital receipts — flag them.
func TestRules_ReceiptsAbove50LFlagsA238(t *testing.T) {
	in := eligibleInput()
	in.Profile.GrossReceipts = 6000000
	in.Profile.TDSEntries = []parsing.TDSEntry{
		{Deductor: "Acme", TAN: "BLRA12345E", Section: "194J", Amount: 600000, AmountPaid: 6000000, FinancialYear: "2025-26"},
	}
	in.Result = compute.Compute(in.Profile)
	out := NewDrafter().Draft(in)
	if !out.Eligible || out.ITR4 == nil {
		t.Fatal("60L receipts are within the §44ADA ceiling — draft expected")
	}
	if !hasRule(out, "A238") {
		t.Fatalf("expected A238 digital-receipts flag, got: %s", violations(out))
	}
}

// Corrupting cross-field identities must trip the matching rule.
func TestRules_CorruptedDocsTripIdentities(t *testing.T) {
	cases := []struct {
		rule   string
		mutate func(itr4 map[string]any)
	}{
		{"A1/A2", func(m map[string]any) { m["IncomeDeductions"].(map[string]any)["IncomeFromBusinessProf"] = 1 }},
		{"A46", func(m map[string]any) { m["IncomeDeductions"].(map[string]any)["TotalIncome"] = 1 }},
		{"A52", func(m map[string]any) { m["TaxComputation"].(map[string]any)["Rebate87A"] = 999 }},
		{"A53", func(m map[string]any) { m["TaxComputation"].(map[string]any)["EducationCess"] = 999 }},
		{"A127", func(m map[string]any) { m["TaxPaid"].(map[string]any)["TaxesPaid"].(map[string]any)["TotalTaxesPaid"] = 1 }},
		{"A128", func(m map[string]any) { m["Refund"].(map[string]any)["RefundDue"] = 1 }},
		{"A234", func(m map[string]any) { m["FilingStatus"].(map[string]any)["ItrFilingDueDate"] = "2027-01-01" }},
		{"A14", func(m map[string]any) {
			m["ScheduleBP"].(map[string]any)["PersumptiveInc44ADA"].(map[string]any)["GrsReceipt"] = 99999999
		}},
	}
	for _, c := range cases {
		in := eligibleInput()
		in.Profile.TDSEntries[0].AmountPaid = 510000
		in.Result = compute.Compute(in.Profile)
		out := NewDrafter().Draft(in)
		c.mutate(itr4Of(out))
		got := CheckRules(in.Result.ChosenRegime, out.ITR4)
		found := false
		for _, v := range got {
			if strings.HasPrefix(v, "rule "+c.rule+":") {
				found = true
			}
		}
		if !found {
			t.Errorf("corrupting for %s not caught; got: %s", c.rule, strings.Join(got, " | "))
		}
	}
}

// Old-regime rebate above ₹5L income is a portal rejection (A51).
func TestRules_OldRegimeRebateGuard(t *testing.T) {
	profile := compute.TaxpayerProfile{
		PAN: "ZZZZZ9999Z", AssessmentYear: "2026-27", Name: "A",
		AgeBand: taxrules.AgeBelow60, GrossReceipts: 900000, Regime: taxrules.RegimeOld,
		TDSEntries: []parsing.TDSEntry{{Deductor: "X", TAN: "BLRA12345E", Section: "194J", Amount: 90000, AmountPaid: 900000, FinancialYear: "2025-26"}},
	}
	out := NewDrafter().Draft(DraftInput{Profile: profile, Result: compute.Compute(profile)})
	// 4.5L total income → rebate legitimately claimed → must NOT be flagged
	if hasRule(out, "A51") || hasRule(out, "A229") {
		t.Errorf("legitimate old-regime rebate flagged: %s", violations(out))
	}
}
