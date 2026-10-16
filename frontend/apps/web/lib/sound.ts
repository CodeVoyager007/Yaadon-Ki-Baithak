/**
 * Soft solo piano and Birdy's chirp, synthesized with the Web Audio API.
 * No audio files to download, which keeps the page light on slow 4G.
 *
 * The music: slow broken chords (Am, F, C, G, and friends) in the left
 * hand and a sparse, gentle melody in the right. The melody is picked
 * fresh every bar, so it never loops.
 *
 * Browsers only allow audio after the visitor interacts with the page,
 * so `start()` must be called from a click, tap or key press.
 */

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Chords as MIDI notes: [bass root, chord tones for the arpeggio...]
const PROGRESSIONS: number[][][] = [
  [
    [45, 57, 60, 64], // Am
    [41, 57, 60, 65], // F
    [48, 55, 60, 64], // C
    [43, 55, 59, 62], // G
  ],
  [
    [41, 57, 60, 64], // Fmaj7
    [43, 55, 59, 62], // G
    [40, 55, 59, 64], // Em
    [45, 57, 60, 64], // Am
  ],
];
// C major pentatonic, right-hand range
const MELODY = [67, 69, 72, 74, 76, 79, 81, 84];

const BEAT = 60 / 66; // 66 bpm, unhurried
const LOOKAHEAD = 0.6; // seconds scheduled ahead

export class NightSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | null = null;
  private running = false;
  private nextBar = 0;
  private bar = 0;
  private melodyIndex = 3;
  private queue: { at: number; play: () => void }[] = [];

  get isRunning() {
    return this.running;
  }

  start() {
    if (this.running) return;
    if (!this.ctx) this.build();
    if (!this.ctx || !this.master) return;
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(1.6, t + 2);
    this.running = true;
    this.nextBar = t + 0.3;
    this.tick();
  }

  stop() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.8);
    this.running = false;
    if (this.timer) window.clearTimeout(this.timer);
    this.queue = [];
  }

  /** Two quick rising notes, like a small bird saying hello. */
  chirp() {
    if (!this.ctx || !this.master || !this.running) return;
    const t = this.ctx.currentTime;
    [0, 0.13].forEach((offset, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      const base = i === 0 ? 2600 : 3200;
      osc.frequency.setValueAtTime(base, t + offset);
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + offset + 0.08);
      gain.gain.setValueAtTime(0.0001, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.06, t + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.11);
      osc.connect(gain).connect(this.master!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    });
  }

  /**
   * Cinematic sound effects for the intro and trailer. They work even when
   * the piano is off, as long as the visitor has clicked once.
   *  - "hit": the deep two-beat "ta-dum" of a studio logo
   *  - "whoosh": a soft air sweep on each cut
   *  - "boom": one low impact for the final title
   */
  sfx(kind: "hit" | "whoosh" | "boom") {
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    void ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(this.bus ?? ctx.destination);
    // play through even when the music is muted
    const direct = ctx.createGain();
    direct.gain.value = this.running ? 0 : 0.7;
    out.connect(direct).connect(ctx.destination);
    const t = ctx.currentTime + 0.02;

    const thump = (when: number, freq: number, loud: number, len: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * 2.2, when);
      o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(loud, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + len + 0.05);
      // a chord tone on top so it feels like an instrument, not just a kick
      const h = ctx.createOscillator();
      const hg = ctx.createGain();
      h.type = "triangle";
      h.frequency.value = freq * 3;
      hg.gain.setValueAtTime(0.0001, when);
      hg.gain.exponentialRampToValueAtTime(loud * 0.18, when + 0.02);
      hg.gain.exponentialRampToValueAtTime(0.0001, when + len * 0.8);
      h.connect(hg).connect(out);
      h.start(when);
      h.stop(when + len);
    };

    const noise = (when: number, len: number, from: number, to: number, loud: number) => {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(from, when);
      f.frequency.exponentialRampToValueAtTime(to, when + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(loud, when + len * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, when + len);
      src.connect(f).connect(g).connect(out);
      src.start(when);
    };

    if (kind === "hit") {
      thump(t, 55, 0.9, 0.9);
      thump(t + 0.32, 41, 1, 2.6);
      noise(t + 0.3, 1.4, 300, 90, 0.25);
    } else if (kind === "whoosh") {
      noise(t, 0.55, 400, 3200, 0.35);
    } else {
      thump(t, 36, 1, 3.2);
      noise(t, 2, 200, 60, 0.3);
    }
  }

  private build() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // Dry piano plus a soft room.
    this.bus = ctx.createGain();
    this.bus.connect(this.master);
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.38;
    this.bus.connect(reverb).connect(wet).connect(this.master);
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  /**
   * One piano note: slightly stretched harmonics (real strings are a bit
   * sharp up high), two detuned strings per harmonic for warmth, a fast
   * attack, a two-stage decay, and a felt hammer that softens the tone
   * as the note rings.
   */
  private note(n: number, when: number, velocity: number, length = 3.5) {
    const ctx = this.ctx!;
    const f0 = midi(n);
    const out = ctx.createGain();
    out.gain.value = 0.11 * velocity;

    // Bright at the hammer strike, mellow as it rings.
    const felt = ctx.createBiquadFilter();
    felt.type = "lowpass";
    felt.Q.value = 0.4;
    const bright = Math.min(9000, f0 * (6 + velocity * 6));
    felt.frequency.setValueAtTime(bright, when);
    felt.frequency.exponentialRampToValueAtTime(Math.max(f0 * 2, 400), when + 1.4);
    out.connect(felt).connect(this.bus!);

    // Low notes ring longer than high ones.
    const ring = length * (1.25 - Math.min(0.6, (n - 40) / 80));
    const B = 0.00035; // inharmonicity
    for (let h = 1; h <= 7; h++) {
      const fh = f0 * h * Math.sqrt(1 + B * h * h);
      if (fh > 12000) break;
      const amp = Math.pow(h, -1.35) * (h === 1 ? 1 : 0.8);
      const decay = ring / (1 + (h - 1) * 0.45);
      for (const detune of [-0.6, 0.6]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = fh;
        osc.detune.value = detune;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(amp * 0.5, when + 0.004);
        // quick initial drop, then a long tail (the piano "two-stage" decay)
        g.gain.exponentialRampToValueAtTime(amp * 0.22, when + 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
        osc.connect(g).connect(out);
        osc.start(when);
        osc.stop(when + decay + 0.05);
      }
    }
  }

  /** Writes one bar (4 beats) of left-hand arpeggio and right-hand melody. */
  private scheduleBar(start: number) {
    const prog = PROGRESSIONS[Math.floor(this.bar / 8) % PROGRESSIONS.length];
    const chord = prog[this.bar % prog.length];
    const [bass, ...tones] = chord;
    const half = BEAT / 2;

    // Left hand: bass, then a rolling pattern in eighth notes.
    const pattern = [bass, tones[0], tones[1], tones[2], tones[1], tones[0], tones[1], tones[2]];
    pattern.forEach((n, i) => {
      const v = i === 0 ? 0.75 : 0.32 + Math.random() * 0.08;
      this.at(start + i * half + (Math.random() - 0.5) * 0.012, () => this.note(n, this.when(), v, i === 0 ? 5 : 3));
    });

    // Right hand: 1 to 3 notes per bar, often resting, leaning on chord tones.
    const count = Math.random() < 0.25 ? 0 : 1 + Math.floor(Math.random() * 3);
    const slots = [0, 1.5, 2, 3, 3.5].sort(() => Math.random() - 0.5).slice(0, count).sort((a, b) => a - b);
    for (const beat of slots) {
      const drift = Math.floor(Math.random() * 3) - 1;
      const pull = this.melodyIndex > 6 ? -1 : this.melodyIndex < 1 ? 1 : 0;
      this.melodyIndex = Math.max(0, Math.min(MELODY.length - 1, this.melodyIndex + drift + pull));
      let n = MELODY[this.melodyIndex];
      // On the downbeat, snap to the nearest chord tone so it always sounds sweet.
      if (beat === 0) {
        const pcs = tones.map((t) => t % 12);
        while (!pcs.includes(n % 12)) n--;
      }
      const v = 0.45 + Math.random() * 0.2;
      this.at(start + beat * BEAT, () => this.note(n, this.when(), v, 4));
    }
    this.bar++;
  }

  // Tiny scheduler: notes are built just before they sound, so nothing piles up in memory.
  private pendingAt = 0;
  private at(time: number, play: () => void) {
    this.queue.push({ at: time, play });
  }
  private when() {
    return this.pendingAt;
  }

  private tick() {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.nextBar < now + LOOKAHEAD + BEAT * 4) {
      this.scheduleBar(this.nextBar);
      this.nextBar += BEAT * 4;
    }
    const due = this.queue.filter((q) => q.at < now + LOOKAHEAD);
    this.queue = this.queue.filter((q) => q.at >= now + LOOKAHEAD);
    for (const q of due) {
      this.pendingAt = Math.max(q.at, now + 0.01);
      q.play();
    }
    this.timer = window.setTimeout(() => this.tick(), 150);
  }
}
