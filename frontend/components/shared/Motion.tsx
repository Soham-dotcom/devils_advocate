"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Motion primitives for the landing page.
 *
 * Every one of these checks prefers-reduced-motion and degrades to the plain
 * static element — not to a shorter animation. Someone who has asked for less
 * motion should get none of this, not a faster version of it.
 */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Fades and lifts its children the first time they enter the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect(); // reveal once; re-animating on every scroll is noise
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: reduced
          ? "none"
          : `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/** Splits a line into words and staggers them in on mount. */
export function StaggerText({
  text,
  className = "",
  delay = 0,
  step = 55,
}: {
  text: string;
  className?: string;
  delay?: number;
  step?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => setMounted(true), []);

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span
            className="inline-block"
            style={{
              transform: mounted ? "translateY(0)" : "translateY(105%)",
              opacity: mounted ? 1 : 0,
              transition: `transform 800ms cubic-bezier(0.16,1,0.3,1) ${
                delay + i * step
              }ms, opacity 500ms ease ${delay + i * step}ms`,
            }}
          >
            {word}
          </span>
          {i < text.split(" ").length - 1 && " "}
        </span>
      ))}
    </span>
  );
}

/** Pulls gently toward the cursor when it comes close. */
export function Magnetic({
  children,
  strength = 0.32,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    // Pointer-based, so this simply never engages on touch devices.
    if (!window.matchMedia("(hover: hover)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0, 0)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, strength]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: "transform 350ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </div>
  );
}

/** Tilts in 3D toward the cursor. Subtle by default — this is a legal tool. */
export function TiltCard({
  children,
  className = "",
  max = 7,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * max * 2}deg) rotateX(${
        -py * max * 2
      }deg) translateZ(6px)`;
    };
    const onLeave = () => {
      el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, max]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </div>
  );
}
