// ESC/POS byte command builder for thermal printers.
// Port of ticket_printer/ticket_printer/printer.py to TypeScript.

const ESC = 0x1b;

type Alignment = 'left' | 'center' | 'right';
const ALIGN_MAP: Record<Alignment, number> = { left: 0, center: 1, right: 2 };

interface TextModeOptions {
  doubleHeight?: boolean;
  doubleWidth?: boolean;
}

export class ESCPOSBuilder {
  private buffer: number[] = [];

  align(value: Alignment): this {
    this.buffer.push(ESC, 0x61, ALIGN_MAP[value]);
    return this;
  }

  bold(enabled: boolean): this {
    this.buffer.push(ESC, 0x45, enabled ? 1 : 0);
    return this;
  }

  textMode(opts: TextModeOptions): this {
    let mode = 0x00;
    if (opts.doubleHeight) mode |= 0x10;
    if (opts.doubleWidth) mode |= 0x20;
    this.buffer.push(ESC, 0x21, mode);
    return this;
  }

  text(str: string): this {
    const bytes = new TextEncoder().encode(str);
    for (const b of bytes) this.buffer.push(b);
    return this;
  }

  textln(str: string): this {
    return this.text(str).newline();
  }

  newline(): this {
    this.buffer.push(0x0a);
    return this;
  }

  cut(): this {
    this.buffer.push(ESC, 0x69);
    return this;
  }

  cashDrawerKick(): this {
    this.buffer.push(ESC, 0x70, 0x02, 0x19, 0x19);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// --- High-level formatting functions ---

export interface TicketStubData {
  uuid: string;
  film_title: string;
  starts_at: string; // ISO 8601
  screen_name: string;
  ticket_type_name: string;
  price_paid: string;
  cinema_name: string;
}

export interface ReceiptData {
  cinema_name: string;
  payment_method: string;
  total_amount: string;
  tax_total: string;
  tickets: { ticket_type_name: string; quantity: number; price_paid: string }[];
  concession_items: { name: string; quantity: number; subtotal: string; total: string }[];
}

function formatShowtime(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const date = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    return { date, time };
  } catch {
    return { date: '', time: isoString };
  }
}

const SEPARATOR = '-'.repeat(30);

export function buildTicketStub(data: TicketStubData): Uint8Array {
  const { date, time } = formatShowtime(data.starts_at);
  const b = new ESCPOSBuilder();

  b.align('center').textln(SEPARATOR);

  // Cinema name — bold, double height
  b.align('center').bold(true).textMode({ doubleHeight: true });
  b.textln(data.cinema_name.toUpperCase());

  // Film title — bold, double height + width (largest)
  b.align('center').bold(true).textMode({ doubleHeight: true, doubleWidth: true });
  b.textln(data.film_title.toUpperCase());

  // Date + time — double height
  b.bold(false).textMode({ doubleHeight: true }).align('center');
  b.textln(`${date} ${time}`);

  // Screen — double height
  b.align('center').textMode({ doubleHeight: true });
  b.textln(data.screen_name);

  // Ticket type — bold, normal size
  b.textMode({}).align('center').bold(true);
  b.textln(`Admit One - ${data.ticket_type_name}`);

  // UUID and footer
  b.bold(false).align('center');
  b.textln(SEPARATOR);
  b.textln(data.uuid);
  b.textln(SEPARATOR);

  b.newline().newline().newline().newline();
  b.cut();
  return b.build();
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const b = new ESCPOSBuilder();

  // Header
  b.align('center').bold(true).textMode({ doubleHeight: true });
  b.textln(data.cinema_name.toUpperCase());
  b.textMode({}).bold(false);
  b.textln('RECEIPT');
  b.textln(SEPARATOR);

  // Items (show pre-tax prices)
  b.align('left');
  for (const t of data.tickets) {
    b.textln(`${t.quantity}x ${t.ticket_type_name}  $${t.price_paid}`);
  }
  for (const c of data.concession_items) {
    b.textln(`${c.quantity}x ${c.name}  $${c.subtotal}`);
  }

  // Subtotal, tax, total
  b.textln(SEPARATOR);
  const subtotal = (parseFloat(data.total_amount) - parseFloat(data.tax_total)).toFixed(2);
  b.textln(`Subtotal: $${subtotal}`);
  if (parseFloat(data.tax_total) > 0) {
    b.textln(`Tax: $${data.tax_total}`);
  }
  b.bold(true);
  b.textln(`TOTAL: $${data.total_amount}`);
  b.bold(false);
  b.textln(`Paid: ${data.payment_method}`);
  b.textln(SEPARATOR);

  b.align('center');
  b.textln('Thank you!');

  b.newline().newline().newline().newline();
  b.cut();
  return b.build();
}

export function buildCashDrawerKick(): Uint8Array {
  return new ESCPOSBuilder().cashDrawerKick().build();
}
