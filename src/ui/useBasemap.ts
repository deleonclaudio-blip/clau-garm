import { useCallback, useEffect, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const FILE = "base_uruguay.pmtiles";
const target = () => `${FileSystem.documentDirectory}${FILE}`;

export interface BasemapState {
  /** Absolute file URI of the local PMTiles, or null if not installed yet. */
  uri: string | null;
  loading: boolean;
  /** Let the user pick the .pmtiles once; it is copied into app storage. */
  importBasemap: () => Promise<void>;
}

/** Resolves the offline base map. The PMTiles lives in the app's document
 * directory (installed once, then used offline), matching the region-pack
 * download model. Until it is there, uri is null and the map uses the neutral
 * fallback — the aeronautical layers still draw. */
export function useBasemap(): BasemapState {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      if (!FileSystem.documentDirectory) { setUri(null); return; }
      const info = await FileSystem.getInfoAsync(target());
      setUri(info.exists ? target() : null);
    } catch {
      setUri(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const importBasemap = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      // pmtiles has no registered MIME type; accept anything and let the user pick.
      type: "*/*",
    });
    if (res.canceled || !res.assets?.[0]) return;
    const src = res.assets[0].uri;
    try {
      const existing = await FileSystem.getInfoAsync(target());
      if (existing.exists) await FileSystem.deleteAsync(target(), { idempotent: true });
      await FileSystem.copyAsync({ from: src, to: target() });
      await check();
    } catch {
      setUri(null);
    }
  }, [check]);

  return { uri, loading, importBasemap };
}
