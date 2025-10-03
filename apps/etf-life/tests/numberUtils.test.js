import { parseNumeric } from '../src/utils/numberUtils';

describe('parseNumeric', () => {
  it('returns the same number for numeric inputs', () => {
    expect(parseNumeric(1.23)).toBe(1.23);
  });

  it('parses basic numeric strings', () => {
    expect(parseNumeric('0.069')).toBeCloseTo(0.069);
    expect(parseNumeric('  15 ')).toBe(15);
  });

  it('parses numbers with trailing text', () => {
    expect(parseNumeric('0.069元')).toBeCloseTo(0.069);
    expect(parseNumeric('4.5%')).toBeCloseTo(4.5);
  });

  it('parses thousands separators and decimal commas', () => {
    expect(parseNumeric('1,234.56')).toBeCloseTo(1234.56);
    expect(parseNumeric('0,069')).toBeCloseTo(0.069);
    expect(parseNumeric('1,234,567')).toBe(1234567);
    expect(parseNumeric('1.234.567')).toBe(1234567);
    expect(parseNumeric('0,500,000')).toBe(500000);
    expect(parseNumeric('1,23')).toBeCloseTo(1.23);
  });

  it('parses full-width characters', () => {
    expect(parseNumeric('０．７５')).toBeCloseTo(0.75);
    expect(parseNumeric('－０．５')).toBeCloseTo(-0.5);
  });

  it('parses ideographic punctuation used as decimal or thousands separators', () => {
    expect(parseNumeric('0。069')).toBeCloseTo(0.069);
    expect(parseNumeric('1、234')).toBe(1234);
    expect(parseNumeric('0・069')).toBeCloseTo(0.069);
    expect(parseNumeric('0˙069')).toBeCloseTo(0.069);
    expect(parseNumeric('1·234')).toBe(1234);
  });

  it('parses middle-dot variants and thin spaces returned by the API', () => {
    expect(parseNumeric('0⸱069')).toBeCloseTo(0.069);
    expect(parseNumeric('0⸰069')).toBeCloseTo(0.069);
    expect(parseNumeric('0ꞏ069')).toBeCloseTo(0.069);
    expect(parseNumeric('0ᐧ069')).toBeCloseTo(0.069);
    expect(parseNumeric('0᛫069')).toBeCloseTo(0.069);
    expect(parseNumeric('0∘069')).toBeCloseTo(0.069);
    expect(parseNumeric('0ㆍ069')).toBeCloseTo(0.069);
    expect(parseNumeric('0 069')).toBeCloseTo(0.069);
    expect(parseNumeric('1 234')).toBe(1234);
  });

  it('prefers the most meaningful numeric fragment when multiple numbers exist', () => {
    expect(parseNumeric('0.000（含稅0.069）')).toBeCloseTo(0.069);
    expect(parseNumeric('0 (預估 0.068)')).toBeCloseTo(0.068);
    expect(parseNumeric('含息0.000／預計 0.070')).toBeCloseTo(0.07);
    expect(parseNumeric('-0.5 / 0.3')).toBeCloseTo(-0.5);
  });

  it('returns NaN for invalid input', () => {
    expect(Number.isNaN(parseNumeric('not a number'))).toBe(true);
  });
});
