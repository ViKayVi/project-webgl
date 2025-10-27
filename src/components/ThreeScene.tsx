"use client";

import { useEffect, useRef } from "react";
import Sketch from "@/classes/Sketch";

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = new Sketch({ domElement: containerRef.current });

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      containerRef.current?.removeChild(sketch.renderer.domElement);
      sketch.renderer.setAnimationLoop(null);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
