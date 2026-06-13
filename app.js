const STORAGE_KEY = "comandantes-individual-tracker-v4";

const defaultState = {
  setupComplete: false,
  name: "",
  commanderId: null,
  life: 0,
  attack: 0,
  defense: 0
};

let state = loadState();
let selectedCommanderId = state.commanderId;
let deferredInstallPrompt = null;

const els = {
  setupView: document.querySelector("#setupView"),
  gameView: document.querySelector("#gameView"),
  commanderList: document.querySelector("#commanderList"),
  playerNameSetup: document.querySelector("#playerNameSetup"),
  startGameBtn: document.querySelector("#startGameBtn"),
  playerNameDisplay: document.querySelector("#playerNameDisplay"),
  commanderNameDisplay: document.querySelector("#commanderNameDisplay"),
  baseStatsDisplay: document.querySelector("#baseStatsDisplay"),
  lifeValue: document.querySelector("#lifeValue"),
  attackValue: document.querySelector("#attackValue"),
  defenseValue: document.querySelector("#defenseValue"),
  statGrid: document.querySelector("#statGrid"),
  quickActions: document.querySelector("#quickActions"),
  footerInfo: document.querySelector("#footerInfo"),
  resetCombatBtn: document.querySelector("#resetCombatBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),
  confirmDialog: document.querySelector("#confirmDialog"),
  wipeDialog: document.querySelector("#wipeDialog"),
  installBtn: document.querySelector("#installBtn"),
  installHelpDialog: document.querySelector("#installHelpDialog"),
  installHelpText: document.querySelector("#installHelpText")
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

function getCommander(id = state.commanderId) {
  return COMMANDERS.find((commander) => commander.id === id) || null;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function renderCommanderList() {
  els.commanderList.innerHTML = "";

  COMMANDERS.forEach((commander) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "commander-option";
    button.dataset.color = commander.color || "gold";
    button.dataset.commanderId = commander.id;

    if (selectedCommanderId === commander.id) {
      button.classList.add("selected");
    }

    button.innerHTML = `
      <div class="commander-medal">${getInitials(commander.name)}</div>
      <div class="commander-info">
        <strong>${commander.name}</strong>
        <div class="commander-stats">
          <span>VIDA ${commander.life}</span>
          <span>ATQ ${commander.attack}</span>
          <span>DEF ${commander.defense}</span>
        </div>
      </div>
    `;

    button.addEventListener("click", () => {
      selectedCommanderId = commander.id;
      renderCommanderList();
      updateStartButton();
    });

    els.commanderList.appendChild(button);
  });
}

function updateStartButton() {
  const hasName = els.playerNameSetup.value.trim().length > 0;
  const hasCommander = Boolean(selectedCommanderId);
  els.startGameBtn.disabled = !(hasName && hasCommander);
}

function render() {
  const commander = getCommander();

  if (state.setupComplete && commander) {
    els.setupView.classList.add("hidden");
    els.gameView.classList.remove("hidden");
    els.statGrid.classList.remove("hidden");
    els.quickActions.classList.remove("hidden");

    els.playerNameDisplay.textContent = state.name || "Jugador";
    els.commanderNameDisplay.textContent = commander.name;
    els.baseStatsDisplay.textContent = `VIDA ${commander.life} · ATQ ${commander.attack} · DEF ${commander.defense}`;
    els.lifeValue.textContent = state.life;
    els.attackValue.textContent = state.attack;
    els.defenseValue.textContent = state.defense;

    els.footerInfo.innerHTML = `
      <span>Comandante bloqueado para esta partida</span>
      <button type="button" id="wipeBtn">Borrar datos y elegir otro</button>
    `;

    document.querySelector("#wipeBtn").addEventListener("click", () => {
      if (typeof els.wipeDialog.showModal === "function") {
        els.wipeDialog.showModal();
      } else {
        wipeState();
      }
    });

    document.title = `${state.name || "Jugador"} · ${commander.name}`;
  } else {
    els.setupView.classList.remove("hidden");
    els.gameView.classList.add("hidden");
    els.statGrid.classList.add("hidden");
    els.quickActions.classList.add("hidden");

    els.playerNameSetup.value = state.name || "";
    renderCommanderList();
    updateStartButton();

    els.footerInfo.innerHTML = `<span>Guardado automático en este celular</span>`;
    document.title = "Tracker de Comandante";
  }

  saveState();
}

function clampStat(value, min = -99, max = 999) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function changeStat(target, delta) {
  if (!state.setupComplete) return;
  state[target] = clampStat(state[target] + delta);
  render();
}

function resetToCommanderBase() {
  const commander = getCommander();
  if (!commander) return;

  state.life = commander.life;
  state.attack = commander.attack;
  state.defense = commander.defense;
  render();
}

function resetCombatToBase() {
  const commander = getCommander();
  if (!commander) return;

  state.attack = commander.attack;
  state.defense = commander.defense;
  render();
}

function startGame() {
  const commander = COMMANDERS.find((item) => item.id === selectedCommanderId);
  const name = els.playerNameSetup.value.trim();

  if (!commander || !name) return;

  state = {
    setupComplete: true,
    name,
    commanderId: commander.id,
    life: commander.life,
    attack: commander.attack,
    defense: commander.defense
  };

  selectedCommanderId = commander.id;
  render();
}

function wipeState() {
  state = { ...defaultState };
  selectedCommanderId = null;
  localStorage.removeItem(STORAGE_KEY);
  render();
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getInstallHelpMessage() {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  if (isIOS) {
    return "En iPhone: abrí esta página con Safari, tocá el botón Compartir y elegí “Agregar a pantalla de inicio”.";
  }

  if (isAndroid) {
    return "En Android: abrí el menú de Chrome y elegí “Instalar app” o “Agregar a pantalla principal”.";
  }

  return "Abrí el menú del navegador y elegí “Instalar app” o “Agregar a pantalla principal”.";
}

function showInstallHelp() {
  els.installHelpText.textContent = getInstallHelpMessage();

  if (typeof els.installHelpDialog.showModal === "function") {
    els.installHelpDialog.showModal();
  } else {
    alert(els.installHelpText.textContent);
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isStandaloneMode()) {
    els.installBtn.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  els.installBtn.classList.add("hidden");
});

els.installBtn.addEventListener("click", async () => {
  if (isStandaloneMode()) {
    els.installBtn.classList.add("hidden");
    return;
  }

  if (!deferredInstallPrompt) {
    showInstallHelp();
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
});

els.playerNameSetup.addEventListener("input", () => {
  state.name = els.playerNameSetup.value.trimStart();
  updateStartButton();
  saveState();
});

els.startGameBtn.addEventListener("click", startGame);

document.querySelectorAll("[data-target][data-delta]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    const delta = Number(button.dataset.delta);
    changeStat(target, delta);
  });
});

document.querySelectorAll("[data-reset-base]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.resetBase;
    const commander = getCommander();
    if (!commander) return;
    state[target] = commander[target];
    render();
  });
});

els.resetCombatBtn.addEventListener("click", resetCombatToBase);

els.newGameBtn.addEventListener("click", () => {
  if (!state.setupComplete) return;

  if (typeof els.confirmDialog.showModal === "function") {
    els.confirmDialog.showModal();
  } else {
    resetToCommanderBase();
  }
});

els.resetAllBtn.addEventListener("click", () => {
  if (state.setupComplete) {
    if (typeof els.confirmDialog.showModal === "function") {
      els.confirmDialog.showModal();
    } else {
      resetToCommanderBase();
    }
  } else {
    wipeState();
  }
});

els.confirmDialog.addEventListener("close", () => {
  if (els.confirmDialog.returnValue === "confirm") {
    resetToCommanderBase();
  }
});

els.wipeDialog.addEventListener("close", () => {
  if (els.wipeDialog.returnValue === "confirm") {
    wipeState();
  }
});

if (isStandaloneMode()) {
  els.installBtn.classList.add("hidden");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });

  // Recarga automática al actualizar el Service Worker
  let refreshing;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

render();

render();
