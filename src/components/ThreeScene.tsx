"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene ---
    const scene = new THREE.Scene();

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
      70,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.01,
      10
    );
    camera.position.z = 1;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- Objects ---
    const loadShaders = async () => {
      const vertex = await fetch("/shaders/vertex.glsl").then((res) =>
        res.text()
      );
      const fragment = await fetch("/shaders/fragment.glsl").then((res) =>
        res.text()
      );

      const sphere = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.5, 100, 100),
        new THREE.ShaderMaterial({
          wireframe: true,
          uniforms: {
            time: { value: 1.0 },
            resolution: { value: new THREE.Vector2() },
          },
          vertexShader: vertex,
          fragmentShader: fragment,
        })
      );

      scene.add(sphere);

      let time = 0;
      const animate = () => {
        time += 0.05;
        (sphere.material as THREE.ShaderMaterial).uniforms.time.value = time;

        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate();
    };

    loadShaders();

    // --- Resize handler ---
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-screen" />;
};

export default ThreeScene;
