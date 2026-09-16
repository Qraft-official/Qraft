/**
 * Short Qraft-original success chime + light haptic.
 * Generated with Web Audio (no sample files). Safe on browsers that lack Audio/vibrate.
 */

const COOLDOWN_MS = 850;
const VIBRATE_PATTERN = [25, 35, 15] as const;

let ctx: AudioContext | null = null;
let lastPlayAt = 0;
let playing = false;

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext || w.webkitAudioContext || null;
}

function getContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call synchronously from the answer-submit click so autoplay policies allow a later chime. */
export function unlockCorrectFeedback() {
  try {
    const audio = getContext();
    if (audio && audio.state === "suspended") void audio.resume();
  } catch {
    /* ignore */
  }
}

function tone(
  audio: AudioContext,
  dest: AudioNode,
  opts: {
    type: OscillatorType;
    freq: number;
    freqTo?: number;
    start: number;
    dur: number;
    peak: number;
  },
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, opts.start);
  if (opts.freqTo != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.freqTo, 1), opts.start + opts.dur * 0.55);
  }
  gain.gain.setValueAtTime(0.0001, opts.start);
  gain.gain.exponentialRampToValueAtTime(opts.peak, opts.start + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(opts.start);
  osc.stop(opts.start + opts.dur + 0.03);
}

function playChime(audio: AudioContext) {
  const t0 = audio.currentTime + 0.01;
  const master = audio.createGain();
  master.gain.value = 0.22;
  master.connect(audio.destination);

  // シュッ: brief rising whoosh
  tone(audio, master, {
    type: "sine",
    freq: 520,
    freqTo: 880,
    start: t0,
    dur: 0.1,
    peak: 0.11,
  });

  // キラッ / ポン: two bright notes + a soft sparkle
  tone(audio, master, {
    type: "sine",
    freq: 784,
    start: t0 + 0.07,
    dur: 0.22,
    peak: 0.16,
  });
  tone(audio, master, {
    type: "triangle",
    freq: 1174,
    start: t0 + 0.15,
    dur: 0.26,
    peak: 0.14,
  });
  tone(audio, master, {
    type: "sine",
    freq: 1568,
    start: t0 + 0.22,
    dur: 0.2,
    peak: 0.07,
  });
}

function vibrateSuccess() {
  try {
    const nav = typeof navigator === "undefined" ? null : navigator;
    if (!nav || typeof nav.vibrate !== "function") return;
    nav.vibrate([...VIBRATE_PATTERN]);
  } catch {
    /* unsupported or denied */
  }
}

/** Play once when a grade is confirmed correct. Never throws. */
export function playCorrectFeedback() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (playing || now - lastPlayAt < COOLDOWN_MS) return;
  lastPlayAt = now;
  playing = true;

  try {
    unlockCorrectFeedback();
    const audio = getContext();
    if (audio) {
      const start = () => {
        try {
          playChime(audio);
        } catch {
          /* ignore */
        }
      };
      if (audio.state === "suspended") {
        void audio.resume().then(start).catch(() => undefined);
      } else {
        start();
      }
    }
    vibrateSuccess();
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      playing = false;
    }, COOLDOWN_MS);
  } else {
    playing = false;
  }
}

export const CORRECT_FEEDBACK_VIBRATE = VIBRATE_PATTERN;
