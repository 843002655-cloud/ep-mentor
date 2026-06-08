"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

type ViewMode = "normal" | "reentry" | "ablation";

const views: { key: ViewMode; label: string; icon: string }[] = [
  { key: "normal", label: "正常传导", icon: "⚡" },
  { key: "reentry", label: "折返环", icon: "🔄" },
  { key: "ablation", label: "消融线", icon: "🎯" },
];

interface Props { className?: string }

export default function HeartModel({ className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const heartGroupRef = useRef<THREE.Group | null>(null);
  const modeGroupRef = useRef<THREE.Group | null>(null);
  const modeRef = useRef<ViewMode>("normal");
  const [mode, setMode] = useState<ViewMode>("normal");
  const animIdRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const rotRef = useRef({ x: -0.3, y: 0.3 });
  const zoomRef = useRef(5.5);

  // Sync mode to ref for animation loop
  const setModeBoth = useCallback((m: ViewMode) => { modeRef.current = m; setMode(m); }, []);

  // ── Build 3D heart scene ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 1, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer — use lower pixel ratio on mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x404060, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 8, 5);
    scene.add(dir);
    const back = new THREE.DirectionalLight(0x334466, 0.6);
    back.position.set(-3, -2, -3);
    scene.add(back);

    // Heart group
    const heartGroup = new THREE.Group();
    heartGroupRef.current = heartGroup;
    scene.add(heartGroup);

    const matRA = new THREE.MeshPhongMaterial({ color: 0x334155, specular: 0x111111, shininess: 30, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const matLA = new THREE.MeshPhongMaterial({ color: 0x475569, specular: 0x111111, shininess: 30, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const matRV = new THREE.MeshPhongMaterial({ color: 0x1e293b, specular: 0x111111, shininess: 30, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const matLV = new THREE.MeshPhongMaterial({ color: 0x0f172a, specular: 0x111111, shininess: 30, transparent: true, opacity: 0.85, side: THREE.DoubleSide });

    // RA (Right Atrium) — right side, upper
    const raGeo = new THREE.SphereGeometry(0.85, 32, 24);
    const ra = new THREE.Mesh(raGeo, matRA);
    ra.scale.set(1, 0.7, 0.55);
    ra.position.set(0.9, 1.1, 0);
    ra.name = "RA";
    heartGroup.add(ra);

    // LA (Left Atrium) — left side, upper
    const laGeo = new THREE.SphereGeometry(0.8, 32, 24);
    const la = new THREE.Mesh(laGeo, matLA);
    la.scale.set(1, 0.65, 0.6);
    la.position.set(-0.8, 1.15, 0.3);
    la.name = "LA";
    heartGroup.add(la);

    // RV (Right Ventricle) — right, lower
    const rvGeo = new THREE.SphereGeometry(0.9, 32, 24);
    const rv = new THREE.Mesh(rvGeo, matRV);
    rv.scale.set(0.75, 1.1, 0.55);
    rv.position.set(0.85, -0.9, 0);
    rv.name = "RV";
    heartGroup.add(rv);

    // LV (Left Ventricle) — left, lower, thicker wall
    const lvGeo = new THREE.SphereGeometry(0.95, 32, 24);
    const lv = new THREE.Mesh(lvGeo, matLV);
    lv.scale.set(0.8, 1.2, 0.65);
    lv.position.set(-0.8, -0.85, 0.2);
    lv.name = "LV";
    heartGroup.add(lv);

    // Pulmonary Veins (orange tubes into LA)
    const pvMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x331100, specular: 0x222222, shininess: 20 });
    [[-1.35, 1.55, -0.1, 0.3], [-1.5, 1.7, 0.25, 0.25], [-1.45, 1.5, -0.3, 0.28], [-1.6, 1.6, 0.05, 0.22]].forEach(([x, y, z, r]) => {
      const pv = new THREE.Mesh(new THREE.SphereGeometry(r as number, 12, 8), pvMat);
      pv.position.set(x as number, y as number, z as number);
      heartGroup.add(pv);
    });

    // Coronary Sinus (green tube from LA/LV area to RA)
    const csGeo = new THREE.TorusGeometry(0.5, 0.06, 8, 16, Math.PI);
    const cs = new THREE.Mesh(csGeo, new THREE.MeshPhongMaterial({ color: 0x10b981, emissive: 0x002211 }));
    cs.position.set(0, -0.2, 0.6);
    cs.rotation.set(0, 0, Math.PI * 0.8);
    cs.name = "CS";
    heartGroup.add(cs);

    // His Bundle (red dot near AV junction)
    const hisGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const his = new THREE.Mesh(hisGeo, new THREE.MeshPhongMaterial({ color: 0xf43f5e, emissive: 0x330000 }));
    his.position.set(0, 0.15, 0.15);
    his.name = "His";
    heartGroup.add(his);

    // Tricuspid Annulus ring
    const taGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
    const taRing = new THREE.Mesh(taGeo, new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x001122 }));
    taRing.position.set(0.8, -0.05, 0);
    taRing.rotation.x = Math.PI * 0.25;
    taRing.name = "TA";
    heartGroup.add(taRing);

    // Mitral Annulus ring
    const maGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 24);
    const maRing = new THREE.Mesh(maGeo, new THREE.MeshPhongMaterial({ color: 0xa78bfa, emissive: 0x110022 }));
    maRing.position.set(-0.8, -0.1, 0.3);
    maRing.rotation.x = Math.PI * 0.2;
    maRing.name = "MA";
    heartGroup.add(maRing);

    // SVC tube
    const svcGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.6, 12);
    const svc = new THREE.Mesh(svcGeo, matRA);
    svc.position.set(0.9, 1.8, 0);
    heartGroup.add(svc);

    // IVC tube
    const ivcGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.6, 12);
    const ivc = new THREE.Mesh(ivcGeo, matRA);
    ivc.position.set(0.9, -1.8, 0);
    heartGroup.add(ivc);

    // Aorta from LV
    const aoGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.8, 12);
    const ao = new THREE.Mesh(aoGeo, matLV);
    ao.position.set(-0.8, 1.7, 0.1);
    ao.rotation.x = 0.2;
    heartGroup.add(ao);

    // Mode group (conduction paths, reentry, ablation)
    const modeGroup = new THREE.Group();
    modeGroupRef.current = modeGroup;
    heartGroup.add(modeGroup);

    // Grid helper
    const grid = new THREE.PolarGridHelper(3, 24, 16, 64, 0x334155, 0x1e293b);
    grid.position.y = -2.5;
    scene.add(grid);

    // Animation loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      // Update mode group
      modeGroup.clear();
      updateModeGroup(modeGroup, modeRef.current);

      // Apply rotation
      heartGroup.rotation.x = rotRef.current.x;
      heartGroup.rotation.y = rotRef.current.y;

      // Apply camera zoom
      camera.position.z = zoomRef.current;
      camera.lookAt(0, 0.1, 0);

      // Auto-rotate slightly when not dragging
      if (!dragRef.current) {
        rotRef.current.y += 0.001;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver for responsive canvas
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer handlers ──────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    rotRef.current.y += dx * 0.005;
    rotRef.current.x += dy * 0.005;
    rotRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotRef.current.x));
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoomRef.current = Math.max(3, Math.min(10, zoomRef.current + e.deltaY * 0.005));
  }, []);

  return (
    <div className={`bg-[#0a0e1a] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b]">
        <span className="text-sm font-medium text-white font-serif">3D 心脏电生理模型</span>
        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setModeBoth(v.key)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                mode === v.key ? "bg-[#1B4F8A] text-white" : "text-slate-400 hover:text-white hover:bg-[#1e293b]"
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ aspectRatio: "4/3", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t border-[#1e293b] text-xs text-slate-500">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#64748b" }} /> 右心房</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#94a3b8" }} /> 左心房</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#475569" }} /> 右心室</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#334155" }} /> 左心室</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#f59e0b" }} /> 肺静脉</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: "#f43f5e" }} /> His 束</span>
      </div>
    </div>
  );
}

// ── Mode group helper (called from animation loop + mode change) ─
function updateModeGroup(group: THREE.Group, mode: ViewMode) {
  group.clear();

  if (mode === "normal") {
    // Green conduction path from His down through ventricles
    const points = [new THREE.Vector3(0, 0.15, 0.15), new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0.4, -0.7, 0), new THREE.Vector3(0.7, -1.2, 0)];
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.04, 8, false);
    const tube = new THREE.Mesh(tubeGeo, new THREE.MeshPhongMaterial({ color: 0x22c55e, emissive: 0x003300 }));
    group.add(tube);

    // Left branch (LBB)
    const lPoints = [new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(-0.3, -0.6, 0.15), new THREE.Vector3(-0.6, -1, 0.2)];
    const lCurve = new THREE.CatmullRomCurve3(lPoints);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(lCurve, 30, 0.03, 8, false), new THREE.MeshPhongMaterial({ color: 0x22c55e, emissive: 0x002200 })));
  }

  if (mode === "reentry") {
    // Amber reentry loop around tricuspid annulus area
    const points = Array.from({ length: 40 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2;
      const r = 0.55;
      return new THREE.Vector3(0.8 + Math.cos(t) * r, -0.05 + Math.sin(t) * r * 0.3, 0);
    });
    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeo = new THREE.TubeGeometry(curve, 60, 0.05, 8, true);
    const tube = new THREE.Mesh(tubeGeo, new THREE.MeshPhongMaterial({ color: 0xf59e0b, emissive: 0x331100 }));
    group.add(tube);

    // Pulse dot on reentry
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    const angle = (Date.now() / 400) % (Math.PI * 2);
    pulse.position.set(0.8 + Math.cos(angle) * 0.55, -0.05 + Math.sin(angle) * 0.55 * 0.3, 0);
    pulse.name = "pulse";
    group.add(pulse);
  }

  if (mode === "ablation") {
    // CTI ablation line (red dots)
    for (let i = 0; i < 8; i++) {
      const y = -0.3 + i * 0.15;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      dot.position.set(0.55, y, 0.5);
      group.add(dot);
    }
    // Line connecting dots
    const abPoints = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(0.55, -0.3 + i * 0.15, 0.5));
    const abCurve = new THREE.CatmullRomCurve3(abPoints);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(abCurve, 20, 0.02, 6, false), new THREE.MeshBasicMaterial({ color: 0xef4444 })));

    // PVI circles around pulmonary veins
    const pviGeo = new THREE.TorusGeometry(0.4, 0.025, 8, 24);
    const pvi = new THREE.Mesh(pviGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    pvi.position.set(-1.4, 1.6, 0.15);
    group.add(pvi);
  }
}
