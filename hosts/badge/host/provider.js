/*
 * ECMA-419 host provider for the JSConf México 2026 badge.
 * Pins: docs/hardware.md §2.6 (recovered from the stock firmware).
 *
 * Only what Phase 1 needs is declared. Serial is deliberately absent:
 * GPIO 43 (UART0 TX on most S3 boards) is the DOWN button here, and the
 * console runs over native USB-Serial/JTAG instead.
 */
const device = {
	spi: {
		// display bus (SPI2 / FSPI). MISO is not connected.
		display: {
			io: "SPI",
			clock: 12,
			out: 11,
			port: 2
		},
		// LoRa bus, separate from the display. Unused in Phase 1.
		lora: {
			io: "SPI",
			clock: 37,
			in: 36,
			out: 35,
			port: 3
		}
	},
	pin: {
		buttonUp: 40,
		buttonDown: 43,
		buttonSelect: 18,
		buttonBack: 1,
		displayCS: 21,
		displayDC: 9,
		displayReset: 10,
		backlight: 2,
		loraSelect: 38,
		loraReset: 47,
		loraIRQ: 48,
		loraBusy: 39
	}
};

export default device;
