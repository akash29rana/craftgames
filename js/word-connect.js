import { bindSoundButton, celebrate, chime } from "./effects.js";

/**
 * Demo word lists. Every answer must be buildable from that level's letters,
 * using each letter once. Edit this list to change the puzzles.
 */
export const LEVELS = [
  {
    letters: ["C", "A", "S", "T"],
    words: ["CAT", "SAT", "CAST", "CATS"],
  },
  {
    letters: ["P", "L", "A", "Y"],
    words: ["PLAY", "PAL", "PAY", "LAP", "LAY"],
  },
  {
    letters: ["G", "A", "R", "D", "E", "N"],
    words: ["GARDEN", "DANGER", "GRAND", "RANGE", "GRADE", "NEAR", "DEAR", "READ"],
  },
];

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.superfun.wordlotus&hl=en_IN";

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function wordsFit(letters, words) {
  return words.every((word) => {
    const pool = [...letters];
    return [...word].every((letter) => {
      const index = pool.indexOf(letter);
      if (index === -1) return false;
      pool.splice(index, 1);
      return true;
    });
  });
}

function init(root) {
  const slotsEl = root.querySelector("[data-slots]");
  const bubble = root.querySelector("[data-bubble]");
  const status = root.querySelector("[data-status]");
  const levelLabel = root.querySelector("[data-level]");
  const progressBar = root.querySelector("[data-progress-bar]");
  const progressLabel = root.querySelector("[data-progress-label]");
  const wheel = root.querySelector("[data-wheel]");
  const lettersBox = root.querySelector("[data-letters]");
  const line = root.querySelector("[data-line]");
  const win = root.querySelector("[data-win]");
  const winTitle = root.querySelector("[data-win-title]");
  const winCopy = root.querySelector("[data-win-copy]");
  const nextButton = root.querySelector("[data-next]");
  const storeLink = root.querySelector("[data-store]");
  const appLink = root.querySelector("[data-app-store]");
  const levelPicks = [...root.querySelectorAll("[data-level-pick]")];
  const soundButton = root.querySelector("[data-sound]");

  let levelIndex = 0;
  let found = new Set();
  let selection = [];
  let buttons = [];
  let order = [];
  let active = false;
  let dragMode = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let downLetter = null;
  let locked = false;

  if (soundButton) bindSoundButton(soundButton);
  if (storeLink) storeLink.href = PLAY_URL;

  function level() {
    return LEVELS[levelIndex];
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function layout() {
    const rect = wheel.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.34;
    const count = order.length;
    order.forEach((letterIndex, position) => {
      const angle = (Math.PI * 2 * position) / count - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      buttons[letterIndex].style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
  }

  function drawLine() {
    const wheelRect = wheel.getBoundingClientRect();
    const points = selection.map((button) => {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - wheelRect.left;
      const y = rect.top + rect.height / 2 - wheelRect.top;
      return `${x},${y}`;
    });
    line.setAttribute("points", points.join(" "));
  }

  function updateBubble() {
    bubble.classList.remove("is-bad", "is-good");
    bubble.textContent = selection.map((button) => button.dataset.letter).join("");
  }

  function clearLetters() {
    selection.forEach((button) => button.classList.remove("is-on"));
    selection = [];
    line.setAttribute("points", "");
  }

  function renderSlots() {
    const sorted = [...level().words].sort((a, b) => a.length - b.length || a.localeCompare(b));
    slotsEl.replaceChildren();
    sorted.forEach((word) => {
      const item = document.createElement("li");
      item.className = "slot";
      item.dataset.word = word;
      item.setAttribute("aria-label", `${word.length} letter word`);
      for (let i = 0; i < word.length; i += 1) {
        const cell = document.createElement("span");
        cell.className = "slot-cell";
        item.appendChild(cell);
      }
      slotsEl.appendChild(item);
    });
  }

  function updateProgress() {
    const total = level().words.length;
    const count = found.size;
    progressBar.style.width = `${(count / total) * 100}%`;
    progressLabel.textContent = `${count} / ${total}`;
    levelLabel.textContent = `Level ${levelIndex + 1} of ${LEVELS.length}`;
    levelPicks.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === levelIndex));
    });
  }

  function hideWin() {
    win.hidden = true;
    locked = false;
  }

  function showWin() {
    const last = levelIndex === LEVELS.length - 1;
    winTitle.textContent = last ? "Demo complete" : "Level complete";
    winCopy.textContent = last
      ? "You found every word in the demo. Kitten Word has a much longer trail of puzzles and stories."
      : "Every word in this level is filled in.";
    nextButton.hidden = last;
    storeLink.hidden = !last;
    if (appLink) appLink.hidden = !last;
    win.hidden = false;
    locked = true;
    celebrate(root);
    chime("win");
  }

  function renderLevel() {
    hideWin();
    found = new Set();
    clearLetters();
    bubble.textContent = "";
    const letters = level().letters;
    order = shuffle(letters.map((_, index) => index));
    lettersBox.replaceChildren();
    buttons = letters.map((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "letter";
      button.textContent = letter;
      button.dataset.letter = letter;
      button.setAttribute("aria-label", `Letter ${letter}`);
      lettersBox.appendChild(button);
      return button;
    });
    renderSlots();
    updateProgress();
    setStatus("");
    requestAnimationFrame(layout);
  }

  function reveal(word) {
    const item = slotsEl.querySelector(`[data-word="${word}"]`);
    if (!item) return;
    [...item.children].forEach((cell, index) => {
      cell.textContent = word[index];
    });
    item.classList.add("is-found");
    item.removeAttribute("aria-label");
  }

  function finishSubmit(word) {
    if (!word) return;
    if (!level().words.includes(word)) {
      bubble.textContent = word;
      bubble.classList.add("is-bad");
      setStatus(`${word} is not in this puzzle.`);
      window.setTimeout(() => {
        bubble.classList.remove("is-bad");
        bubble.textContent = "";
      }, 420);
      return;
    }
    if (found.has(word)) {
      bubble.textContent = word;
      bubble.classList.add("is-bad");
      setStatus(`${word} is already found.`);
      window.setTimeout(() => {
        bubble.classList.remove("is-bad");
        bubble.textContent = "";
      }, 420);
      return;
    }
    found.add(word);
    reveal(word);
    bubble.textContent = word;
    bubble.classList.add("is-good");
    setStatus(`Found ${word}.`);
    updateProgress();
    chime("ok");
    window.setTimeout(() => {
      bubble.classList.remove("is-good");
      if (bubble.textContent === word) bubble.textContent = "";
    }, 450);
    if (found.size === level().words.length) showWin();
  }

  function submit() {
    const word = selection.map((button) => button.dataset.letter).join("");
    clearLetters();
    finishSubmit(word);
  }

  function pushLetter(letter) {
    if (!letter) return;
    if (selection.length >= 2 && selection[selection.length - 2] === letter) {
      const removed = selection.pop();
      removed.classList.remove("is-on");
    } else if (!selection.includes(letter)) {
      selection.push(letter);
      letter.classList.add("is-on");
    } else {
      return;
    }
    updateBubble();
    drawLine();
  }

  function letterFromPoint(x, y) {
    const hit = document.elementFromPoint(x, y);
    const button = hit?.closest?.(".letter");
    if (!button || !lettersBox.contains(button)) return null;
    return button;
  }

  wheel.addEventListener("pointerdown", (event) => {
    if (locked || event.button > 0) return;
    if (event.target.closest("[data-submit]")) return;
    active = true;
    dragMode = false;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    downLetter = event.target.closest(".letter");
    wheel.setPointerCapture(event.pointerId);
  });

  wheel.addEventListener("pointermove", (event) => {
    if (!active) return;
    if (!dragMode && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
      dragMode = true;
      moved = true;
      clearLetters();
      bubble.textContent = "";
      if (downLetter) pushLetter(downLetter);
    }
    if (!dragMode) return;
    pushLetter(letterFromPoint(event.clientX, event.clientY));
  });

  function endPointer() {
    if (!active) return;
    active = false;
    if (dragMode) submit();
    else if (downLetter) {
      const index = selection.indexOf(downLetter);
      if (index >= 0) {
        selection.splice(index).forEach((button) => button.classList.remove("is-on"));
      } else {
        selection.push(downLetter);
        downLetter.classList.add("is-on");
      }
      updateBubble();
      drawLine();
    }
    dragMode = false;
    downLetter = null;
  }

  wheel.addEventListener("pointerup", endPointer);
  wheel.addEventListener("pointercancel", endPointer);

  root.querySelector("[data-submit]").addEventListener("click", () => {
    if (!locked) submit();
  });

  root.querySelector("[data-shuffle]").addEventListener("click", () => {
    if (locked) return;
    order = shuffle(order);
    clearLetters();
    bubble.textContent = "";
    layout();
    setStatus("Letters shuffled.");
  });

  root.querySelector("[data-reset]").addEventListener("click", () => {
    found = new Set();
    hideWin();
    clearLetters();
    bubble.textContent = "";
    slotsEl.querySelectorAll(".slot").forEach((item) => {
      item.classList.remove("is-found");
      [...item.children].forEach((cell) => {
        cell.textContent = "";
      });
      item.setAttribute("aria-label", `${item.dataset.word.length} letter word`);
    });
    updateProgress();
    setStatus("Level reset.");
  });

  root.querySelector("[data-replay]").addEventListener("click", () => {
    if (levelIndex === LEVELS.length - 1 && found.size === level().words.length) {
      levelIndex = 0;
      renderLevel();
      return;
    }
    root.querySelector("[data-reset]").click();
  });

  nextButton.addEventListener("click", () => {
    if (levelIndex < LEVELS.length - 1) {
      levelIndex += 1;
      renderLevel();
    }
  });

  levelPicks.forEach((button) => {
    button.addEventListener("click", () => {
      levelIndex = Number(button.dataset.levelPick);
      renderLevel();
    });
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => layout());
    observer.observe(wheel);
  }
  renderLevel();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-word-connect]");
  if (root) init(root);
}
