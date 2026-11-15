import React from "react";
import { Canvas as NativeCanvas } from "@react-three/fiber/native";

export { useFrame, useThree } from "@react-three/fiber/native";

type CanvasProps = React.ComponentProps<typeof NativeCanvas> & {
  dpr?: number | [number, number];
};

export function Canvas(props: CanvasProps) {
  return React.createElement(NativeCanvas, props);
}
