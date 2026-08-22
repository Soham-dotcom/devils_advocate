"use client";

/* eslint-disable react/no-unknown-property */
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The case, being turned over and examined.
 *
 * A wireframe solid rotating inside a shell of orbiting points: the document
 * under inspection, with the agents circling it. It is deliberately abstract —
 * a literal gavel or scales would be kitsch, and this reads as scrutiny rather
 * than adjudication, which is what the pipeline actually does.
 *
 * `progress` (0..1) drives the whole scene: the solid tightens and brightens as
 * stages complete, so the animation reports real state instead of just looping.
 */

const SAFFRON = new THREE.Color("#E0A33C");
const APPELLANT = new THREE.Color("#8FA9CE");
const RESPONDENT = new THREE.Color("#C98B72");

function CaseSolid({ progress }: { progress: number }) {
  const outer = useRef<THREE.LineSegments>(null);
  const inner = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.55, 1), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const innerGeo = useMemo(() => new THREE.IcosahedronGeometry(0.92, 0), []);

  useFrame((state, delta) => {
    if (outer.current) {
      outer.current.rotation.y += delta * 0.22;
      outer.current.rotation.x += delta * 0.09;
      // Tightens as the analysis advances.
      const s = 1 - progress * 0.16;
      outer.current.scale.setScalar(s);
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.35;
      inner.current.rotation.z += delta * 0.12;
      const t = state.clock.elapsedTime;
      inner.current.scale.setScalar(0.86 + Math.sin(t * 1.4) * 0.045 + progress * 0.2);
    }
  });

  return (
    <group>
      <lineSegments ref={outer} geometry={edges}>
        <lineBasicMaterial
          color={SAFFRON}
          transparent
          opacity={0.28 + progress * 0.4}
        />
      </lineSegments>

      <mesh ref={inner} geometry={innerGeo}>
        <meshBasicMaterial
          color={SAFFRON}
          wireframe
          transparent
          opacity={0.14 + progress * 0.22}
        />
      </mesh>
    </group>
  );
}

/** Two counter-rotating rings — the two sides circling the same record. */
function Advocates({ progress }: { progress: number }) {
  const a = useRef<THREE.Points>(null);
  const b = useRef<THREE.Points>(null);

  const ring = (count: number, radius: number, jitter: number) => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = (Math.random() - 0.5) * jitter;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  };

  const ringA = useMemo(() => ring(120, 2.5, 0.35), []);
  const ringB = useMemo(() => ring(120, 3.1, 0.55), []);

  useFrame((_, delta) => {
    if (a.current) {
      a.current.rotation.y += delta * 0.16;
      a.current.rotation.x = 0.32;
    }
    if (b.current) {
      b.current.rotation.y -= delta * 0.11;
      b.current.rotation.x = -0.24;
    }
  });

  return (
    <group>
      <points ref={a}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringA, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={APPELLANT}
          size={0.045}
          transparent
          opacity={0.5 + progress * 0.3}
          sizeAttenuation
        />
      </points>

      <points ref={b}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringB, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={RESPONDENT}
          size={0.04}
          transparent
          opacity={0.42 + progress * 0.3}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/** Slow parallax drift so the scene never sits perfectly still. */
function Drift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.16) * 0.5;
    state.camera.position.y = Math.cos(t * 0.12) * 0.32;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export function AnalysisScene({ progress }: { progress: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      // Decorative: the stage list beside it carries the actual status.
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 6.2], fov: 46 }}
        gl={{ antialias: true, alpha: true }}
        // debounce:0 so the first measurement lands immediately. r3f sizes the
        // canvas from a ResizeObserver on its container; if that container is
        // measured at 0x0 the canvas sticks at its 300x150 default until the
        // next resize event.
        style={{ width: "100%", height: "100%", display: "block" }}
        resize={{ debounce: 0, scroll: false }}
      >
        <CaseSolid progress={progress} />
        <Advocates progress={progress} />
        <Drift />
      </Canvas>
    </div>
  );
}
