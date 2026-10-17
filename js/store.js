// Stato per dispositivo in localStorage. Ogni accesso può fallire (navigazione
// privata, storage pieno): lo stato resta in memoria fino alla chiusura della
// scheda e persistente() lo segnala.
import { mergeSignal } from './lib/balances.js';

const KEYS = {
  letti: 'rassegna:letti',
  segnali: 'rassegna:segnali',
  coda: 'rassegna:coda',
  token: 'rassegna:token',
};
const MAX_LETTI = 2000;

export const createStore = (storage) => {
  const memory = new Map();
  let persistent = true;
  const read = (key, fallback) => {
    try {
      const raw = memory.has(key) ? memory.get(key) : storage.getItem(key);
      return raw === null || raw === undefined ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    try {
      storage.setItem(key, raw);
    } catch {
      persistent = false;
    }
  };

  return {
    letti: () => new Set(read(KEYS.letti, [])),
    segnaLetti: (ids) => write(KEYS.letti, [...new Set([...read(KEYS.letti, []), ...ids])].slice(-MAX_LETTI)),
    // Record per voce come in votes/: { id, voto?, aperto?, tags, fonte, ts }.
    segnali: () => read(KEYS.segnali, {}),
    coda: () => read(KEYS.coda, []),
    registraSegnale: (signal) => {
      const segnali = read(KEYS.segnali, {});
      const [record] = mergeSignal(segnali[signal.id] ? [segnali[signal.id]] : [], signal);
      if (record) segnali[signal.id] = record;
      else delete segnali[signal.id];
      write(KEYS.segnali, segnali);
      // In coda il segnale resta grezzo (anche voto 0, che toglie il voto remoto),
      // fuso con quello ancora in attesa per la stessa voce.
      const coda = read(KEYS.coda, []);
      const pending = coda.find((s) => s.id === signal.id);
      write(KEYS.coda, [...coda.filter((s) => s.id !== signal.id), { ...pending, ...signal }]);
    },
    // Toglie solo quel segnale: se nel frattempo la voce ne ha uno nuovo, quello resta in coda.
    togliDallaCoda: (signal) => write(KEYS.coda, read(KEYS.coda, []).filter((s) => s.id !== signal.id || s.ts !== signal.ts)),
    token: () => read(KEYS.token, null),
    salvaToken: (token) => write(KEYS.token, token),
    rimuoviToken: () => {
      memory.delete(KEYS.token);
      try {
        storage.removeItem(KEYS.token);
      } catch {
        persistent = false;
      }
    },
    persistente: () => persistent,
  };
};
