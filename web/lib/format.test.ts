// run with: bun test
import { describe, it, expect } from 'bun:test'
import { num, inr, detectSource, derivePassword, valid } from './format'

describe('num', () => {
  it('parses lakh-comma amounts (the ₹1,50,000 → ₹1 bug)', () => {
    expect(num('1,50,000')).toBe(150000)
    expect(num('₹ 1,000')).toBe(1000)
    expect(num('45000')).toBe(45000)
    expect(num('12.5')).toBe(12.5)
  })
  it('never returns negative or junk', () => {
    expect(num('-500')).toBe(0)
    expect(num('abc')).toBe(0)
    expect(num('')).toBe(0)
    expect(num('1e309')).toBe(0) // Infinity is not money
  })
})

describe('inr', () => {
  it('formats with indian grouping and kills negative zero', () => {
    expect(inr(146000)).toBe('₹1,46,000')
    expect(inr(-0)).toBe('₹0')
    expect(inr(-51000)).toBe('₹-51,000')
  })
})

describe('detectSource', () => {
  it('spots an AIS by its markers', () => {
    expect(detectSource('Annual Information Statement (AIS)')).toBe('AIS')
    expect(detectSource('... PART B1 ...')).toBe('AIS')
    expect(detectSource('{"code":"SFT-014"}')).toBe('AIS')
  })
  it('defaults to 26AS', () => {
    expect(detectSource('FORM 26AS Annual Tax Statement')).toBe('26AS')
    expect(detectSource('')).toBe('26AS')
  })
})

describe('derivePassword', () => {
  it('builds pan(lower) + ddmmyyyy from the date input value', () => {
    expect(derivePassword('ABCDE1234F', '1995-01-01')).toBe('abcde1234f01011995')
    expect(derivePassword('zzzzz9999z', '2000-12-31')).toBe('zzzzz9999z31122000')
  })
})

describe('valid (mirrors the official schema patterns)', () => {
  it('ifsc', () => {
    expect(valid.ifsc('HDFC0001234')).toBe(true)
    expect(valid.ifsc('hdfc0001234')).toBe(false) // lowercase rejected — portal wants caps
    expect(valid.ifsc('HDFC1001234')).toBe(false) // 5th char must be 0
  })
  it('pin rejects leading zero, mobile wants 10 digits', () => {
    expect(valid.pin('560038')).toBe(true)
    expect(valid.pin('056003')).toBe(false)
    expect(valid.mobile('9876543210')).toBe(true)
    expect(valid.mobile('0876543210')).toBe(false)
  })
  it('aadhaar is optional but strict when given', () => {
    expect(valid.aadhaar('')).toBe(true)
    expect(valid.aadhaar('234567890123')).toBe(true)
    expect(valid.aadhaar('1234')).toBe(false)
  })
  it('account and dob and email', () => {
    expect(valid.account('50100123456789')).toBe(true)
    expect(valid.account('12ab34')).toBe(false)
    expect(valid.dob('1994-06-15')).toBe(true)
    expect(valid.dob('15-06-1994')).toBe(false)
    expect(valid.email('a.b@x.co.in')).toBe(true)
    expect(valid.email('nope')).toBe(false)
  })
})
