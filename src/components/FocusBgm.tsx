"use client";

import { useApp } from "@/lib/store";
import { useEffect, useRef } from "react";

export function FocusBgm() {
  const { bgmOn, hasPremium } = useApp();
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);

  useEffect(() => {
    const stop = () => {
      nodesRef.current.forEach(({ osc, gain }) => {
        try {
          gain.gain.exponentialRampToValueAtTime(0.0001, ctxRef.current!.currentTime + 0.2);
          osc.stop(ctxRef.current!.currentTime + 0.25);
        } catch {
          /* already stopped */
        }
      });
      nodesRef.current = [];
    };

    if (!bgmOn || !hasPremium) {
      stop();
      return;
    }

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    void ctx.resume();

    const freqs = [110, 164.81, 196];
    nodesRef.current = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      gain.gain.value = 0.012;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      return { osc, gain };
    });

    return () => stop();
  }, [bgmOn, hasPremium]);

  return null;
}
