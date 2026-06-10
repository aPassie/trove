//go:build js

// wasm build skips schema validation — ci validates the builder instead
package itr

func validate(_ string, _ map[string]any) []string { return nil }
