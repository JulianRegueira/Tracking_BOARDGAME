const STORAGE_KEY = "comandantes-individual-tracker-v2";

const defaultState = {
  name: "",
  life: 30,
  attack: 0,
  defense: 0
};

let state = loadState();

const els = {
  playerName: document.querySelector("#playerName"),
  lifeValue: document.querySelector("#lifeValue"),
  attackValue: document.querySelector("#attackValue"),
  defenseValue: document.querySelector("#defenseValue"),
  resetCombatBtn: document.querySelector("#resetCombatBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),
  confirmDialog: document.querySelector("#confirmDialog")
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  els.playerName.value = state.name;
  els.lifeValue.textContent = state.life;
  els.attackValue.textContent = state.attack;
  els.defenseValue.textContent = state.defense;

  document.title = state.name
    ? `${state.name} · Tracker`
    : "Tracker de Comandante";

  saveState();
}

function clampStat(value, min = -99, max = 999) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function changeStat(target, delta) {
  state[target] = clampStat(state[target] + delta);
  render();
}

document.querySelectorAll("[data-target][data-delta]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    const delta = Number(button.dataset.delta);
    changeStat(target, delta);
  });
});

document.querySelectorAll("[data-reset]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.reset;
    state[target] = 0;
    render();
  });
});

els.playerName.addEventListener("input", () => {
  state.name = els.playerName.value.trimStart();
  render();
});

els.resetCombatBtn.addEventListener("click", () => {
  state.attack = 0;
  state.defense = 0;
  render();
});

els.newGameBtn.addEventListener("click", () => {
  if (typeof els.confirmDialog.showModal === "function") {
    els.confirmDialog.showModal();
  } else {
    resetGame();
  }
});

els.resetAllBtn.addEventListener("click", () => {
  resetGame();
});

els.confirmDialog.addEventListener("close", () => {
  if (els.confirmDialog.returnValue === "confirm") {
    resetGame();
  }
});

function resetGame() {
  state = {
    ...defaultState,
    name: state.name
  };
  render();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

render();
