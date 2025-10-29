import React from "react";
import useWebCursor from "../hooks/useWebCursor";
import CURSOR_MAP from "../theme/cursorMap";
import CursorStarTrail from "./CursorStarTrail";

export default function RootCursorLayer() {
  useWebCursor(CURSOR_MAP.default, { hotSpot: [0, 0] });
  return <CursorStarTrail />;
}
