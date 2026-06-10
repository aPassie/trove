//go:build js && wasm

// runs the whole tax engine in the browser via webassembly
package main

import (
	"encoding/json"
	"strings"
	"syscall/js"

	"github.com/aPassie/trove/backend/internal/compute"
	"github.com/aPassie/trove/backend/internal/itr"
	"github.com/aPassie/trove/backend/internal/parsing"
)

func main() {
	js.Global().Set("troveAnalyze", js.FuncOf(analyze))
	js.Global().Set("troveReady", js.FuncOf(func(js.Value, []js.Value) any { return true }))
	select {}
}

func analyze(_ js.Value, args []js.Value) any {
	if len(args) < 2 {
		return errJSON("missing arguments")
	}
	f26Text := args[0].String()
	aisText := args[1].String()
	qJSON := ""
	if len(args) >= 3 {
		qJSON = args[2].String()
	}

	var q compute.Questionnaire
	if qJSON != "" {
		if err := json.Unmarshal([]byte(qJSON), &q); err != nil {
			return errJSON("bad questionnaire: " + err.Error())
		}
	}

	form26AS := parsing.ParseAny(f26Text)
	var ais *parsing.Statement
	if strings.TrimSpace(aisText) != "" {
		ais = parsing.ParseAny(aisText)
	}

	if !form26AS.HasEntries() && !ais.HasEntries() {
		return errJSON("no tds or tcs entries found in this document — make sure it's your form 26as or ais download")
	}

	profile := compute.BuildProfile(form26AS, ais, q)
	result := compute.Compute(profile)
	draft := itr.NewDrafter().Draft(itr.DraftInput{Profile: profile, Result: result})

	b, err := json.Marshal(map[string]any{
		"profile": profile,
		"result":  result,
		"draft":   draft,
	})
	if err != nil {
		return errJSON("marshal: " + err.Error())
	}
	return string(b)
}

func errJSON(msg string) string {
	b, _ := json.Marshal(map[string]string{"error": msg})
	return string(b)
}
