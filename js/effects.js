const SOUND_KEY = "cg-sound";
const CONFETTI_COLORS = ["#7543B8", "#BCA4F2", "#FFD8C7", "#F8C9D8", "#BDE8D4", "#F6A15A"];

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private mode can block storage. Sound still works for this page view. */
  }
}

export function soundEnabled() {
  return storageGet(SOUND_KEY) !== "off";
}

export function setSoundEnabled(on) {
  storageSet(SOUND_KEY, on ? "on" : "off");
}

export function bindSoundButton(button) {
  const paint = () => {
    const on = soundEnabled();
    button.setAttribute("aria-pressed", String(on));
    button.textContent = on ? "Sound on" : "Sound off";
  };
  paint();
  button.addEventListener("click", () => {
    setSoundEnabled(!soundEnabled());
    document.querySelectorAll("[data-sound]").forEach((other) => {
      const on = soundEnabled();
      other.setAttribute("aria-pressed", String(on));
      other.textContent = on ? "Sound on" : "Sound off";
    });
  });
}

let audioCtx;

export function chime(kind) {
  if (!soundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = kind === "win" ? [523, 659, 784] : [587, 784];
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      const start = now + index * 0.07;
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  } catch {
    /* Audio is optional feedback. */
  }
}

export function celebrate(host) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 34; i += 1) {
    const bit = document.createElement("i");
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    bit.style.animationDelay = `${Math.random() * 0.15}s`;
    bit.style.transform = `rotate(${Math.random() * 80}deg)`;
    layer.appendChild(bit);
  }
  host.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}
