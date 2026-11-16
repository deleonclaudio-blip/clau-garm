// Display conversions. Storage is SI; the HUD and labels convert here.
// A unit bug in an EFB is a safety bug — keep these in one place and tested.

export const MS_TO_KT = 1.943844;
export const M_TO_FT = 3.28084;

export const metresToFeet = (m: number) => m * M_TO_FT;
export const msToKnots = (ms: number) => ms * MS_TO_KT;

/** True track (GPS course, degrees true) to magnetic, given variation in
 * degrees where WEST is negative (as published in the Uruguay AIP, e.g. -12).
 * Magnetic = True - Variation  (West variation subtracts → adds magnitude). */
export function trueToMagnetic(trueDeg: number, variationDeg: number): number {
  return (((trueDeg - variationDeg) % 360) + 360) % 360;
}

/** Uruguay magnetic variation is roughly -12° (12°W) near Montevideo and grows
 * to ~-15° in the north-east. Use the nearest aerodrome's mag_var when known;
 * this is the fallback. Must be shown as advisory, not primary. */
export const UY_DEFAULT_MAGVAR = -12;

export const fmtAlt = (ft: number) => `${Math.round(ft).toLocaleString("en-US")} ft`;
export const fmtGs = (kt: number) => `${Math.round(kt)} kt`;
export const fmtHdg = (deg: number) => `${String(Math.round(deg) % 360).padStart(3, "0")}°`;
