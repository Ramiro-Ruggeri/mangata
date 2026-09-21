"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Shuffle } from "lucide-react";

const labels = ["DENIM", "RECORTES", "A MANO", "TEXTURAS", "MANGATA", "OTRA FORMA"];

/** Optional brand interaction. Physics stays out of the initial bundle and purchase flow. */
export function MaterialPlayground() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ mix: () => {}, pause: () => {} });
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena || reduced) return;
    let disposed = false, requested = false, visible = false;
    let cleanup = () => {};
    const observer = new IntersectionObserver(async ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { controls.current.pause(); return; }
      if (requested) return;
      requested = true;
      try {
        const { default: Matter } = await import("matter-js");
        if (disposed) return;
        const { Engine, Runner, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter;
        const engine = Engine.create({ enableSleeping: true });
        const runner = Runner.create();
        const buttons = Array.from(arena.querySelectorAll<HTMLButtonElement>(".mg-material-tag"));
        let bodies: Matter.Body[] = [], drag: Matter.Constraint | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let playing = false;
        const pause = () => {
          Runner.stop(runner); playing = false; clearTimeout(timer);
          if (drag) { Composite.remove(engine.world, drag); drag = null; }
          arena.dataset.running = "false";
          if (!disposed) setRunning(false);
        };
        const play = () => {
          if (!visible || document.hidden || disposed) return;
          if (!playing) { Runner.run(runner, engine); playing = true; }
          clearTimeout(timer); timer = setTimeout(pause, 4500);
          arena.dataset.running = "true"; setRunning(true);
        };
        const place = () => {
          pause(); Composite.clear(engine.world, false); Engine.clear(engine);
          const width = arena.clientWidth, height = arena.clientHeight;
          const columns = width < 440 ? 2 : 3;
          bodies = buttons.map((button, index) => Bodies.rectangle(
            width / columns * ((index % columns) + .5), 34 + Math.floor(index / columns) * 58,
            button.offsetWidth, button.offsetHeight,
            { chamfer: { radius: 16 }, restitution: .38, friction: .3, frictionAir: .035, angle: (index % 2 ? 1 : -1) * .2 },
          ));
          bodies.forEach((body, index) => { Body.setVelocity(body, { x: (Math.random() - .5) * 5, y: 0 }); Body.setAngularVelocity(body, (index % 2 ? 1 : -1) * .012); });
          Composite.add(engine.world, [...bodies,
            Bodies.rectangle(width / 2, height + 30, width + 120, 60, { isStatic: true }),
            Bodies.rectangle(-30, height / 2, 60, height * 3, { isStatic: true }),
            Bodies.rectangle(width + 30, height / 2, 60, height * 3, { isStatic: true }),
            Bodies.rectangle(width / 2, -40, width + 120, 60, { isStatic: true }),
          ]);
          arena.dataset.physics = "ready";
          draw(); play();
        };
        const draw = () => buttons.forEach((button, index) => {
          const body = bodies[index];
          button.style.transform = `translate(${body.position.x - button.offsetWidth / 2}px, ${body.position.y - button.offsetHeight / 2}px) rotate(${body.angle}rad)`;
        });
        const point = (event: PointerEvent) => {
          const rect = arena.getBoundingClientRect();
          return { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
        };
        const down = (event: PointerEvent) => {
          if (!event.isPrimary || event.button !== 0) return;
          const button = event.currentTarget as HTMLButtonElement;
          const body = bodies[buttons.indexOf(button)];
          Sleeping.set(body, false);
          play();
          const p = point(event);
          drag = Constraint.create({ pointA: p, bodyB: body, pointB: { x: p.x - body.position.x, y: p.y - body.position.y }, stiffness: .15, length: 0 });
          Composite.add(engine.world, drag);
          button.setPointerCapture(event.pointerId);
        };
        const move = (event: PointerEvent) => { if (drag) { drag.pointA = point(event); play(); } };
        const up = () => { if (drag) { Composite.remove(engine.world, drag); drag = null; } };
        const keyboard = (event: MouseEvent) => {
          if (event.detail !== 0) return;
          const index = buttons.indexOf(event.currentTarget as HTMLButtonElement);
          Sleeping.set(bodies[index], false);
          Body.setVelocity(bodies[index], { x: index % 2 ? 2 : -2, y: -8 }); play();
        };
        buttons.forEach(button => {
          button.addEventListener("pointerdown", down); button.addEventListener("pointermove", move);
          button.addEventListener("pointerup", up); button.addEventListener("pointercancel", up); button.addEventListener("click", keyboard);
        });
        Events.on(engine, "afterUpdate", draw);
        place();
        const resize = new ResizeObserver(place);
        resize.observe(arena);
        const hidden = () => { if (document.hidden) pause(); };
        document.addEventListener("visibilitychange", hidden);
        controls.current = { mix: place, pause };
        setReady(true);
        cleanup = () => {
          pause(); resize.disconnect(); document.removeEventListener("visibilitychange", hidden);
          buttons.forEach(button => {
            button.removeEventListener("pointerdown", down); button.removeEventListener("pointermove", move);
            button.removeEventListener("pointerup", up); button.removeEventListener("pointercancel", up); button.removeEventListener("click", keyboard);
            button.style.removeProperty("transform");
          });
          Events.off(engine, "afterUpdate", draw); Composite.clear(engine.world, false); Engine.clear(engine);
          delete arena.dataset.physics; delete arena.dataset.running;
        };
      } catch { /* Static labels remain readable when the optional chunk cannot load. */ }
    }, { threshold: .25 });
    observer.observe(arena);
    return () => { disposed = true; observer.disconnect(); cleanup(); controls.current = { mix: () => {}, pause: () => {} }; };
  }, [reduced]);

  return <section className="mg-materials mg-shell" aria-labelledby="materials-title">
    <div className="mg-materials-copy"><span className="mg-eyebrow">El diseño empieza acá</span><h2 id="materials-title">Mezclamos.<br /><em>Transformamos.</em></h2><p id="materials-instructions">Arrastrá las etiquetas o activalas con Enter. Probá otra combinación.</p>
      <div className="mg-material-controls"><button disabled={!ready || !!reduced} onClick={() => controls.current.mix()}><Shuffle size={16} aria-hidden="true" />Mezclar</button><button disabled={!running || !!reduced} onClick={() => controls.current.pause()}><Pause size={16} aria-hidden="true" />Pausar</button></div>
      {reduced && <p>Movimiento desactivado según tu preferencia.</p>}
    </div>
    <div ref={arenaRef} className="mg-material-arena" aria-describedby="materials-instructions">{labels.map(label => <button className="mg-material-tag" key={label} disabled={!ready || !!reduced} aria-label={`Mover etiqueta ${label}`}>{label}</button>)}</div>
  </section>;
}
