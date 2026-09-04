"use client";

import { HOLD_REPEAT_START_MS, holdRepeatDelay } from "./hold-repeat";
import { useCallback, useEffect, useRef } from "react";

/**
 * Pointer-driven hold-to-repeat.
 * Fires once on down, waits HOLD_REPEAT_START_MS, then recursive timeouts
 * whose delay shrinks with hold duration.
 *
 * Release / cancel / unmount always clear the single pending timeout.
 * Click after a pointer sequence is ignored so a trailing click cannot
 * delete an extra character. Keyboard-only activation still uses click.
 */
export function useHoldRepeat(fire: () => boolean | void) {
  const fireRef = useRef(fire);
  fireRef.current = fire;

  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const suppressClickRef = useRef(false);
  const clickGuardRef = useRef<number | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const windowBoundRef = useRef(false);
  const stopRef = useRef<(unmount?: boolean) => void>(() => {});

  const onWindowEnd = useRef((e: PointerEvent) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    stopRef.current();
  }).current;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const unbindWindow = () => {
    if (!windowBoundRef.current) return;
    window.removeEventListener("pointerup", onWindowEnd, true);
    window.removeEventListener("pointercancel", onWindowEnd, true);
    windowBoundRef.current = false;
  };

  const bindWindow = () => {
    if (windowBoundRef.current) return;
    window.addEventListener("pointerup", onWindowEnd, true);
    window.addEventListener("pointercancel", onWindowEnd, true);
    windowBoundRef.current = true;
  };

  const stop = useCallback((unmount = false) => {
    if (!activeRef.current && pointerIdRef.current == null && timerRef.current == null) {
      unbindWindow();
      if (unmount && clickGuardRef.current != null) {
        window.clearTimeout(clickGuardRef.current);
        clickGuardRef.current = null;
      }
      return;
    }
    clearTimer();
    activeRef.current = false;
    const el = targetRef.current;
    const id = pointerIdRef.current;
    pointerIdRef.current = null;
    targetRef.current = null;
    unbindWindow();
    if (el && id != null) {
      try {
        if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
      } catch {
        /* ignore */
      }
    }
    if (clickGuardRef.current != null) window.clearTimeout(clickGuardRef.current);
    if (unmount) {
      clickGuardRef.current = null;
      suppressClickRef.current = false;
      return;
    }
    clickGuardRef.current = window.setTimeout(() => {
      clickGuardRef.current = null;
      suppressClickRef.current = false;
    }, 400);
  }, [onWindowEnd]);

  stopRef.current = stop;

  useEffect(() => () => stop(true), [stop]);

  const runFire = () => {
    const ok = fireRef.current();
    if (ok === false) {
      stop();
      return false;
    }
    return true;
  };

  const scheduleTick = () => {
    clearTimer();
    if (!activeRef.current) return;
    const held = performance.now() - startedAtRef.current;
    const delay = holdRepeatDelay(held);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!activeRef.current) return;
      if (!runFire()) return;
      scheduleTick();
    }, delay);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (pointerIdRef.current != null) return;
    e.preventDefault();
    e.stopPropagation();
    if (clickGuardRef.current != null) {
      window.clearTimeout(clickGuardRef.current);
      clickGuardRef.current = null;
    }
    suppressClickRef.current = true;
    pointerIdRef.current = e.pointerId;
    targetRef.current = e.currentTarget;
    activeRef.current = true;
    startedAtRef.current = performance.now();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    bindWindow();
    if (!runFire()) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!activeRef.current) return;
      if (!runFire()) return;
      scheduleTick();
    }, HOLD_REPEAT_START_MS);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    stop();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    stop();
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (!activeRef.current || e.pointerId !== pointerIdRef.current) return;
    const el = targetRef.current;
    const captured =
      Boolean(el) &&
      pointerIdRef.current != null &&
      el!.hasPointerCapture(pointerIdRef.current);
    if (captured) return;
    stop();
  };

  const onLostPointerCapture = (e: React.PointerEvent<HTMLElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (activeRef.current) return;
    stop();
  };

  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
      return;
    }
    runFire();
  };

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onLostPointerCapture,
    onClick,
  };
}
