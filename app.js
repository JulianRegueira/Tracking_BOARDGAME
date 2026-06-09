const STORAGE_KEY = 'comandantes-tracker-v1';
const MAX_PLAYERS = 8;

const els = {
  defaultLife: document.querySelector('#default-life'),
  newPlayerName: document.querySelector('#new-player-name'),
  addPlayer: document.querySelector('#add-player'),
  newGame: document.querySelector('#new-game'),
  resetTemp: document.querySelector('#reset-temp'),
  playersGrid: document.querySelector('#players-grid'),
  emptyState: document.querySelector('#empty-state'),
  template: document.querySelector('#player-card-template'),
  saveStatus: document.querySelector('#save-status'),
  stateJson: document.querySelector('#state-json'),
  exportState: document.querySelector('#export-state'),
  importState: document.querySelector('#import-state'),
  installButton: document.querySelector('#btn-install'),
};

let deferredInstallPrompt = null;

let state = loadState() ?? {
  defaultLife: 20,
  players: [],
};

function clampNumber(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function createPlayer(name) {
  const defaultLife = clampNumber(els.defaultLife.value, 1, 999);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: name || `Jugador ${state.players.length + 1}`,
    commander: '',
    life: defaultLife,
    attack: 0,
    defense: 0,
    notes: '',
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  state.defaultLife = clampNumber(els.defaultLife.value, 1, 999);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.saveStatus.textContent = 'Guardado local';
  window.clearTimeout(saveState.timer);
  saveState.timer = window.setTimeout(() => {
    els.saveStatus.textContent = 'Autoguardado activo';
  }, 1200);
}

function updatePlayer(id, patch) {
  state.players = state.players.map(player => player.id === id ? { ...player, ...patch } : player);
  saveState();
  render();
}

function adjustPlayer(id, key, delta) {
  const player = state.players.find(p => p.id === id);
  if (!player) return;
  const current = Number(player[key]) || 0;
  updatePlayer(id, { [key]: clampNumber(current + delta, -99, 999) });
}

function removePlayer(id) {
  const player = state.players.find(p => p.id === id);
  if (!player) return;
  const ok = window.confirm(`¿Eliminar a ${player.name || 'este jugador'} de la partida?`);
  if (!ok) return;
  state.players = state.players.filter(p => p.id !== id);
  saveState();
  render();
}

function render() {
  els.defaultLife.value = state.defaultLife || 20;
  els.playersGrid.innerHTML = '';
  els.emptyState.classList.toggle('hidden', state.players.length > 0);

  state.players.forEach(player => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.classList.toggle('dead', player.life <= 0);

    const name = node.querySelector('.player-name');
    const commander = node.querySelector('.commander-name');
    const notes = node.querySelector('.notes');

    name.value = player.name;
    commander.value = player.commander;
    notes.value = player.notes;

    node.querySelector('.life-value').textContent = player.life;
    node.querySelector('.attack-value').textContent = player.attack;
    node.querySelector('.defense-value').textContent = player.defense;

    name.addEventListener('change', () => updatePlayer(player.id, { name: name.value.trim() || 'Jugador' }));
    commander.addEventListener('change', () => updatePlayer(player.id, { commander: commander.value.trim() }));
    notes.addEventListener('change', () => updatePlayer(player.id, { notes: notes.value.trim() }));

    node.querySelector('.minus-life').addEventListener('click', () => adjustPlayer(player.id, 'life', -1));
    node.querySelector('.plus-life').addEventListener('click', () => adjustPlayer(player.id, 'life', 1));
    node.querySelector('.minus-attack').addEventListener('click', () => adjustPlayer(player.id, 'attack', -1));
    node.querySelector('.plus-attack').addEventListener('click', () => adjustPlayer(player.id, 'attack', 1));
    node.querySelector('.minus-defense').addEventListener('click', () => adjustPlayer(player.id, 'defense', -1));
    node.querySelector('.plus-defense').addEventListener('click', () => adjustPlayer(player.id, 'defense', 1));
    node.querySelector('.remove-player').addEventListener('click', () => removePlayer(player.id));

    node.querySelectorAll('[data-damage]').forEach(button => {
      button.addEventListener('click', () => adjustPlayer(player.id, 'life', -Number(button.dataset.damage)));
    });
    node.querySelectorAll('[data-heal]').forEach(button => {
      button.addEventListener('click', () => adjustPlayer(player.id, 'life', Number(button.dataset.heal)));
    });

    els.playersGrid.appendChild(node);
  });
}

els.addPlayer.addEventListener('click', () => {
  if (state.players.length >= MAX_PLAYERS) {
    alert(`Máximo ${MAX_PLAYERS} jugadores.`);
    return;
  }
  const name = els.newPlayerName.value.trim();
  state.players.push(createPlayer(name));
  els.newPlayerName.value = '';
  saveState();
  render();
});

els.newPlayerName.addEventListener('keydown', event => {
  if (event.key === 'Enter') els.addPlayer.click();
});

els.defaultLife.addEventListener('change', () => {
  state.defaultLife = clampNumber(els.defaultLife.value, 1, 999);
  saveState();
});

els.resetTemp.addEventListener('click', () => {
  state.players = state.players.map(player => ({ ...player, attack: 0, defense: 0 }));
  saveState();
  render();
});

els.newGame.addEventListener('click', () => {
  const ok = window.confirm('¿Crear una partida nueva? Se borrarán los jugadores actuales de este dispositivo.');
  if (!ok) return;
  state = { defaultLife: clampNumber(els.defaultLife.value, 1, 999), players: [] };
  saveState();
  render();
});

els.exportState.addEventListener('click', () => {
  els.stateJson.value = JSON.stringify(state, null, 2);
  els.stateJson.select();
});

els.importState.addEventListener('click', () => {
  try {
    const imported = JSON.parse(els.stateJson.value);
    if (!Array.isArray(imported.players)) throw new Error('Formato inválido');
    state = {
      defaultLife: clampNumber(imported.defaultLife ?? 20, 1, 999),
      players: imported.players.slice(0, MAX_PLAYERS).map((player, index) => ({
        id: player.id || `${Date.now()}-${index}`,
        name: String(player.name || `Jugador ${index + 1}`),
        commander: String(player.commander || ''),
        life: clampNumber(player.life ?? 20, -99, 999),
        attack: clampNumber(player.attack ?? 0, -99, 999),
        defense: clampNumber(player.defense ?? 0, -99, 999),
        notes: String(player.notes || ''),
      })),
    };
    saveState();
    render();
  } catch (error) {
    alert('No pude importar la partida. Revisá que el JSON sea válido.');
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installButton.classList.remove('hidden');
});

els.installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

render();
