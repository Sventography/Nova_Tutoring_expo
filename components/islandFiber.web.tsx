import React, { useEffect, useState } from "react";
import { Canvas as WebCanvas } from "@react-three/fiber";
import { WebGLRenderer, type WebGLRendererParameters } from "three";

export { useFrame, useThree } from "@react-three/fiber";

type CanvasProps = Omit<React.ComponentProps<typeof WebCanvas>, "gl"> & {
  gl?: WebGLRendererParameters;
};

export function Canvas({ gl, ...props }: CanvasProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => setReady(true), []);

  if (error) throw error;
  if (!ready) return null;

  return (
    <WebCanvas
      {...props}
      gl={(defaults) => {
        try {
          return new WebGLRenderer({ ...defaults, ...gl });
        } catch (cause) {
          setError(cause instanceof Error ? cause : new Error(String(cause)));
          // The error boundary unmounts the Canvas. Leave Fiber's setup pending
          // so a failed renderer cannot start its render loop.
          return new Promise<never>(() => {});
        }
      }}
    />
  );
}
