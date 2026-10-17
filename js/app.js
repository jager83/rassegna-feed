// Avvio, rotte (#/, #/giro/<id>, #/storico, #/te, #/impostazioni), segnali e sync.
import { mount } from './dom.js';
import { createStore } from './store.js';
import { createSyncer } from './sync.js';
import { bannerView, giroView, messageView, settingsView, storicoView, teView, validVoci } from './view.js';
import { computeBalances } from './lib/balances.js';
import { loadSignals, makeContentsApi } from './lib/github.js';

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
};

const store = createStore(safeStorage());
const main = document.getElementById('main');
const banner = document.getElementById('banner');
const state = { giro: null, tokenError: false };

const fetchJson = async (path) => {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

const githubApi = () => {
  const token = store.token();
  return token ? makeContentsApi({ token }) : null;
};

const renderBanner = () => {
  const spec = bannerView({ pending: store.coda().length, tokenError: state.tokenError, nonSalvabile: !store.persistente() });
  banner.replaceChildren(...(spec ? [mount(spec)] : []));
};

const render = (spec) => {
  main.replaceChildren(mount(spec));
  main.focus({ preventScroll: true });
};

const setActiveNav = (route) => {
  for (const anchor of document.querySelectorAll('.nav a')) {
    if (anchor.dataset.route === route) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  }
};

const renderGiro = (giro, { markRead }) => {
  state.giro = giro;
  render(giroView(giro, { letti: store.letti(), segnali: store.segnali() }));
  if (markRead) store.segnaLetti(validVoci(giro).map((voce) => voce.id));
};

const showGiro = async (giroId) => {
  const index = await fetchJson('feed/index.json');
  const entry = giroId ? index.find((e) => e.giro === giroId) : index[0];
  if (!entry) return render(messageView(giroId ? 'Giro non più disponibile.' : 'Ancora nessun giro pubblicato.'));
  return renderGiro(await fetchJson(`feed/${entry.file}`), { markRead: true });
};

const showTe = async () => {
  const proposte = await fetchJson('feed/proposte.json').catch(() => []);
  const api = githubApi();
  if (api) {
    try {
      return render(teView(computeBalances(await loadSignals(api), proposte), 'tutti i dispositivi'));
    } catch {
      // senza rete o token non valido: si ripiega sui segnali di questo dispositivo
    }
  }
  return render(teView(computeBalances(Object.values(store.segnali()), proposte), 'questo dispositivo'));
};

const route = async () => {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, param] = hash.split('/');
  setActiveNav(name || 'ultimo');
  try {
    if (name === 'storico') return render(storicoView(await fetchJson('feed/index.json')));
    if (name === 'te') return await showTe();
    if (name === 'impostazioni') return render(settingsView({ hasToken: Boolean(store.token()), pending: store.coda().length }));
    return await showGiro(name === 'giro' ? param : null);
  } catch {
    return render(messageView('Feed non raggiungibile. Riprova tra poco.'));
  }
};

const runSync = createSyncer(store, githubApi);

const sync = async () => {
  renderBanner();
  state.tokenError = (await runSync()).tokenError;
  renderBanner();
};

const voceOf = (id) => state.giro?.voci.find((v) => v.id === id);
const signalOf = (voce, extra) => ({ id: voce.id, tags: voce.tags, fonte: voce.fonte, ts: new Date().toISOString(), ...extra });

main.addEventListener('click', (event) => {
  // Link della fonte o del "provalo": il browser lo apre, qui si registra solo l'apertura.
  const openedLink = event.target.closest('[data-apri]');
  if (openedLink) {
    const voce = voceOf(openedLink.dataset.apri);
    if (voce) {
      store.registraSegnale(signalOf(voce, { aperto: true }));
      sync();
    }
    return;
  }
  const voteButton = event.target.closest('[data-voto]');
  if (voteButton) {
    const voce = voceOf(voteButton.dataset.id);
    if (!voce) return;
    const clicked = Number(voteButton.dataset.voto);
    const current = store.segnali()[voce.id]?.voto ?? 0;
    store.registraSegnale(signalOf(voce, { voto: current === clicked ? 0 : clicked }));
    renderGiro(state.giro, { markRead: false });
    sync();
    return;
  }
  if (event.target.closest('[data-azione="rimuovi-token"]')) {
    store.rimuoviToken();
    state.tokenError = false;
    route();
    renderBanner();
  }
});

main.addEventListener('submit', (event) => {
  if (event.target.id !== 'token-form') return;
  event.preventDefault();
  const token = new FormData(event.target).get('token').trim();
  if (!token) return;
  store.salvaToken(token);
  state.tokenError = false;
  route();
  sync();
});

window.addEventListener('hashchange', route);
window.addEventListener('online', sync);
route();
sync();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
