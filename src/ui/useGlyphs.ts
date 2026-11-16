import { useEffect, useState } from "react";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

// Offline glyph ranges bundled with the app (data/make glyphs). Stored under a
// no-space font name so the file:// template needs no URL-encoding; the style
// sets text-font "NotoSans" to match.
const RANGES: Record<string, number> = {
  "0-255": require("../../assets/glyphs/NotoSans/0-255.pbf"),
  "256-511": require("../../assets/glyphs/NotoSans/256-511.pbf"),
  "8192-8447": require("../../assets/glyphs/NotoSans/8192-8447.pbf"),
};

export const GLYPH_FONT = "NotoSans";

/** Ensures the bundled glyph PBFs are laid out under the app document directory
 * as glyphs/NotoSans/{range}.pbf, and returns a file:// glyphs template for the
 * MapLibre style. Returns null until ready (labels then just don't draw). */
export function useGlyphs(): string | null {
  const [tmpl, setTmpl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const dir = `${FileSystem.documentDirectory}glyphs/${GLYPH_FONT}`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        for (const [range, mod] of Object.entries(RANGES)) {
          const dest = `${dir}/${range}.pbf`;
          const info = await FileSystem.getInfoAsync(dest);
          if (info.exists) continue;
          const asset = Asset.fromModule(mod);
          await asset.downloadAsync();
          if (asset.localUri) await FileSystem.copyAsync({ from: asset.localUri, to: dest });
        }
        if (alive) {
          setTmpl(`${FileSystem.documentDirectory}glyphs/${GLYPH_FONT}/{range}.pbf`);
        }
      } catch {
        if (alive) setTmpl(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  return tmpl;
}
