"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, ExtrudeGeometry, MathUtils, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene as ThreeScene, type Group, type PointLight, type ShaderMaterial, type Texture } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { placeTribals, type TribalPlacement } from "./tribal-layout";

type Motion = { pointerX: number; pointerY: number };
type Palette = { metal: string; light: string; water: string; waterStrength: number };

const WATER_VERTEX = /* glsl */`
  uniform float uTime, uSize, uPathA, uPathB;
  varying float vGlow;
  void main() {
    vec3 p = position;
    float wave = sin(p.x * 1.1 + uTime * .7) * .05 + sin(p.z * 1.7 - uTime * .9) * .06 + sin((p.x + p.z) * .6 + uTime * .4) * .08;
    p.y += wave;
    float path = exp(-pow(p.x - uPathA, 2.) * 1.1) + exp(-pow(p.x - uPathB, 2.) * 1.1);
    vGlow = clamp(.1 + path * .75 + wave * 1.8, 0., 1.) * smoothstep(-6.5, -2.5, p.z);
    vec4 view = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize / -view.z;
  }
`;
const WATER_FRAGMENT = /* glsl */`
  uniform vec3 uColor;
  uniform float uStrength;
  varying float vGlow;
  void main() {
    float edge = 1. - smoothstep(.2, .5, length(gl_PointCoord - .5));
    if (edge <= 0.) discard;
    gl_FragColor = vec4(uColor, min(edge * vGlow * uStrength, 1.));
  }
`;

function buildGeometry(svg: string) {
  const shapes = new SVGLoader().parse(svg).paths.flatMap((path) => path.toShapes());
  const geometry = new ExtrudeGeometry(shapes, { depth: 90, bevelEnabled: true, bevelThickness: 30, bevelSize: 13, bevelSegments: 6, curveSegments: 12 });
  geometry.center();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const scale = 1 / (box.max.y - box.min.y);
  geometry.scale(scale, scale, scale);
  return geometry;
}

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const isLight = document.documentElement.dataset.theme === "light";
  const token = (name: string) => styles.getPropertyValue(name).trim().slice(0, 7);
  return { metal: isLight ? "#17181f" : "#eceef6", light: token("--accent"), water: token("--text"), waterStrength: isLight ? 2.4 : 1 };
}

function usePalette() {
  const [palette, setPalette] = useState(readPalette);
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return palette;
}

/** A dark photo studio with strip lights: this contrast is what makes metal read as polished. */
function buildStudio() {
  const studio = new ThreeScene();
  studio.background = new Color("#05060a");
  const strips: [number, number, number, number, number, number, Color][] = [
    [0, 6, 0, 16, 3, Math.PI / 2, new Color(14, 14, 15)],
    [-7, 1, 2, 1.6, 12, Math.PI / 2, new Color(11, 11, 13)],
    [7, 0, 1, 1, 12, -Math.PI / 2, new Color(7, 8, 13)],
    [0, -6, 2, 12, 1.2, -Math.PI / 2, new Color(2, 2, 3)],
    [1.6, 1, 8, 1.3, 9, 0, new Color(1.5, 1.5, 1.9)],
    [0, 0, 9, 22, 18, 0, new Color(.17, .175, .21)],
  ];
  for (const [x, y, z, width, height, angle, color] of strips) {
    const strip = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ color, side: DoubleSide }));
    strip.position.set(x, y, z);
    if (Math.abs(x) > 1) strip.rotation.y = angle;
    else if (Math.abs(y) > 1) strip.rotation.x = angle;
    studio.add(strip);
  }
  return studio;
}

function useReflections() {
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => {
    const generator = new PMREMGenerator(gl);
    const studio = buildStudio();
    const result = generator.fromScene(studio, .015).texture;
    generator.dispose();
    studio.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    return result;
  }, [gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Piece({ geometry, reflections, place, phase, spin, color, motion, scroll }: { geometry: BufferGeometry; reflections: Texture; place: TribalPlacement; phase: number; spin: number; color: string; motion: RefObject<Motion>; scroll: RefObject<number> }) {
  const group = useRef<Group>(null);
  useFrame((state, rawDelta) => {
    if (!group.current) return;
    const delta = Math.min(rawDelta, .05);
    const time = state.clock.elapsedTime;
    const { rotation, position } = group.current;
    rotation.y = MathUtils.damp(rotation.y, MathUtils.clamp(Math.sin(time * .32 + phase) * .26 + motion.current.pointerX * .34 + scroll.current * spin, -.62, .62), 3, delta);
    rotation.x = MathUtils.damp(rotation.x, -motion.current.pointerY * .2 + Math.cos(time * .26 + phase) * .06, 3, delta);
    position.y = place.y + Math.sin(time * .55 + phase) * place.height * .025;
  });
  return <group ref={group} position={[place.x, place.y, 0]} scale={place.height}>
    {/* SVG's y axis points down. A negative scale keeps the extrusion's normals right. */}
    <mesh geometry={geometry} scale={[1, -1, 1]}>
      <meshStandardMaterial color={color} metalness={1} roughness={.17} envMap={reflections} envMapIntensity={1} />
    </mesh>
  </group>;
}

function Water({ y, paths, color, strength, compact }: { y: number; paths: [number, number]; color: string; strength: number; compact: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const { width } = useThree((state) => state.viewport);
  const dpr = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => {
    const columns = compact ? 72 : 130;
    const rows = compact ? 34 : 54;
    const positions = new Float32Array(columns * rows * 3);
    const span = Math.max(width * 1.5, 8);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = (row * columns + column) * 3;
        positions[index] = (column / (columns - 1) - .5) * span;
        positions[index + 2] = 1.6 - (row / (rows - 1)) * 8.2;
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    return result;
  }, [compact, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSize: { value: 1 }, uPathA: { value: 0 }, uPathB: { value: 0 }, uColor: { value: new Color() }, uStrength: { value: 1 } }), []);
  useFrame((state) => {
    const current = material.current;
    if (!current) return;
    current.uniforms.uTime.value = state.clock.elapsedTime;
    current.uniforms.uSize.value = (compact ? 16 : 20) * dpr;
    current.uniforms.uPathA.value = paths[0];
    current.uniforms.uPathB.value = paths[1];
    current.uniforms.uColor.value.set(color);
    current.uniforms.uStrength.value = strength;
  });
  return <points geometry={geometry} position={[0, y, 0]} frustumCulled={false}>
    <shaderMaterial ref={material} args={[{ uniforms, vertexShader: WATER_VERTEX, fragmentShader: WATER_FRAGMENT, transparent: true, depthWrite: false }]} />
  </points>;
}

function Scene({ geometries, field, onReady }: { geometries: { reflejo: BufferGeometry; cruz: BufferGeometry }; field: RefObject<HTMLElement | null>; onReady: () => void }) {
  const { width, height } = useThree((state) => state.viewport);
  const palette = usePalette();
  const reflections = useReflections();
  const layout = placeTribals(width, height);
  const motion = useRef<Motion>({ pointerX: 0, pointerY: 0 });
  const target = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const light = useRef<PointLight>(null);
  const frames = useRef(0);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      target.current = { x: event.clientX / window.innerWidth * 2 - 1, y: event.clientY / window.innerHeight * 2 - 1 };
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    motion.current.pointerX = MathUtils.damp(motion.current.pointerX, target.current.x, 4, delta);
    motion.current.pointerY = MathUtils.damp(motion.current.pointerY, target.current.y, 4, delta);
    const rect = field.current?.getBoundingClientRect();
    if (rect) scroll.current = MathUtils.clamp((rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight, -1, 1);
    if (light.current) light.current.position.set(motion.current.pointerX * width * .55, -motion.current.pointerY * height * .55, 2.4);
    frames.current += 1;
    if (frames.current === 2) onReady();
  });

  return <>
    <directionalLight position={[-2, 5, 4]} intensity={1.3} />
    <pointLight ref={light} color={palette.light} intensity={26} distance={9} />
    <Piece geometry={geometries.reflejo} reflections={reflections} place={layout.reflejo} phase={0} spin={.4} color={palette.metal} motion={motion} scroll={scroll} />
    <Piece geometry={geometries.cruz} reflections={reflections} place={layout.cruz} phase={2.1} spin={-.4} color={palette.metal} motion={motion} scroll={scroll} />
    <Water y={layout.waterY} paths={layout.moonPaths} color={palette.water} strength={palette.waterStrength} compact={width < height} />
  </>;
}

/** MANGATA's two tribals in real 3D, over a field of points that moves like water under moonlight. */
export default function TribalCanvas({ field, onReady, onFail }: { field: RefObject<HTMLElement | null>; onReady: () => void; onFail: () => void }) {
  const [geometries, setGeometries] = useState<{ reflejo: BufferGeometry; cruz: BufferGeometry } | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let built: { reflejo: BufferGeometry; cruz: BufferGeometry } | null = null;
    const read = (path: string) => fetch(path).then((response) => {
      if (!response.ok) throw new Error(path);
      return response.text();
    });
    Promise.all([read("/tribals/luna-reflejo.svg"), read("/tribals/sigilo-cruz.svg")]).then(([reflejo, cruz]) => {
      if (cancelled) return;
      built = { reflejo: buildGeometry(reflejo), cruz: buildGeometry(cruz) };
      setGeometries(built);
    }).catch(() => { if (!cancelled) onFail(); });
    return () => {
      cancelled = true;
      built?.reflejo.dispose();
      built?.cruz.dispose();
    };
  }, [onFail]);

  // Nothing draws while the section is off screen or the tab is hidden.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    let intersecting = true;
    const sync = () => setOnScreen(intersecting && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }, { rootMargin: "120px 0px" });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [field]);

  if (!geometries) return null;
  return <Canvas
    className="mg-tribal-canvas"
    frameloop={onScreen ? "always" : "never"}
    dpr={[1, 1.5]}
    camera={{ position: [0, 0, 8], fov: 30 }}
    gl={{ alpha: true, antialias: true }}
    onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", onFail, { once: true })}
  >
    <Scene geometries={geometries} field={field} onReady={onReady} />
  </Canvas>;
}

function Adorn({ geometry, onReady }: { geometry: BufferGeometry; onReady: () => void }) {
  const group = useRef<Group>(null);
  const reflections = useReflections();
  const frames = useRef(0);
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += Math.min(delta, .05) * .7;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * .6) * .14;
    }
    frames.current += 1;
    if (frames.current === 2) onReady();
  });
  return <group ref={group} scale={3.4}>
    <directionalLight position={[-2, 5, 4]} intensity={1.3} />
    <mesh geometry={geometry} scale={[1, -1, 1]}>
      <meshStandardMaterial color="#eceef6" metalness={1} roughness={.17} envMap={reflections} envMapIntensity={1} />
    </mesh>
  </group>;
}

/** The Bermuda Tribal's own applique, small and turning, for the stamp on the cover. */
export function AdornCanvas({ onReady }: { onReady: () => void }) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  useEffect(() => {
    let built: BufferGeometry | null = null;
    let cancelled = false;
    fetch("/tribals/bermuda-garra.svg").then((response) => response.text()).then((svg) => {
      if (cancelled) return;
      built = buildGeometry(svg);
      setGeometry(built);
    }).catch(() => { /* The still drawing stays. */ });
    return () => { cancelled = true; built?.dispose(); };
  }, []);
  if (!geometry) return null;
  return <Canvas className="mg-hero-seal-canvas" dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 30 }} gl={{ alpha: true, antialias: true }}>
    <Adorn geometry={geometry} onReady={onReady} />
  </Canvas>;
}
