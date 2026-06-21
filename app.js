import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  serverTimestamp,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const ROOM_KEY = "commander-tracker-current-room-v5";
const NAME_KEY = "commander-tracker-player-name-v5";

const GLOBAL_EVENTS = {
  none: {
    id: "none",
    name: "NO INFLUYE EN ESTADÍSTICAS",
    description: "No modifica ataque ni defensa.",
    attackBonus: 0,
    defenseBonus: 0,
    color: "neutral"
  },

  war_sparks: {
    id: "war_sparks",
    name: "GUERRA DE CHISPAS",
    description: "+1 de ataque para todos los jugadores.",
    attackBonus: 1,
    defenseBonus: 0,
    color: "red"
  },

  dawn_wall: {
    id: "dawn_wall",
    name: "MURO DEL ALBA",
    description: "+1 de defensa para todos los jugadores.",
    attackBonus: 0,
    defenseBonus: 1,
    color: "white"
  }
};

let app = null;
let db = null;
let auth = null;
let uid = null;
let wasOwnDead = false;
let currentRoomCode = localStorage.getItem(ROOM_KEY) || "";
let currentGame = null;
let selectedCommanderId = null;
let unsubscribeGame = null;
let deferredInstallPrompt = null;

const els = {
  loadingView: document.querySelector("#loadingView"),
  loadingText: document.querySelector("#loadingText"),

  homeView: document.querySelector("#homeView"),
  setupView: document.querySelector("#setupView"),
  gameView: document.querySelector("#gameView"),

  statGrid: document.querySelector("#statGrid"),
  quickActions: document.querySelector("#quickActions"),
  tableView: document.querySelector("#tableView"),

  firebaseWarning: document.querySelector("#firebaseWarning"),

  createRoomBtn: document.querySelector("#createRoomBtn"),
  roomCodeInput: document.querySelector("#roomCodeInput"),
  joinRoomBtn: document.querySelector("#joinRoomBtn"),

  setupRoomCode: document.querySelector("#setupRoomCode"),
  gameRoomCode: document.querySelector("#gameRoomCode"),
  copyCodeBtnSetup: document.querySelector("#copyCodeBtnSetup"),
  copyCodeBtnGame: document.querySelector("#copyCodeBtnGame"),

  playerNameSetup: document.querySelector("#playerNameSetup"),
  commanderList: document.querySelector("#commanderList"),
  startGameBtn: document.querySelector("#startGameBtn"),

  playerNameDisplay: document.querySelector("#playerNameDisplay"),
  commanderNameDisplay: document.querySelector("#commanderNameDisplay"),
  baseStatsDisplay: document.querySelector("#baseStatsDisplay"),

  lifeValue: document.querySelector("#lifeValue"),
  attackValue: document.querySelector("#attackValue"),
  defenseValue: document.querySelector("#defenseValue"),

  playerCountText: document.querySelector("#playerCountText"),
  playersList: document.querySelector("#playersList"),

  resetCombatBtn: document.querySelector("#resetCombatBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  leaveRoomBtn: document.querySelector("#leaveRoomBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),

  confirmDialog: document.querySelector("#confirmDialog"),
  leaveDialog: document.querySelector("#leaveDialog"),

  installBtn: document.querySelector("#installBtn"),
  installHelpDialog: document.querySelector("#installHelpDialog"),
  installHelpText: document.querySelector("#installHelpText"),

  toast: document.querySelector("#toast"),
  globalEventSelect: document.querySelector("#globalEventSelect"),
  globalEventInfo: document.querySelector("#globalEventInfo"),

  deathBanner: document.querySelector("#deathBanner"),
  deathVideo: document.querySelector("#deathVideo")
};

function showOnly(viewName) {
  const views = {
    loading: els.loadingView,
    home: els.homeView,
    setup: els.setupView,
    game: els.gameView
  };

  Object.values(views).forEach((view) => {
    view.classList.add("hidden");
  });

  views[viewName].classList.remove("hidden");

  const inGame = viewName === "game";

  els.statGrid.classList.toggle("hidden", !inGame);
  els.quickActions.classList.toggle("hidden", !inGame);
  els.tableView.classList.toggle("hidden", !inGame);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function getCommanders() {
  if (window.COMMANDERS) return window.COMMANDERS;

  if (typeof COMMANDERS !== "undefined") {
    return COMMANDERS;
  }

  return [];
}

function getCommander(id) {
  return getCommanders().find((commander) => commander.id === id) || null;
}

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getPlayerPath(roomCode = currentRoomCode) {
  return `games/${roomCode}/players/${uid}`;
}

function getOwnPlayer() {
  return currentGame?.players?.[uid] || null;
}

function playerBaseFromCommander(commander) {
  return {
    baseLife: commander.life,
    baseAttack: commander.attack,
    baseDefense: commander.defense
  };
}

function getActiveGlobalEvent() {
  const eventId = currentGame?.meta?.globalEvent || "none";
  return GLOBAL_EVENTS[eventId] || GLOBAL_EVENTS.none;
}

function getEffectiveAttack(player) {
  const globalEvent = getActiveGlobalEvent();
  return Number(player.attack || 0) + Number(globalEvent.attackBonus || 0);
}

function getEffectiveDefense(player) {
  const globalEvent = getActiveGlobalEvent();
  return Number(player.defense || 0) + Number(globalEvent.defenseBonus || 0);
}

function renderGlobalEvent() {
  const globalEvent = getActiveGlobalEvent();

  els.globalEventSelect.value = globalEvent.id;

  els.globalEventInfo.className = `global-event-info ${globalEvent.color}`;
  els.globalEventInfo.textContent = `${globalEvent.name} · ${globalEvent.description}`;
}

async function updateGlobalEvent() {
  if (!currentRoomCode || !uid) return;

  const eventId = els.globalEventSelect.value;

  if (!GLOBAL_EVENTS[eventId]) {
    showToast("Evento global inválido");
    return;
  }

  try {
    await update(ref(db, `games/${currentRoomCode}/meta`), {
      globalEvent: eventId,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    });

    showToast(`Evento activo: ${GLOBAL_EVENTS[eventId].name}`);
  } catch (error) {
    console.error("Error actualizando evento global:", error);
    showToast("No pude cambiar el evento global");
  }
}

function renderDeathState(ownPlayer) {
  const isDead = Number(ownPlayer.life || 0) <= 0;

  els.deathBanner.classList.toggle("hidden", !isDead);

  if (isDead && !wasOwnDead) {
    els.deathVideo.currentTime = 0;
    els.deathVideo.play().catch(() => null);
  }

  if (!isDead && wasOwnDead) {
    els.deathVideo.pause();
    els.deathVideo.currentTime = 0;
  }

  wasOwnDead = isDead;
}

function renderCommanderList() {
  const commanders = getCommanders();

  els.commanderList.innerHTML = "";

  if (!commanders.length) {
    els.commanderList.innerHTML = `
      <div class="warning-card">
        <strong>No hay comandantes cargados</strong>
        <span>Revisá que el archivo commanders.js exista y no tenga errores.</span>
      </div>
    `;
    updateStartButton();
    return;
  }

  commanders.forEach((commander) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "commander-option";
    button.dataset.color = commander.color || "gold";
    button.dataset.commanderId = commander.id;

    if (selectedCommanderId === commander.id) {
      button.classList.add("selected");
    }

    button.innerHTML = `
      <div class="commander-medal">${escapeHtml(getInitials(commander.name))}</div>
      <div class="commander-info">
        <strong>${escapeHtml(commander.name)}</strong>
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
  const hasRoom = Boolean(currentRoomCode);

  els.startGameBtn.disabled = !(hasName && hasCommander && hasRoom);
}

function renderHome() {
  showOnly("home");
  document.title = "Tracker de Comandante";
}

function renderSetup() {
  els.setupRoomCode.textContent = currentRoomCode || "------";
  els.playerNameSetup.value = localStorage.getItem(NAME_KEY) || "";

  renderCommanderList();
  updateStartButton();

  showOnly("setup");
  document.title = currentRoomCode
    ? `Sala ${currentRoomCode} · Setup`
    : "Tracker de Comandante";
}

function renderGame() {
  const own = getOwnPlayer();

  if (!own) {
    renderSetup();
    return;
  }

  const commander = getCommander(own.commanderId) || {
    name: own.commanderName || "Comandante",
    life: own.baseLife ?? own.life,
    attack: own.baseAttack ?? own.attack,
    defense: own.baseDefense ?? own.defense
  };

  els.gameRoomCode.textContent = currentRoomCode;

  els.playerNameDisplay.textContent = own.name || "Jugador";
  els.commanderNameDisplay.textContent = own.commanderName || commander.name;

  els.baseStatsDisplay.textContent =
    `VIDA ${own.baseLife ?? commander.life} · ATQ ${own.baseAttack ?? commander.attack} · DEF ${own.baseDefense ?? commander.defense}`;

  els.lifeValue.textContent = own.life ?? 0;
  els.attackValue.textContent = getEffectiveAttack(own);
  els.defenseValue.textContent = getEffectiveDefense(own);

  renderGlobalEvent();
  renderDeathState(own);
  renderPlayersList();

  showOnly("game");

  document.title = `${own.name || "Jugador"} · ${currentRoomCode}`;
}

function calculateDamage(attacker, defender) {
  const attackerAttack = getEffectiveAttack(attacker);
  const defenderDefense = getEffectiveDefense(defender);

  return Math.max(0, attackerAttack - defenderDefense);
}

function renderDamagePreview(attacker, players) {
  const opponents = players.filter((player) => player.uid !== attacker.uid);

  if (!opponents.length) {
    return `
      <div class="damage-preview">
        <div class="damage-preview-title">Daño / Vida actual</div>
        <div class="damage-empty">No hay otros comandantes en mesa.</div>
      </div>
    `;
  }

  const rows = opponents.map((defender) => {
    const defenderCommander = getCommander(defender.commanderId);
    const defenderName = defender.name || defenderCommander?.name || "Jugador";

    const defenderLife = Number(defender.life ?? 0);
    const damage = calculateDamage(attacker, defender);

    const damageText = damage > 0
      ? `<strong class="damage-value">${damage}</strong>`
      : `<span class="no-damage">0</span>`;

    return `
      <div class="damage-row">
        <span class="damage-row-name">${escapeHtml(defenderName)}</span>

        <div class="damage-row-values">
          <span class="damage-label">DAÑO</span>
          ${damageText}
          <span class="damage-separator">/</span>
          <span class="life-label">VIDA</span>
          <strong class="life-value">${defenderLife}</strong>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="damage-preview">
      <div class="damage-preview-title">Daño / Vida actual</div>
      <div class="damage-list">${rows}</div>
    </div>
  `;
}

function renderPlayersList() {
  const players = Object.entries(currentGame?.players || {})
    .map(([playerUid, player]) => ({
      uid: playerUid,
      ...player
    }))
    .sort((a, b) => {
      const lifeDiff = Number(b.life ?? 0) - Number(a.life ?? 0);

      if (lifeDiff !== 0) return lifeDiff;

      const orderA = Number(a.joinedOrder || 0);
      const orderB = Number(b.joinedOrder || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });

  const count = players.length;

  els.playerCountText.textContent =
    `${count} ${count === 1 ? "jugador" : "jugadores"}`;

  if (!players.length) {
    els.playersList.innerHTML = `
      <div class="player-card">
        <p>No hay jugadores todavía.</p>
      </div>
    `;
    return;
  }

  els.playersList.innerHTML = players.map((player, index) => {
    const commander = getCommander(player.commanderId);
    const commanderName = player.commanderName || commander?.name || "Comandante";
    const isMe = player.uid === uid;
    const isDead = Number(player.life || 0) <= 0;
    const leaderPill = index === 0 && players.length > 1 && !isDead
      ? `<span class="leader-pill">Mayor vida</span>`
      : "";

    return `
      <article class="player-card ${isMe ? "me" : ""} ${isDead ? "dead" : ""}">
        <div class="player-card-top">
          <div>
            <h3>${escapeHtml(player.name || "Jugador")}</h3>
            <p>${escapeHtml(commanderName)}</p>
          </div>
          <div class="player-card-pills">
            ${leaderPill}
            ${isDead ? `<span class="skull-pill">☠️</span>` : isMe ? `<span class="me-pill">Tú</span>` : ""}
          </div>
        </div>

        <div class="player-mini-stats">
          <span>VIDA ${player.life ?? 0}</span>
          <span>ATQ ${getEffectiveAttack(player)}</span>
          <span>DEF ${getEffectiveDefense(player)}</span>
        </div>

        ${renderDamagePreview(player, players)}
      </article>
    `;
  }).join("");
}
async function bootstrapFirebase() {
  if (!isFirebaseConfigured()) {
    els.firebaseWarning.classList.remove("hidden");
    els.createRoomBtn.disabled = true;
    els.joinRoomBtn.disabled = true;
    els.loadingText.textContent = "Firebase no configurado";
    renderHome();
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);

    els.loadingText.textContent = "Iniciando sesión anónima";

    const credential = await signInAnonymously(auth);
    uid = credential.user.uid;

    els.loadingText.textContent = "Conectado";

    if (currentRoomCode) {
      await tryRestoreRoom(currentRoomCode);
    } else {
      renderHome();
    }
  } catch (error) {
    console.error("Error iniciando Firebase:", error);

    els.firebaseWarning.classList.remove("hidden");
    els.createRoomBtn.disabled = true;
    els.joinRoomBtn.disabled = true;

    renderHome();

    showToast("Error Firebase: revisá config, DB y Auth anónimo");
  }
}

async function tryRestoreRoom(roomCode) {
  const code = normalizeRoomCode(roomCode);

  if (!code) {
    renderHome();
    return;
  }

  try {
    const metaSnapshot = await get(ref(db, `games/${code}/meta`));

    if (!metaSnapshot.exists()) {
      localStorage.removeItem(ROOM_KEY);
      currentRoomCode = "";
      renderHome();
      return;
    }

    currentRoomCode = code;
    localStorage.setItem(ROOM_KEY, code);

    const playerSnapshot = await get(ref(db, getPlayerPath(code)));

    if (playerSnapshot.exists()) {
      subscribeToRoom(code);
    } else {
      renderSetup();
    }
  } catch (error) {
    console.error("Error restaurando sala:", error);
    localStorage.removeItem(ROOM_KEY);
    currentRoomCode = "";
    renderHome();
  }
}

async function createRoom() {
  if (!db || !uid) {
    showToast("Firebase todavía no está listo");
    return;
  }

  els.createRoomBtn.disabled = true;

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateRoomCode();
      const metaRef = ref(db, `games/${code}/meta`);
      const snapshot = await get(metaRef);

      if (!snapshot.exists()) {
          await set(metaRef, {
            status: "active",
            version: 5,
            globalEvent: "none",
            createdBy: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

        currentRoomCode = code;
        localStorage.setItem(ROOM_KEY, code);

        selectedCommanderId = null;

        showToast(`Sala creada: ${code}`);
        renderSetup();

        return;
      }
    }

    showToast("No pude crear código. Probá de nuevo.");
  } catch (error) {
    console.error("Error creando sala:", error);
    showToast("Error al crear sala");
  } finally {
    els.createRoomBtn.disabled = false;
  }
}

async function joinRoom() {
  if (!db || !uid) {
    showToast("Firebase todavía no está listo");
    return;
  }

  const code = normalizeRoomCode(els.roomCodeInput.value);
  els.roomCodeInput.value = code;

  if (code.length !== 6) {
    showToast("El código debe tener 6 caracteres");
    return;
  }

  try {
    const metaSnapshot = await get(ref(db, `games/${code}/meta`));

    if (!metaSnapshot.exists()) {
      showToast("No existe una sala con ese código");
      return;
    }

    currentRoomCode = code;
    localStorage.setItem(ROOM_KEY, code);

    const playerSnapshot = await get(ref(db, getPlayerPath(code)));

    if (playerSnapshot.exists()) {
      subscribeToRoom(code);
    } else {
      selectedCommanderId = null;
      renderSetup();
    }
  } catch (error) {
    console.error("Error uniéndose a sala:", error);
    showToast("Error al unirse a la sala");
  }
}

async function startPlayer() {
  const name = els.playerNameSetup.value.trim();
  const commander = getCommander(selectedCommanderId);

  if (!name) {
    showToast("Escribí tu nombre");
    return;
  }

  if (!commander) {
    showToast("Elegí un comandante");
    return;
  }

  if (!currentRoomCode || !uid) {
    showToast("No hay sala activa");
    return;
  }

  try {
    localStorage.setItem(NAME_KEY, name);

    const playersSnapshot = await get(ref(db, `games/${currentRoomCode}/players`));
    const playerCount = playersSnapshot.exists()
      ? Object.keys(playersSnapshot.val() || {}).length
      : 0;

    if (playerCount >= 8) {
      showToast("La sala ya tiene 8 jugadores");
      return;
    }

    const playerData = {
      name,
      commanderId: commander.id,
      commanderName: commander.name,
      ...playerBaseFromCommander(commander),
      life: commander.life,
      attack: commander.attack,
      defense: commander.defense,
      joinedOrder: playerCount + 1,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      online: true
    };

    await set(ref(db, getPlayerPath()), playerData);

    await onDisconnect(ref(db, `${getPlayerPath()}/online`)).set(false);

    subscribeToRoom(currentRoomCode);
  } catch (error) {
    console.error("Error entrando a partida:", error);
    showToast("No pude entrar a la partida");
  }
}

function subscribeToRoom(roomCode) {
  if (unsubscribeGame) {
    unsubscribeGame();
    unsubscribeGame = null;
  }

  currentRoomCode = normalizeRoomCode(roomCode);
  localStorage.setItem(ROOM_KEY, currentRoomCode);

  unsubscribeGame = onValue(
    ref(db, `games/${currentRoomCode}`),
    (snapshot) => {
      if (!snapshot.exists() || !snapshot.val()?.meta) {
        currentGame = null;
        localStorage.removeItem(ROOM_KEY);
        currentRoomCode = "";

        showToast("La sala ya no existe");
        renderHome();

        return;
      }

      currentGame = snapshot.val();

      const own = getOwnPlayer();

      if (!own) {
        renderSetup();
        return;
      }

      renderGame();
    },
    (error) => {
      console.error("Error escuchando sala:", error);
      showToast("Error de sincronización");
    }
  );
}

function clampStat(value, min = -99, max = 999) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

async function changeOwnStat(target, delta) {
  const own = getOwnPlayer();

  if (!own || !currentRoomCode || !uid) return;

  const currentValue = Number(own[target]) || 0;

  const minValue = target === "life" ? 0 : -99;
  const maxValue = target === "life"
    ? Number(own.baseLife || own.life || 0)
    : 999;

  const nextValue = clampStat(currentValue + delta, minValue, maxValue);

  try {
    await update(ref(db, getPlayerPath()), {
      [target]: nextValue,
      updatedAt: serverTimestamp(),
      online: true
    });
  } catch (error) {
    console.error("Error actualizando stat:", error);
    showToast("No pude actualizar el valor");
  }
}

async function setOwnStatToBase(target) {
  const own = getOwnPlayer();

  if (!own) return;

  const baseMap = {
    life: "baseLife",
    attack: "baseAttack",
    defense: "baseDefense"
  };

  const baseValue = own[baseMap[target]];

  if (typeof baseValue === "undefined") return;

  try {
    await update(ref(db, getPlayerPath()), {
      [target]: baseValue,
      updatedAt: serverTimestamp(),
      online: true
    });
  } catch (error) {
    console.error("Error reseteando stat:", error);
    showToast("No pude resetear");
  }
}

async function resetOwnCommander() {
  const own = getOwnPlayer();

  if (!own) return;

  try {
    await update(ref(db, getPlayerPath()), {
      life: own.baseLife,
      attack: own.baseAttack,
      defense: own.baseDefense,
      updatedAt: serverTimestamp(),
      online: true
    });
  } catch (error) {
    console.error("Error reiniciando comandante:", error);
    showToast("No pude reiniciar");
  }
}

async function resetOwnCombat() {
  const own = getOwnPlayer();

  if (!own) return;

  try {
    await update(ref(db, getPlayerPath()), {
      attack: own.baseAttack,
      defense: own.baseDefense,
      updatedAt: serverTimestamp(),
      online: true
    });
  } catch (error) {
    console.error("Error reseteando ATQ/DEF:", error);
    showToast("No pude resetear ATQ/DEF");
  }
}

async function leaveRoom() {
  if (!currentRoomCode || !uid) {
    renderHome();
    return;
  }

  try {
    await remove(ref(db, getPlayerPath()));
  } catch (error) {
    console.error("Error saliendo de sala:", error);
  }

  if (unsubscribeGame) {
    unsubscribeGame();
    unsubscribeGame = null;
  }

  currentGame = null;
  selectedCommanderId = null;

  localStorage.removeItem(ROOM_KEY);
  currentRoomCode = "";

  renderHome();
}

async function copyRoomCode() {
  if (!currentRoomCode) return;

  try {
    await navigator.clipboard.writeText(currentRoomCode);
    showToast("Código copiado");
  } catch {
    showToast(`Código: ${currentRoomCode}`);
  }
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
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

els.createRoomBtn.addEventListener("click", createRoom);
els.joinRoomBtn.addEventListener("click", joinRoom);

els.roomCodeInput.addEventListener("input", () => {
  els.roomCodeInput.value = normalizeRoomCode(els.roomCodeInput.value);
});

els.roomCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    joinRoom();
  }
});

els.playerNameSetup.addEventListener("input", updateStartButton);

els.startGameBtn.addEventListener("click", startPlayer);

els.copyCodeBtnSetup.addEventListener("click", copyRoomCode);
els.copyCodeBtnGame.addEventListener("click", copyRoomCode);
els.globalEventSelect.addEventListener("change", updateGlobalEvent);

document.querySelectorAll("[data-target][data-delta]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    const delta = Number(button.dataset.delta);

    changeOwnStat(target, delta);
  });
});

document.querySelectorAll("[data-reset-base]").forEach((button) => {
  button.addEventListener("click", () => {
    setOwnStatToBase(button.dataset.resetBase);
  });
});

els.resetCombatBtn.addEventListener("click", resetOwnCombat);

els.newGameBtn.addEventListener("click", () => {
  if (typeof els.confirmDialog.showModal === "function") {
    els.confirmDialog.showModal();
  } else {
    resetOwnCommander();
  }
});

els.resetAllBtn.addEventListener("click", () => {
  if (getOwnPlayer()) {
    if (typeof els.confirmDialog.showModal === "function") {
      els.confirmDialog.showModal();
    } else {
      resetOwnCommander();
    }
  }
});

els.confirmDialog.addEventListener("close", () => {
  if (els.confirmDialog.returnValue === "confirm") {
    resetOwnCommander();
  }
});

els.leaveRoomBtn.addEventListener("click", () => {
  if (typeof els.leaveDialog.showModal === "function") {
    els.leaveDialog.showModal();
  } else {
    leaveRoom();
  }
});

els.leaveDialog.addEventListener("close", () => {
  if (els.leaveDialog.returnValue === "confirm") {
    leaveRoom();
  }
});

if (isStandaloneMode()) {
  els.installBtn.classList.add("hidden");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Error registrando Service Worker:", error);
    });
  });
}

showOnly("loading");
renderCommanderList();
bootstrapFirebase();