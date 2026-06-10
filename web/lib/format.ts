// pure helpers for the upload flow, kept here so they're unit-testable

export function num(s: string): number {
  // people type ₹ and lakh commas — strip them or parseFloat stops at the comma
  const n = parseFloat(s.replace(/[,\s₹]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const inr = (n: number) => `₹${(n + 0).toLocaleString('en-IN')}`

export function detectSource(text: string): 'AIS' | '26AS' {
  const t = text.toUpperCase()
  if (t.includes('ANNUAL INFORMATION STATEMENT') || t.includes('PART B1') || t.includes('PART B2') || t.includes('SFT-')) {
    return 'AIS'
  }
  return '26AS'
}

// the AIS/26AS pdf password is pan (lowercase) + dob as ddmmyyyy
export function derivePassword(pan: string, dobISO: string): string {
  const [y, m, d] = dobISO.split('-')
  return `${pan.toLowerCase()}${d}${m}${y}`
}

// field checks for the personal-details form — patterns lifted from the official
// ITR-4 schema, so what we accept here is what the portal accepts there
export const valid = {
  dob: (v: string) => /^[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
  pin: (v: string) => /^[1-9][0-9]{5}$/.test(v),
  mobile: (v: string) => /^[1-9][0-9]{9}$/.test(v),
  email: (v: string) => /^[.a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+([a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+)+$/.test(v),
  ifsc: (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
  account: (v: string) => /^[0-9]{6,20}$/.test(v),
  aadhaar: (v: string) => v === '' || /^[0-9]{12}$/.test(v),
  nonEmpty: (v: string) => v.trim().length > 0
}

// official ITD state codes, straight from the ITR-4 schema's StateCode enum
export const STATE_CODES: [string, string][] = [
  ['01', 'Andaman & Nicobar Islands'], ['02', 'Andhra Pradesh'], ['03', 'Arunachal Pradesh'],
  ['04', 'Assam'], ['05', 'Bihar'], ['06', 'Chandigarh'], ['07', 'Dadra & Nagar Haveli'],
  ['08', 'Daman & Diu'], ['09', 'Delhi'], ['10', 'Goa'], ['11', 'Gujarat'], ['12', 'Haryana'],
  ['13', 'Himachal Pradesh'], ['14', 'Jammu & Kashmir'], ['15', 'Karnataka'], ['16', 'Kerala'],
  ['17', 'Lakshadweep'], ['18', 'Madhya Pradesh'], ['19', 'Maharashtra'], ['20', 'Manipur'],
  ['21', 'Meghalaya'], ['22', 'Mizoram'], ['23', 'Nagaland'], ['24', 'Odisha'],
  ['25', 'Puducherry'], ['26', 'Punjab'], ['27', 'Rajasthan'], ['28', 'Sikkim'],
  ['29', 'Tamil Nadu'], ['30', 'Tripura'], ['31', 'Uttar Pradesh'], ['32', 'West Bengal'],
  ['33', 'Chhattisgarh'], ['34', 'Uttarakhand'], ['35', 'Jharkhand'], ['36', 'Telangana'],
  ['37', 'Ladakh'], ['99', 'Foreign']
]
