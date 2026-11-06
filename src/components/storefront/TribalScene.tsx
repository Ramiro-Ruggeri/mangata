"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { trackCommerceEvent } from "@/lib/analytics";
import type { StoreProduct } from "@/lib/commerce/types";
import tribals from "./tribals.json";
import { resolveScenePieces, shouldAnimateScene } from "./tribal-scene";

type Circle = { x: number; y: number; r: number };
const SETTLE_AFTER_MS = 2500;
const FREEZE_AFTER_MS = 6000;

/** Static composition first: it is what search engines, reduced motion and failed loads see. Physics only adds to it. */
export function TribalScene({ products }: { products: StoreProduct[] }) {
  const router = useRouter();
  const arenaRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<() => void>(() => {});
  const [live, setLive] = useState(false);
  const pieces = resolveScenePieces(tribals, products);
  const garments = Array.from(new Map(pieces.map(piece => [piece.product.id, piece.product])).values());
  const pieceCount = pieces.length;

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena || !pieceCount || !shouldAnimateScene(window)) return;
    let disposed = false, requested = false, visible = false;
    let cleanup = () => {};
    let wake = () => {};
    const observer = new IntersectionObserver(async ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible || requested) { if (visible) wake(); return; }
      requested = true;
      try {
        const { default: Matter } = await import("matter-js");
        if (disposed) return;
        const { Engine, Bodies, Body, Composite, Constraint, Sleeping, Vector } = Matter;
        // Tuned against a bench of the same scene: enough solver work for a pile that rests instead of trembling.
        const engine = Engine.create({ enableSleeping: true, positionIterations: 12, velocityIterations: 8 });
        engine.gravity.y = 1.1;
        const nodes = Array.from(arena.querySelectorAll<HTMLElement>("[data-tribal]")).filter(node => node.offsetWidth > 0);
        let bodies: Array<{ body: Matter.Body; offset: Matter.Vector; node: HTMLElement }> = [];
        let frame = 0, last = 0, drag: Matter.Constraint | null = null, disturbedAt = performance.now();
        let hold: ReturnType<typeof setTimeout> | undefined;
        let press: { index: number; x: number; y: number; moved: boolean; touch: boolean } | null = null;

        const draw = () => {
          for (const { body, offset, node } of bodies) {
            const center = Vector.sub(body.position, Vector.rotate(offset, body.angle));
            node.style.transform = `translate3d(${center.x - node.offsetWidth / 2}px, ${center.y - node.offsetHeight / 2}px, 0) rotate(${body.angle}rad)`;
          }
        };
        const tick = (now: number) => {
          frame = 0;
          if (disposed || !visible || document.hidden) return;
          const elapsed = Math.min(now - (last || now), 50);
          last = now;
          // Fixed step: the same feel at 30, 60 or 120 Hz.
          for (let left = elapsed; left > 0; left -= 1000 / 60) Engine.update(engine, 1000 / 60);
          draw();
          // Interlocked arms can tremble below what the eye sees and never sleep. A resting pile must cost no battery.
          const quiet = now - disturbedAt;
          if (!drag && quiet > SETTLE_AFTER_MS) {
            for (const { body } of bodies) {
              if (!body.isSleeping && (quiet > FREEZE_AFTER_MS || (body.speed < .4 && body.angularSpeed < .02))) Sleeping.set(body, true);
            }
          }
          if (drag || bodies.some(({ body }) => !body.isSleeping)) frame = requestAnimationFrame(tick);
          else last = 0;
        };
        wake = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); };

        const drop = () => {
          Composite.clear(engine.world, false);
          const width = arena.clientWidth, height = arena.clientHeight;
          bodies = nodes.map((node, index) => {
            const w = node.offsetWidth, h = node.offsetHeight;
            const x = width * (((index * 2) % nodes.length) + .5) / nodes.length, y = -h - index * 70;
            const circles = JSON.parse(node.dataset.circles ?? "[]") as Circle[];
            const body = Body.create({
              parts: circles.map(c => Bodies.circle(x + (c.x - .5) * w, y + (c.y - .5) * h, Math.max(c.r * w, 4))),
              friction: .7, frictionAir: .018, restitution: .12, density: .0016, sleepThreshold: 30,
            });
            const offset = Vector.sub(body.position, { x, y });
            Body.setAngle(body, (index % 2 ? 1 : -1) * (.25 + index * .11));
            Body.setAngularVelocity(body, (index % 2 ? -1 : 1) * .012);
            return { body, offset, node };
          });
          Composite.add(engine.world, [...bodies.map(b => b.body),
            Bodies.rectangle(width / 2, height + 40, width + 400, 80, { isStatic: true, friction: .9 }),
            Bodies.rectangle(-40, height / 2 - 300, 80, height + 1200, { isStatic: true }),
            Bodies.rectangle(width + 40, height / 2 - 300, 80, height + 1200, { isStatic: true }),
          ]);
          arena.dataset.physics = "ready";
          last = 0;
          disturbedAt = performance.now();
          draw();
          wake();
        };

        const point = (event: PointerEvent) => {
          const rect = arena.getBoundingClientRect();
          return { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
        };
        const grab = (index: number, at: Matter.Vector) => {
          const { body } = bodies[index];
          Sleeping.set(body, false);
          drag = Constraint.create({ pointA: at, bodyB: body, pointB: Vector.sub(at, body.position), stiffness: .12, damping: .08, length: 0 });
          Composite.add(engine.world, drag);
          nodes[index].dataset.held = "true";
          disturbedAt = performance.now();
          trackCommerceEvent("tribal_interaction", { item_id: nodes[index].dataset.tribal, source: "drag" });
          wake();
        };
        const release = () => {
          clearTimeout(hold);
          if (drag) { Composite.remove(engine.world, drag); drag = null; disturbedAt = performance.now(); wake(); }
          nodes.forEach(node => delete node.dataset.held);
        };
        const down = (event: PointerEvent) => {
          if (!event.isPrimary || event.button !== 0) return;
          const index = nodes.indexOf(event.currentTarget as HTMLElement);
          const touch = event.pointerType !== "mouse";
          press = { index, x: event.clientX, y: event.clientY, moved: false, touch };
          (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
          const at = point(event);
          // A finger must hold still first: otherwise this gesture is someone scrolling the page.
          if (touch) hold = setTimeout(() => { if (press && !press.moved) { navigator.vibrate?.(8); grab(index, at); } }, 240);
          else grab(index, at);
        };
        const move = (event: PointerEvent) => {
          if (!press) return;
          if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) { press.moved = true; if (!drag) clearTimeout(hold); }
          if (drag) { drag.pointA = point(event); disturbedAt = performance.now(); wake(); }
        };
        const up = () => {
          const finished = press;
          press = null;
          release();
          if (finished && !finished.moved) {
            const href = nodes[finished.index].dataset.href;
            if (href) { trackCommerceEvent("tribal_interaction", { item_id: nodes[finished.index].dataset.tribal, source: "open_product" }); router.push(href); }
          }
        };
        const cancel = () => { press = null; release(); };
        // Only an active drag may stop the page from scrolling.
        const touchMove = (event: TouchEvent) => { if (drag && event.cancelable) event.preventDefault(); };
        nodes.forEach(node => {
          node.addEventListener("pointerdown", down); node.addEventListener("pointermove", move);
          node.addEventListener("pointerup", up); node.addEventListener("pointercancel", cancel);
        });
        arena.addEventListener("touchmove", touchMove, { passive: false });
        const visibility = () => { if (!document.hidden) { last = 0; wake(); } };
        document.addEventListener("visibilitychange", visibility);
        let resizeTimer: ReturnType<typeof setTimeout> | undefined;
        let lastWidth = arena.clientWidth;
        // Mobile browser bars change only the height: that must not throw the pile again.
        const resize = new ResizeObserver(() => {
          if (arena.clientWidth === lastWidth) return;
          lastWidth = arena.clientWidth;
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(drop, 200);
        });
        resize.observe(arena);
        dropRef.current = drop;
        drop();
        setLive(true);
        cleanup = () => {
          cancelAnimationFrame(frame); clearTimeout(hold); clearTimeout(resizeTimer); resize.disconnect();
          document.removeEventListener("visibilitychange", visibility);
          arena.removeEventListener("touchmove", touchMove);
          nodes.forEach(node => {
            node.removeEventListener("pointerdown", down); node.removeEventListener("pointermove", move);
            node.removeEventListener("pointerup", up); node.removeEventListener("pointercancel", cancel);
            node.style.removeProperty("transform"); delete node.dataset.held;
          });
          Composite.clear(engine.world, false); Engine.clear(engine);
          delete arena.dataset.physics;
          dropRef.current = () => {};
        };
      } catch { /* The static composition and the list of garments remain. */ }
    }, { threshold: .3 });
    observer.observe(arena);
    return () => { disposed = true; observer.disconnect(); cleanup(); };
    // The garments only feed the markup, which the effect reads once from the DOM.
  }, [pieceCount, router]);

  if (!pieces.length) return null;
  return <section className="mg-tribal mg-shell" aria-labelledby="tribal-title">
    <div className="mg-tribal-copy">
      <span className="mg-eyebrow">Reflejo sobre el agua</span>
      <h2 id="tribal-title">Mezclamos.<br /><em>Transformamos.</em></h2>
      <p>Arrastrá las piezas.</p>
      <ul className="mg-tribal-list">{garments.map(garment => <li key={garment.id}><Link href={`/producto/${garment.id}`}>{garment.name}</Link></li>)}</ul>
      {live && <button type="button" className="mg-tribal-replay" onClick={() => dropRef.current()}><RotateCcw size={15} aria-hidden="true" />Volver a soltar</button>}
    </div>
    <div ref={arenaRef} className="mg-tribal-arena" aria-hidden="true">
      {pieces.map((piece, index) => <div key={`${piece.id}-${index}`} className="mg-tribal-piece" data-tribal={piece.id} data-href={`/producto/${piece.product.id}`} data-circles={JSON.stringify(piece.circles)} style={{ "--tribal-mask": `url(/tribals/${piece.id}.svg)`, "--tribal-ratio": piece.ratio, "--tribal-h": `${piece.height}cqh`, "--tribal-x": `${piece.restX}%`, "--tribal-r": `${piece.restAngle}deg` } as React.CSSProperties} />)}
    </div>
    <p className="mg-tribal-hint">En el celular, mantené apretado un tribal para moverlo.</p>
  </section>;
}
