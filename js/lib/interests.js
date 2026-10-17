// Dalla cronologia (url, titolo, visite) ai temi con peso. In uscita solo i nomi
// dei temi di config/topics.txt: mai URL, host o titoli.
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.(local|test)$/;

const configLines = (text) =>
  text.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));

export const parseBlocklist = (text) => configLines(text).map((line) => line.toLowerCase());

export const parseTopics = (text) =>
  configLines(text)
    .map((line) => {
      const colon = line.indexOf(':');
      if (colon < 1) return null;
      const patterns = line.slice(colon + 1).split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
      return patterns.length ? { tema: line.slice(0, colon).trim(), patterns } : null;
    })
    .filter(Boolean);

export const hostOf = (url) => {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
};

const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);

export const isBlocked = (host, blocklist) =>
  PRIVATE_HOST.test(host) || blocklist.some((domain) => hostMatches(host, domain));

// Pattern con un punto: dominio. Altrimenti parola o frase intera nel titolo.
export const matchTopics = (host, title, topics) => {
  const words = ` ${title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(' ')} `;
  return topics
    .filter(({ patterns }) => patterns.some((p) => (p.includes('.') ? hostMatches(host, p) : words.includes(` ${p} `))))
    .map(({ tema }) => tema);
};

const byScore = (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]);

export const aggregateInterests = (rows, topics, blocklist) => {
  const scores = new Map();
  const unmapped = new Map();
  for (const row of rows) {
    const host = hostOf(row.url);
    if (!host || isBlocked(host, blocklist)) continue;
    const visite = Number(row.visite) || 1;
    const temi = matchTopics(host, row.title ?? '', topics);
    if (!temi.length) unmapped.set(host, (unmapped.get(host) ?? 0) + visite);
    for (const tema of temi) scores.set(tema, (scores.get(tema) ?? 0) + visite);
  }
  const max = Math.max(0, ...scores.values());
  const peso = (score) => (score >= max * 0.5 ? 'alto' : score >= max * 0.2 ? 'medio' : 'basso');
  return {
    temi: [...scores].sort(byScore).map(([tema, score]) => ({ tema, peso: peso(score) })),
    unmapped: [...unmapped].sort(byScore).map(([host, visite]) => ({ host, visite })),
  };
};

export const renderInterests = (temi, today) =>
  [
    '# Interessi',
    '',
    `Aggiornato: ${today}`,
    '',
    ...(temi.length ? temi.map(({ tema, peso }) => `- ${tema}: ${peso}`) : ['- nessun tema rilevato']),
    '',
  ].join('\n');

export const interestsDate = (markdown) => markdown.match(/^Aggiornato: (\d{4}-\d{2}-\d{2})$/m)?.[1] ?? null;
