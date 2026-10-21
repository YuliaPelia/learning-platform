"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  DirectionalLight,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  TorusGeometry,
  WebGLRenderer,
  type BufferGeometry,
} from "three";

/**
 * 3D-орбіта для hero: напівпрозорі геометричні фігури плавають навколо картки прогресу.
 * Прозорий canvas лежить під карткою; сцена рухається за курсором, зупиняється поза екраном
 * і не анімується при prefers-reduced-motion (малюється один кадр).
 */
const SHAPES: { geo: () => BufferGeometry; color: number; angle: number; r: number; y: number; scale: number; speed: number }[] = [
  { geo: () => new IcosahedronGeometry(1, 0), color: 0xffffff, angle: 0.3, r: 3.0, y: 1.5, scale: 0.55, speed: 0.6 },
  { geo: () => new TorusGeometry(0.7, 0.22, 16, 40), color: 0xffd1f5, angle: 1.5, r: 3.1, y: -0.6, scale: 0.6, speed: 0.5 },
  { geo: () => new OctahedronGeometry(1, 0), color: 0xd9ccff, angle: 2.6, r: 3.0, y: 1.2, scale: 0.5, speed: 0.7 },
  { geo: () => new DodecahedronGeometry(1, 0), color: 0xffffff, angle: 3.7, r: 3.1, y: -1.5, scale: 0.5, speed: 0.55 },
  { geo: () => new SphereGeometry(1, 24, 24), color: 0xffb6ec, angle: 4.6, r: 2.9, y: 0.4, scale: 0.34, speed: 0.8 },
  { geo: () => new TorusGeometry(0.7, 0.2, 16, 40), color: 0xffffff, angle: 5.5, r: 3.1, y: 1.7, scale: 0.45, speed: 0.65 },
  { geo: () => new SphereGeometry(1, 24, 24), color: 0xc9b8ff, angle: 0.9, r: 3.3, y: -1.9, scale: 0.26, speed: 0.9 },
  { geo: () => new IcosahedronGeometry(1, 0), color: 0xffd1f5, angle: 4.1, r: 3.4, y: 2.1, scale: 0.28, speed: 0.75 },
];

export default function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // WebGL недоступний — hero просто лишається без 3D
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "absolute inset-0 h-full w-full";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 10.5);

    scene.add(new AmbientLight(0xffffff, 1.4));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const glow = new PointLight(0xff7ee6, 40, 14);
    glow.position.set(-3, -2, 3);
    scene.add(glow);

    const orbit = new Group();
    scene.add(orbit);
    const disposables: { dispose(): void }[] = [];
    const items = SHAPES.map((s, i) => {
      const geometry = s.geo();
      const material = new MeshStandardMaterial({
        color: s.color,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
        flatShading: true,
      });
      disposables.push(geometry, material);
      const mesh = new Mesh(geometry, material);
      mesh.scale.setScalar(s.scale);
      orbit.add(mesh);
      return { mesh, s, phase: i * 1.7 };
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;

    const frame = (dt: number) => {
      t += dt;
      tilt.x = MathUtils.lerp(tilt.x, pointer.y * 0.25, 0.05);
      tilt.y = MathUtils.lerp(tilt.y, pointer.x * 0.35, 0.05);
      orbit.rotation.set(tilt.x, tilt.y, 0);
      for (const { mesh, s, phase } of items) {
        const a = s.angle + t * 0.12 * s.speed;
        mesh.position.set(Math.cos(a) * s.r, s.y + Math.sin(t * s.speed + phase) * 0.25, Math.sin(a) * s.r * 0.55);
        mesh.rotation.x += dt * 0.5 * s.speed;
        mesh.rotation.y += dt * 0.7 * s.speed;
      }
      renderer.render(scene, camera);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (visible && !document.hidden) frame(dt);
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return; // блок прихований (мобільна ширина)
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (reduced) frame(0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);

    if (reduced) {
      frame(0.001);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden />;
}
