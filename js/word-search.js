import { bindSoundButton, celebrate, chime } from "./effects.js";

/**
 * Demo word searches. Words are placed across, down, and diagonally,
 * forwards or backwards. Change `words` or `size` to make a new level.
 */
export const LEVELS = [
  { size: 8, seed: 11, words: ["CAT", "PAW", "MILK", "PURR", "COZY"] },
  { size: 10, seed: 29, words: ["KITTEN", "GARDEN", "STORY", "FLOWER", "CLOUD", "SMILE"] },
  { size: 12, seed: 47, words: ["BUTTERFLY", "COTTAGE", "SUNSHINE", "FRIEND", "PUZZLE", "MEADOW"] },
];

const COLORS = ["#E7D4FB", "#FFD8C7", "#BDE8D4", "#F8C9D8", "#D9E4FF", "#FDE7A8"];
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.superfun.wordlotus&hl=en_IN";

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPuzzle(words, size, seed) {
  const random = mulberry32(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  const ordered = [...words].sort((a, b) => b.length - a.length);

  for (const word of ordered) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt += 1) {
      const [rowStep, colStep] = directions[Math.floor(random() * directions.length)];
      const row = Math.floor(random() * size);
      const col = Math.floor(random() * size);
      const cells = [];
      let fits = true;
      for (let i = 0; i < word.length; i += 1) {
        const nextRow = row + rowStep * i;
        const nextCol = col + colStep * i;
        if (nextRow < 0 || nextCol < 0 || nextRow >= size || nextCol >= size) {
          fits = false;
          break;
        }
        const existing = grid[nextRow][nextCol];
        if (existing && existing !== word[i]) {
          fits = false;
          break;
        }
        cells.push([nextRow, nextCol]);
      }
      if (!fits) continue;
      cells.forEach(([nextRow, nextCol], index) => {
        grid[nextRow][nextCol] = word[index];
      });
      placed = true;
    }
    if (!placed) return null;
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!grid[row][col]) grid[row][col] = alphabet[Math.floor(random() * alphabet.length)];
    }
  }
  return grid;
}

function init(root) {
  const board = root.querySelector("[data-board]");
  const wordList = root.querySelector("[data-words]");
  const status = root.querySelector("[data-status]");
  const levelLabel = root.querySelector("[data-level]");
  const progressLabel = root.querySelector("[data-progress-label]");
  const progressBar = root.querySelector("[data-progress-bar]");
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
  let gridEl = null;
  let dragging = false;
  let dragMode = false;
  let anchor = null;
  let pendingTap = null;
  let path = [];
  let colorIndex = 0;
  let startX = 0;
  let startY = 0;

  if (soundButton) bindSoundButton(soundButton);
  if (storeLink) storeLink.href = PLAY_URL;

  function level() {
    return LEVELS[levelIndex];
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function updateProgress() {
    const total = level().words.length;
    progressBar.style.width = `${(found.size / total) * 100}%`;
    progressLabel.textContent = `${found.size} / ${total}`;
    levelLabel.textContent = `Level ${levelIndex + 1} of ${LEVELS.length}`;
    levelPicks.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(index === levelIndex));
    });
  }

  function hideWin() {
    win.hidden = true;
  }

  function showWin() {
    const last = levelIndex === LEVELS.length - 1;
    winTitle.textContent = last ? "Demo complete" : "All words found";
    winCopy.textContent = last
      ? "You cleared the word search demo. The full game is waiting in Kitten Word."
      : "Every word on the list is marked.";
    nextButton.hidden = last;
    storeLink.hidden = !last;
    if (appLink) appLink.hidden = !last;
    win.hidden = false;
    celebrate(root);
    chime("win");
  }

  function lineBetween(start, end) {
    const row1 = Number(start.dataset.row);
    const col1 = Number(start.dataset.col);
    const row2 = Number(end.dataset.row);
    const col2 = Number(end.dataset.col);
    const rowDelta = row2 - row1;
    const colDelta = col2 - col1;
    const steps = Math.max(Math.abs(rowDelta), Math.abs(colDelta));
    const rowStep = Math.sign(rowDelta);
    const colStep = Math.sign(colDelta);
    if (rowStep !== 0 && colStep !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) return null;
    const cells = [];
    for (let i = 0; i <= steps; i += 1) {
      const cell = gridEl.querySelector(`[data-row="${row1 + rowStep * i}"][data-col="${col1 + colStep * i}"]`);
      if (!cell) return null;
      cells.push(cell);
    }
    return cells;
  }

  function paint() {
    gridEl.querySelectorAll(".ws-cell").forEach((cell) => cell.classList.remove("is-active"));
    path.forEach((cell) => {
      if (!cell.classList.contains("is-found")) cell.classList.add("is-active");
    });
  }

  function renderWords() {
    wordList.replaceChildren();
    level().words.forEach((word) => {
      const item = document.createElement("li");
      item.dataset.word = word;
      item.textContent = word;
      wordList.appendChild(item);
    });
  }

  function renderLevel() {
    hideWin();
    found = new Set();
    path = [];
    colorIndex = 0;
    let grid = null;
    for (let extra = 0; extra < 60 && !grid; extra += 1) {
      grid = createPuzzle(level().words, level().size, level().seed + extra);
    }
    board.replaceChildren();
    if (!grid) {
      setStatus("This puzzle could not be prepared.");
      return;
    }
    gridEl = document.createElement("div");
    gridEl.className = "ws-grid";
    gridEl.style.gridTemplateColumns = `repeat(${level().size}, minmax(0, 1fr))`;
    gridEl.setAttribute("role", "grid");
    gridEl.setAttribute("aria-label", "Word search grid");
    grid.forEach((row, rowIndex) => {
      row.forEach((letter, colIndex) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "ws-cell";
        cell.dataset.row = String(rowIndex);
        cell.dataset.col = String(colIndex);
        cell.textContent = letter;
        cell.setAttribute("aria-label", `${letter}, row ${rowIndex + 1}, column ${colIndex + 1}`);
        gridEl.appendChild(cell);
        return cell;
      });
    });
    board.appendChild(gridEl);
    renderWords();
    updateProgress();
    setStatus("Drag across a word, or tap the first letter and then the last.");
  }

  function cellAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    const cell = hit?.closest?.(".ws-cell");
    if (!cell || !gridEl?.contains(cell)) return null;
    return cell;
  }

  function release(pointerPath) {
    pendingTap = null;
    const letters = pointerPath.map((cell) => cell.textContent).join("");
    if (letters.length < 2) {
      path = [];
      paint();
      return;
    }
    const reversed = [...letters].reverse().join("");
    const match = level().words.find((word) => word === letters || word === reversed);
    if (!match) {
      setStatus("Keep looking.");
      path = [];
      paint();
      return;
    }
    if (found.has(match)) {
      setStatus(`${match} is already found.`);
      path = [];
      paint();
      return;
    }
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex += 1;
    pointerPath.forEach((cell) => {
      cell.classList.remove("is-active");
      cell.classList.add("is-found");
      cell.style.background = color;
    });
    found.add(match);
    const item = wordList.querySelector(`[data-word="${match}"]`);
    if (item) item.classList.add("is-found");
    setStatus(`Found ${match}.`);
    updateProgress();
    chime("ok");
    path = [];
    if (found.size === level().words.length) showWin();
  }

  board.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest?.(".ws-cell");
    if (!cell || win.hidden === false) return;
    event.preventDefault();
    dragging = true;
    dragMode = false;
    anchor = cell;
    startX = event.clientX;
    startY = event.clientY;
    path = pendingTap ? path : [cell];
    board.setPointerCapture(event.pointerId);
  }, { passive: false });

  board.addEventListener("pointermove", (event) => {
    if (!dragging || !anchor) return;
    if (!dragMode && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
      dragMode = true;
      pendingTap = null;
      path = [anchor];
    }
    if (!dragMode) return;
    const cell = cellAt(event.clientX, event.clientY);
    if (!cell) return;
    const next = lineBetween(anchor, cell);
    if (!next) return;
    path = next;
    paint();
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    const cell = event.target.closest?.(".ws-cell") || cellAt(event.clientX, event.clientY);
    if (dragMode) {
      if (cell && anchor) {
        const next = lineBetween(anchor, cell);
        if (next) path = next;
      }
      const chosen = path;
      anchor = null;
      dragMode = false;
      release(chosen);
      return;
    }
    dragMode = false;
    anchor = null;
    if (!cell) return;
    if (!pendingTap || pendingTap === cell) {
      pendingTap = cell;
      path = [cell];
      paint();
      setStatus("Now tap the last letter of the word.");
      return;
    }
    const next = lineBetween(pendingTap, cell);
    if (!next) {
      pendingTap = null;
      path = [];
      paint();
      setStatus("Choose a straight line: across, down, or diagonal.");
      return;
    }
    release(next);
  }

  board.addEventListener("pointerup", endDrag);
  board.addEventListener("pointercancel", () => {
    dragging = false;
    dragMode = false;
    anchor = null;
    path = [];
    paint();
  });

  root.querySelector("[data-replay]").addEventListener("click", () => {
    if (levelIndex === LEVELS.length - 1 && found.size === level().words.length) {
      levelIndex = 0;
    }
    renderLevel();
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

  renderLevel();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-word-search]");
  if (root) init(root);
}
