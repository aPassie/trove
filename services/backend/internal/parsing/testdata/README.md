# Statement parser fixtures — drop sample PDFs here

This is where Trove's AIS / Form 26AS parser (M4) is built and tested against
real document layouts. `testdata/` is ignored by the Go toolchain, so files here
won't affect builds.

## What to drop here

For the years we target (AY 2025-26 / AY 2026-27 → **Form 26AS / AIS**, *not*
Form 168, which starts AY 2027-28):

- **Form 26AS** PDF — the tax-credit statement from the e-filing portal / TRACES.
- **AIS (Annual Information Statement)** PDF — the richer statement (TDS/TCS, SFT, etc.).
- A little **variety** helps the parser generalize:
  - one with a **single deductor**, one with **many** deductors;
  - a **194J / 194C mix** (professional + contract);
  - if available, an AIS with **SFT / high-value** rows.

If you only have the **JSON/CSV export** (AIS offers one), include that too — it's
the cleanest ground-truth to validate the PDF parse against.

## Important — use synthetic data only

- **No real PII.** Replace PAN/Aadhaar/name/address with fake values. (The repo's
  redaction layer and the setu-mock guard actively reject real-looking PAN/Aadhaar.)
- These statements are normally **password-protected** (PAN + DOB). Please share
  **unlocked** copies, or note the password — a locked PDF can't be parsed as-is.

## What happens once they're here

1. I build the **deterministic parser** against the real layout (TDS rows:
   deductor, TAN, section, amount, FY; reported income).
2. Wire the **Gemini layout-analyzer fallback** for non-standard docs — with every
   extracted number **re-validated deterministically** (the LLM never finalizes math).
3. Add the **AY-keyed parser switch** (26AS/AIS now; Form 168 slotted in for AY 2027-28+).
4. Hook the **questionnaire → TaxpayerProfile** mapping and flip the orchestrator
   off `setu-mock` behind `DEMO_MODE`.
