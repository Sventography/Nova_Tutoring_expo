import { useEffect } from "react";
import { Image, Platform } from "react-native";

type Opts = { hotSpot?: [number, number] };

export default function useWebCursor(asset: any, opts: Opts = {}) {
  useEffect(() => {
    if (Platform.OS !== "web" || !asset) return;
    const src = Image.resolveAssetSource(asset)?.uri;
    const [x, y] = opts.hotSpot ?? [0, 0];
    const prev = document.body.style.cursor;
    if (src) {
      document.body.style.cursor = `url("${src}") ${x} ${y}, auto`;
    }
    return () => {
      document.body.style.cursor = prev;
    };
  }, [asset, opts.hotSpot?.[0], opts.hotSpot?.[1]]);
}
