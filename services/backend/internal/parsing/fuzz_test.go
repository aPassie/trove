// fuzz target — run long with: go test -fuzz=FuzzParseAny ./internal/parsing
package parsing

import "testing"

func FuzzParseAny(f *testing.F) {
	f.Add("FORM 26AS\n1 ACME BLRA12345C 4,50,000.00 45,000.00 45,000.00\n↳ Section: 194J")
	f.Add(`{"infoCode":"194J","amountReceived":770000,"taxDeducted":77000}`)
	f.Add("PART B1 ANNUAL INFORMATION STATEMENT SFT-014 Sale of immovable property 45,00,000.00")
	f.Add("")
	f.Add("\x00\xff{[[[")
	f.Fuzz(func(t *testing.T, input string) {
		if len(input) > 1<<22 {
			t.Skip()
		}
		st := ParseAny(input)
		if st == nil {
			t.Fatal("ParseAny returned nil")
		}
		for _, e := range st.Entries {
			if e.TaxAmount < 0 || e.AmountPaid < 0 {
				t.Fatalf("parser produced negative amounts: %+v", e)
			}
		}
	})
}
