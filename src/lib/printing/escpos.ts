/**
 * ESC/POS helpers (client-side)
 *
 * Catatan:
 * - Ini versi minimal (best-effort) untuk printer thermal.
 * - Encoding default UTF-8; beberapa printer butuh code page khusus.
 */

export type EscposReceiptLine = {
  left: string;
  right?: string;
};

function encoder(): TextEncoder {
  return new TextEncoder();
}

function bytes(...n: number[]): number[] {
  return n;
}

function textBytes(text: string): number[] {
  return Array.from(encoder().encode(text));
}

export function buildEscposReceipt(payload: {
  lines: EscposReceiptLine[];
  footerLines?: string[];
  cut?: boolean;
}): Uint8Array {
  const out: number[] = [];

  // init
  out.push(...bytes(0x1b, 0x40)); // ESC @

  // default: left align
  out.push(...bytes(0x1b, 0x61, 0x00)); // ESC a 0

  for (const l of payload.lines) {
    const left = (l.left ?? '').toString();
    const right = (l.right ?? '').toString();
    if (right) {
      // Simple two-column: pad left to 32 chars (80mm ~ 42, tapi ini cukup sebagai baseline)
      const leftTrim = left.trimEnd();
      const rightTrim = right.trimStart();
      const maxLeft = 32;
      const paddedLeft = leftTrim.length >= maxLeft ? leftTrim.slice(0, maxLeft) : leftTrim.padEnd(maxLeft, ' ');
      out.push(...textBytes(`${paddedLeft}${rightTrim}\n`));
    } else {
      out.push(...textBytes(`${left}\n`));
    }
  }

  if (payload.footerLines && payload.footerLines.length > 0) {
    out.push(...textBytes('\n'));
    // center align
    out.push(...bytes(0x1b, 0x61, 0x01)); // ESC a 1
    for (const f of payload.footerLines) {
      out.push(...textBytes(`${f}\n`));
    }
    // back to left
    out.push(...bytes(0x1b, 0x61, 0x00));
  }

  out.push(...textBytes('\n\n'));

  if (payload.cut !== false) {
    // full cut
    out.push(...bytes(0x1d, 0x56, 0x01)); // GS V 1
  }

  return new Uint8Array(out);
}

