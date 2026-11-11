// Typed theme for the app, re-exported from the design tokens. The values are
// generated into replica/design/theme.ts by replica-design; this is the typed
// import surface the components use. Keep values in sync with tokens.json
// (replica-design owns the source of truth).

export const color = {
  bg: "#0b0f14",
  surface: "#161c24",
  surfaceRaised: "#1e2630",
  border: "#2a333f",
  borderInput: "#6b7684",
  focusRing: "#9aa7b4",
  text: "#e8edf2",
  textMuted: "#9aa7b4",
  accent: "#8a97a4",
  onAccent: "#0b0f14",
  danger: "#f87171",
  success: "#4ade80",
  warning: "#fbbf24",
} as const;

export const mapColor = {
  wxVfr: "#22c55e",
  wxMvfr: "#3b82f6",
  wxIfr: "#ef4444",
  wxLifr: "#d946ef",
  terrainCaution: "#fbbf24",
  terrainWarning: "#ef4444",
  airspace: "#60a5fa",
  ownship: "#ffffff",
  route: "#a855f7",
} as const;

export const space = [0, 4, 8, 12, 16, 24, 32, 48, 64] as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const minTarget = 48;

export const type = {
  xs: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  sm: { fontSize: 15, lineHeight: 20, fontWeight: "400" as const },
  base: { fontSize: 17, lineHeight: 24, fontWeight: "400" as const },
  lg: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const },
  xl: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  data: { fontSize: 22, lineHeight: 26, fontWeight: "600" as const },
} as const;
