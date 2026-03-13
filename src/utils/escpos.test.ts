import { describe, it, expect } from 'vitest';
import { ESCPOSBuilder, buildTicketStub, buildReceipt, buildCashDrawerKick } from './escpos';

describe('ESCPOSBuilder', () => {
  it('generates center alignment bytes', () => {
    const bytes = new ESCPOSBuilder().align('center').build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x61, 0x01]));
  });

  it('generates bold on/off bytes', () => {
    const on = new ESCPOSBuilder().bold(true).build();
    expect(on).toEqual(new Uint8Array([0x1b, 0x45, 0x01]));
    const off = new ESCPOSBuilder().bold(false).build();
    expect(off).toEqual(new Uint8Array([0x1b, 0x45, 0x00]));
  });

  it('generates text mode bytes for double height', () => {
    const bytes = new ESCPOSBuilder().textMode({ doubleHeight: true }).build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x21, 0x10]));
  });

  it('generates text mode bytes for double width + height', () => {
    const bytes = new ESCPOSBuilder().textMode({ doubleHeight: true, doubleWidth: true }).build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x21, 0x30]));
  });

  it('resets text mode', () => {
    const bytes = new ESCPOSBuilder().textMode({}).build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x21, 0x00]));
  });

  it('encodes text as bytes with newline', () => {
    const bytes = new ESCPOSBuilder().textln('Hi').build();
    const expected = new Uint8Array([0x48, 0x69, 0x0a]); // "Hi\n"
    expect(bytes).toEqual(expected);
  });

  it('generates cut command', () => {
    const bytes = new ESCPOSBuilder().cut().build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x69]));
  });

  it('generates cash drawer kick', () => {
    const bytes = new ESCPOSBuilder().cashDrawerKick().build();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x70, 0x02, 0x19, 0x19]));
  });
});

describe('buildTicketStub', () => {
  it('produces non-empty byte array with correct structure', () => {
    const bytes = buildTicketStub({
      uuid: 'abc-123',
      film_title: 'Test Movie',
      starts_at: '2026-03-15T19:00:00-05:00',
      screen_name: 'Screen 1',
      ticket_type_name: 'Adult',
      price_paid: '10.00',
      cinema_name: 'Test Cinema',
    });
    expect(bytes.length).toBeGreaterThan(0);
    // Should end with cut command (0x1b 0x69)
    expect(bytes[bytes.length - 2]).toBe(0x1b);
    expect(bytes[bytes.length - 1]).toBe(0x69);
  });
});

describe('buildReceipt', () => {
  it('produces non-empty byte array', () => {
    const bytes = buildReceipt({
      cinema_name: 'Test Cinema',
      payment_method: 'CASH',
      total_amount: '25.00',
      tickets: [{ ticket_type_name: 'Adult', quantity: 2, price_paid: '10.00' }],
      concession_items: [{ name: 'Popcorn', quantity: 1, total: '5.00' }],
    });
    expect(bytes.length).toBeGreaterThan(0);
  });
});

describe('buildCashDrawerKick', () => {
  it('returns cash drawer command bytes', () => {
    const bytes = buildCashDrawerKick();
    expect(bytes).toEqual(new Uint8Array([0x1b, 0x70, 0x02, 0x19, 0x19]));
  });
});
