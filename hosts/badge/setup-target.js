/*
 * Board setup for the JSConf México 2026 badge.
 * Pin numbers: docs/hardware.md §2.6 (recovered from the stock firmware).
 *
 * The LoRa radio sits on its own SPI bus (SCK 37 / MOSI 35 / MISO 36, NSS 38).
 * Phase 1 never touches it; NSS is held high so the radio ignores any bus noise.
 */
import Digital from "embedded:io/digital";

const LORA_NSS = 38;

export default function (done) {
	const nss = new Digital({ pin: LORA_NSS, mode: Digital.Output });
	nss.write(1);
	// keep the pin driven high; the object is intentionally not closed
	globalThis.__loraNss = nss;
	done?.();
}
