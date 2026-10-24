/*
 * NV3007 (2.79", 142x428) on the JSConf México 2026 badge.
 *
 * The NV3007 speaks the same MIPI-DCS window/RAM commands (2A/2B/2C/36/3A) as
 * the ILI9341 family, so Moddable's generic ili9341 SPI driver is reused.
 * The panel-specific part is the init register list in ./manifest.json.
 */
import ILI9341 from "ili9341";
export default ILI9341;
