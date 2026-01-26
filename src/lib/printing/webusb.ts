/**
 * WebUSB printing (client-side)
 *
 * Best-effort untuk printer thermal via USB.
 * Kompatibilitas sangat tergantung model/printer (interface/endpoint).
 *
 * NOTE: Type WebUSB tidak selalu tersedia di TS config, jadi kita pakai any.
 */

export async function printViaWebUsb(data: Uint8Array): Promise<void> {
  const navAny = navigator as any;
  if (!navAny.usb) {
    throw new Error('WebUSB tidak didukung di browser ini.');
  }

  // Banyak printer tidak expose filter standar yang mudah; gunakan tanpa filter (user pilih manual).
  const device = await navAny.usb.requestDevice({ filters: [] });

  await device.open();
  try {
    if (device.configuration == null) {
      await device.selectConfiguration(1);
    }

    // Cari interface yang punya endpoint OUT
    const config = device.configuration;
    let found: { interfaceNumber: number; endpointNumber: number } | null = null;

    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        const outEp = alt.endpoints?.find((e: any) => e.direction === 'out');
        if (outEp) {
          found = { interfaceNumber: iface.interfaceNumber, endpointNumber: outEp.endpointNumber };
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      throw new Error('Tidak menemukan endpoint OUT pada perangkat USB ini.');
    }

    await device.claimInterface(found.interfaceNumber);
    try {
      await device.transferOut(found.endpointNumber, data);
    } finally {
      try {
        await device.releaseInterface(found.interfaceNumber);
      } catch {
        // ignore
      }
    }
  } finally {
    try {
      await device.close();
    } catch {
      // ignore
    }
  }
}

