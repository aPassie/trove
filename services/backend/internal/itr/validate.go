//go:build !js

// validates the itr-4 against the official cbdt schema (server + ci)
package itr

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

//go:embed schema/ITR-4_2026_Main_V1.0_0.json
var officialITR4Schema []byte

var compiledITR4 *jsonschema.Schema

func init() {
	c := jsonschema.NewCompiler()
	c.Draft = jsonschema.Draft4
	if err := c.AddResource("itr4.json", strings.NewReader(string(officialITR4Schema))); err != nil {
		return
	}
	compiledITR4, _ = c.Compile("itr4.json")
}

func validate(_ string, doc map[string]any) []string {
	if compiledITR4 == nil {
		return []string{"official ITR-4 schema failed to load"}
	}
	raw, err := json.Marshal(doc)
	if err != nil {
		return []string{"marshal: " + err.Error()}
	}
	var normalized any
	if err := json.Unmarshal(raw, &normalized); err != nil {
		return []string{"unmarshal: " + err.Error()}
	}
	if err := compiledITR4.Validate(normalized); err != nil {
		return flatten(err)
	}
	return nil
}

func flatten(err error) []string {
	ve, ok := err.(*jsonschema.ValidationError)
	if !ok {
		return []string{err.Error()}
	}
	var out []string
	var walk func(e *jsonschema.ValidationError)
	walk = func(e *jsonschema.ValidationError) {
		if len(e.Causes) == 0 {
			loc := e.InstanceLocation
			if loc == "" {
				loc = "(root)"
			}
			out = append(out, fmt.Sprintf("%s: %s", loc, e.Message))
			return
		}
		for _, c := range e.Causes {
			walk(c)
		}
	}
	walk(ve)
	return out
}
