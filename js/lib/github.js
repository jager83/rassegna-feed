// API contents di GitHub per i segnali (voti e aperture): usata dalla pagina
// (token del dispositivo) e da /rb:news (token di gh). fetchImpl iniettabile per i test.
import { mergeSignal } from './balances.js';

const API = 'https://api.github.com';
// Repo privato dedicato: il token dei dispositivi non può toccare prompt.md né altro.
export const VOTES_REPO = 'jager83/rassegna-segnali';

const toBase64 = (text) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (base64) =>
  new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), (char) => char.charCodeAt(0)));

export class GithubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const makeContentsApi = ({ token, repo = VOTES_REPO, fetchImpl = fetch }) => {
  const url = (path) => `${API}/repos/${repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  return {
    get: async (path) => {
      const response = await fetchImpl(url(path), { headers, cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new GithubError(response.status, `GET ${path}: ${response.status}`);
      const body = await response.json();
      return { text: fromBase64(body.content), sha: body.sha };
    },
    put: async (path, text, sha, message) => {
      const body = JSON.stringify({ message, content: toBase64(text), ...(sha ? { sha } : {}) });
      const response = await fetchImpl(url(path), { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body });
      if (!response.ok) throw new GithubError(response.status, `PUT ${path}: ${response.status}`);
    },
  };
};

// Il file segue il mese della voce (dall'id), non del segnale: tutti i segnali
// di una voce finiscono nello stesso record dello stesso file.
export const signalPath = (id) => `votes/${id.slice(0, 7)}.json`;

export const pushSignal = async (api, signal) => {
  const path = signalPath(signal.id);
  for (let attempt = 0; ; attempt += 1) {
    const file = await api.get(path);
    const next = mergeSignal(file ? JSON.parse(file.text) : [], signal);
    try {
      await api.put(path, `${JSON.stringify(next, null, 2)}\n`, file?.sha, `Segnale ${signal.id}`);
      return;
    } catch (error) {
      // 409/422: sha superato da un altro voto. Si rilegge e si riprova una volta.
      if (attempt === 0 && (error.status === 409 || error.status === 422)) continue;
      throw error;
    }
  }
};

export const monthsBack = (now, count) =>
  Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return date.toISOString().slice(0, 7);
  });

export const loadSignals = async (api, now = new Date()) => {
  const files = await Promise.all(monthsBack(now, 3).map((month) => api.get(`votes/${month}.json`)));
  return files.filter(Boolean).flatMap((file) => JSON.parse(file.text));
};
