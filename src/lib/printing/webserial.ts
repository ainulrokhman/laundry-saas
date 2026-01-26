/**
 * WebSerial printing (client-side)
 *
 * Berjalan di Chrome/Edge desktop dengan izin Serial.
 * Banyak printer thermal expose sebagai Serial/COM via adaptor.
 *
 * NOTE: Type WebSerial tidak selalu tersedia di TS config, jadi kita pakai any.
 */

export async function printViaWebSerial(
  data: Uint8Array,
  options?: {
    baudRate?: number;
  }
): Promise<void> {
  const navAny = navigator as any;
  if (!navAny.serial) {
    throw new Error('WebSerial tidak didukung di browser ini.');
  }

  const baudRate = options?.baudRate ?? 9600;
  const port = await navAny.serial.requestPort();

  try {
    await port.open({ baudRate });

    if (!port.writable) {
      throw new Error('Port serial tidak writable.');
    }

    const writer = port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  } finally {
    try {
      await port.close();
    } catch {
      // ignore
    }
  }
}

