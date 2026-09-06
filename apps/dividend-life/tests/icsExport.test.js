/* eslint-env jest */
import { buildIcsEvent } from '../src/utils/icsExport';

describe('buildIcsEvent', () => {
  const nextPayment = {
    stock_id: '0050',
    stock_name: '元大台灣50',
    dividend: 2,
    quantity: 500,
    total: 1000,
    date: '2026-09-15',
    daysUntil: 9,
  };

  test('produces a valid VCALENDAR/VEVENT structure with the correct all-day date', () => {
    const ics = buildIcsEvent(nextPayment, 'zh');
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260915\r\n');
    expect(ics).toContain('END:VEVENT\r\n');
    expect(ics).toMatch(/END:VCALENDAR\r?\n?$/);
  });

  test('includes the stock id in the zh summary line', () => {
    const ics = buildIcsEvent(nextPayment, 'zh');
    expect(ics).toContain('SUMMARY:0050 配息入帳');
  });

  test('includes the stock id in the en summary line', () => {
    const ics = buildIcsEvent(nextPayment, 'en');
    expect(ics).toContain('SUMMARY:0050 dividend payment');
  });

  test('each UID is unique per stock and date', () => {
    const icsA = buildIcsEvent(nextPayment, 'zh');
    const icsB = buildIcsEvent({ ...nextPayment, stock_id: '00878', date: '2026-09-20' }, 'zh');
    const uidA = icsA.match(/UID:(.+)\r\n/)[1];
    const uidB = icsB.match(/UID:(.+)\r\n/)[1];
    expect(uidA).not.toBe(uidB);
  });
});
