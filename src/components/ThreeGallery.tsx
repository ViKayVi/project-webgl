"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";

const ThreeGallery = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    slides?: THREE.Mesh[];
    animationId?: number;
    currentPosition: number;
    targetPosition: number;
    isScrolling: boolean;
    autoScrollSpeed: number;
    lastTime: number;
    touchStartX: number;
    touchLastX: number;
    currentDistortionFactor: number;
    targetDistortionFactor: number;
    peakVelocity: number;
    velocityHistory: number[];
    scrollTimeout?: NodeJS.Timeout;
  }>({
    currentPosition: 0,
    targetPosition: 0,
    isScrolling: false,
    autoScrollSpeed: 0,
    lastTime: 0,
    touchStartX: 0,
    touchLastX: 0,
    currentDistortionFactor: 0,
    targetDistortionFactor: 0,
    peakVelocity: 0,
    velocityHistory: [0, 0, 0, 0, 0],
    scrollTimeout: undefined,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const state = sceneRef.current;

    const settings = {
      wheelSensitivity: 0.01,
      touchSensitivity: 0.01,
      momentumMultiplier: 2,
      smoothing: 0.1,
      slideLerp: 0.075,
      distortionDecay: 0.95,
      maxDistortion: 2.5,
      distortionSensitivity: 0.15,
      distortionSmoothing: 0.075,
    };

    const slideWidthHorizontal = 3.0;
    const slideHeightHorizontal = 2.0;
    const slideWidthVertical = 2.0;
    const slideHeightVertical = 3.0;
    const gap = 0.01;
    const slideCount = 47;
    const imagesCount = 47;
    const totalWidth = slideCount * (slideWidthHorizontal + gap);
    const slideUnit = slideWidthHorizontal + gap;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe3e3db);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 5;

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.slides = [];

    const correctImageColor = (texture: THREE.Texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const slidePositions: number[] = [];
    let loadedCount = 0;

    const createSlide = (index: number) => {
      const geometry = new THREE.PlaneGeometry(
        slideWidthHorizontal,
        slideHeightHorizontal,
        32,
        16
      );

      const colors = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F3"];
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[index % colors.length]),
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = index * (slideWidthHorizontal + gap);
      mesh.userData = {
        originalVertices: [...geometry.attributes.position.array],
        index,
      };

      const imageIndex = (index % imagesCount) + 1;
      const imagePath = `/images/${imageIndex}.jpg`;

      new THREE.TextureLoader().load(
        imagePath,
        (texture) => {
          correctImageColor(texture);
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;

          const imgWidth = texture.image.width;
          const imgHeight = texture.image.height;
          const isVertical = imgHeight > imgWidth;

          const slideWidth = isVertical
            ? slideWidthVertical
            : slideWidthHorizontal;
          const slideHeight = isVertical
            ? slideHeightVertical
            : slideHeightHorizontal;

          const newGeometry = new THREE.PlaneGeometry(
            slideWidth,
            slideHeight,
            32,
            16
          );
          mesh.geometry.dispose();
          mesh.geometry = newGeometry;

          mesh.userData.originalVertices = [
            ...newGeometry.attributes.position.array,
          ];

          slidePositions[index] = slideWidth;
          loadedCount++;

          const imgAspect = imgWidth / imgHeight;
          const slideAspect = slideWidth / slideHeight;

          if (Math.abs(imgAspect - slideAspect) > 0.1) {
            if (imgAspect > slideAspect) {
              mesh.scale.y = slideAspect / imgAspect;
            } else {
              mesh.scale.x = imgAspect / slideAspect;
            }
          }
          if (loadedCount === slideCount) {
            repositionAllSlides();
          }
        },
        undefined,
        (err) => console.warn(`Couldn't load image ${imagePath}`, err)
      );

      scene.add(mesh);
      state.slides!.push(mesh);
    };

    const repositionAllSlides = () => {
      let currentX = 0;

      state.slides!.forEach((slide, index) => {
        slide.position.x = currentX;
        slide.userData.targetX = slide.position.x;
        slide.userData.currentX = slide.position.x;

        currentX += slidePositions[index] + gap;
      });

      const totalWidth = currentX - gap;
      state.slides!.forEach((slide) => {
        slide.position.x -= totalWidth / 2;
        slide.userData.targetX = slide.position.x;
        slide.userData.currentX = slide.position.x;
      });
    };
    for (let i = 0; i < slideCount; i++) {
      createSlide(i);
    }

    state.slides.forEach((slide) => {
      slide.position.x -= totalWidth / 2;
      slide.userData.targetX = slide.position.x;
      slide.userData.currentX = slide.position.x;
    });

    const updateCurve = (
      mesh: THREE.Mesh,
      worldPositionX: number,
      distortionFactor: number
    ) => {
      const distortionCenter = new THREE.Vector2(0, 0);
      const distortionRadius = 2.0;
      const maxCurvature = settings.maxDistortion * distortionFactor;

      const positionAttribute = mesh.geometry.attributes.position;
      const originalVertices = mesh.userData.originalVertices;

      for (let i = 0; i < positionAttribute.count; i++) {
        const x = originalVertices[i * 3];
        const y = originalVertices[i * 3 + 1];

        const vertexWorldPosX = worldPositionX + x;
        const distFromCenter = Math.sqrt(
          Math.pow(vertexWorldPosX - distortionCenter.x, 2) +
            Math.pow(y - distortionCenter.y, 2)
        );

        const distortionStrength = Math.max(
          0,
          1 - distFromCenter / distortionRadius
        );
        const curveZ =
          Math.pow(Math.sin((distortionStrength * Math.PI) / 2), 1.5) *
          maxCurvature;

        positionAttribute.setZ(i, curveZ);
      }

      positionAttribute.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        state.targetPosition += slideUnit;
        state.targetDistortionFactor = Math.min(
          1.0,
          state.targetDistortionFactor + 0.3
        );
      } else if (e.key === "ArrowRight") {
        state.targetPosition -= slideUnit;
        state.targetDistortionFactor = Math.min(
          1.0,
          state.targetDistortionFactor + 0.3
        );
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const wheelStrength = Math.abs(e.deltaY) * 0.001;
      state.targetDistortionFactor = Math.min(
        1.0,
        state.targetDistortionFactor + wheelStrength
      );

      state.targetPosition -= e.deltaY * settings.wheelSensitivity;
      state.isScrolling = true;
      state.autoScrollSpeed =
        Math.min(Math.abs(e.deltaY) * 0.0005, 0.05) * Math.sign(e.deltaY);

      clearTimeout(state.scrollTimeout);
      state.scrollTimeout = setTimeout(() => {
        state.isScrolling = false;
      }, 150);
    };

    const handleTouchStart = (e: TouchEvent) => {
      state.touchStartX = e.touches[0].clientX;
      state.touchLastX = state.touchStartX;
      state.isScrolling = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchX = e.touches[0].clientX;
      const deltaX = touchX - state.touchLastX;
      state.touchLastX = touchX;

      const touchStrength = Math.abs(deltaX) * 0.02;
      state.targetDistortionFactor = Math.min(
        1.0,
        state.targetDistortionFactor + touchStrength
      );

      state.targetPosition -= deltaX * settings.touchSensitivity;
      state.isScrolling = true;
    };

    const handleTouchEnd = () => {
      const velocity = (state.touchLastX - state.touchStartX) * 0.005;
      if (Math.abs(velocity) > 0.5) {
        state.autoScrollSpeed = -velocity * settings.momentumMultiplier * 0.05;
        state.targetDistortionFactor = Math.min(
          1.0,
          Math.abs(velocity) * 3 * settings.distortionSensitivity
        );
        state.isScrolling = true;
        setTimeout(() => {
          state.isScrolling = false;
        }, 800);
      }
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = (time: number) => {
      state.animationId = requestAnimationFrame(animate);

      const deltaTime = state.lastTime ? (time - state.lastTime) / 1000 : 0.016;
      state.lastTime = time;

      const prevPos = state.currentPosition;

      if (state.isScrolling) {
        state.targetPosition += state.autoScrollSpeed;
        const speedBasedDecay = 0.97 - Math.abs(state.autoScrollSpeed) * 0.5;
        state.autoScrollSpeed *= Math.max(0.92, speedBasedDecay);

        if (Math.abs(state.autoScrollSpeed) < 0.001) {
          state.autoScrollSpeed = 0;
        }
      }

      state.currentPosition +=
        (state.targetPosition - state.currentPosition) * settings.smoothing;

      const currentVelocity =
        Math.abs(state.currentPosition - prevPos) / deltaTime;
      state.velocityHistory.push(currentVelocity);
      state.velocityHistory.shift();

      const avgVelocity =
        state.velocityHistory.reduce((sum, val) => sum + val, 0) /
        state.velocityHistory.length;

      if (avgVelocity > state.peakVelocity) {
        state.peakVelocity = avgVelocity;
      }

      const velocityRatio = avgVelocity / (state.peakVelocity + 0.001);
      const isDecelerating = velocityRatio < 0.7 && state.peakVelocity > 0.5;

      state.peakVelocity *= 0.99;

      const movementDistortion = Math.min(1.0, currentVelocity * 0.1);
      if (currentVelocity > 0.05) {
        state.targetDistortionFactor = Math.max(
          state.targetDistortionFactor,
          movementDistortion
        );
      }

      if (isDecelerating || avgVelocity < 0.2) {
        const decayRate = isDecelerating
          ? settings.distortionDecay
          : settings.distortionDecay * 0.9;
        state.targetDistortionFactor *= decayRate;
      }

      state.currentDistortionFactor +=
        (state.targetDistortionFactor - state.currentDistortionFactor) *
        settings.distortionSmoothing;

      state.slides!.forEach((slide, i) => {
        let baseX = i * slideUnit - state.currentPosition;
        baseX = ((baseX % totalWidth) + totalWidth) % totalWidth;

        if (baseX > totalWidth / 2) {
          baseX -= totalWidth;
        }

        const isWrapping =
          Math.abs(baseX - slide.userData.targetX) > slideWidthHorizontal * 2;
        if (isWrapping) {
          slide.userData.currentX = baseX;
        }

        slide.userData.targetX = baseX;
        slide.userData.currentX +=
          (slide.userData.targetX - slide.userData.currentX) *
          settings.slideLerp;

        const wrapThreshold = totalWidth / 2 + slideWidthHorizontal;
        if (Math.abs(slide.userData.currentX) < wrapThreshold * 1.5) {
          slide.position.x = slide.userData.currentX;
          updateCurve(slide, slide.position.x, state.currentDistortionFactor);
        }
      });

      renderer.render(scene, camera);
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("resize", handleResize);

    animate(performance.now());

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", handleResize);

      if (state.animationId) {
        cancelAnimationFrame(state.animationId);
      }

      state.slides?.forEach((slide) => {
        slide.geometry.dispose();
        if (slide.material instanceof THREE.Material) {
          slide.material.dispose();
        }
        scene.remove(slide);
      });

      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-screen" />;
};

export default ThreeGallery;
