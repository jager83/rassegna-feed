// Segnali (voto, apertura) e saldi: logica condivisa da pagina, /rb:news e routine.
// Record per voce: { id, voto?: 1|-1, aperto?: true, tags, fonte, ts }.
const DAY_MS = 86_400_000;
export const PESO_APERTURA = 0.5;
export const MIN_PROPOSTE_TASSO = 5;

// Unisce un segnale al record della stessa voce. voto 0 toglie il voto;
// un record senza voto né apertura sparisce.
export const mergeSignal = (records, signal) => {
  const existing = records.find((record) => record.id === signal.id);
  const merged = { ...existing, ...signal };
  if (merged.voto !== 1 && merged.voto !== -1) delete merged.voto;
  if (merged.aperto !== true) delete merged.aperto;
  const rest = records.filter((record) => record.id !== signal.id);
  return merged.voto === undefined && !merged.aperto ? rest : [...rest, merged];
};

const proposalDate = (id) => Date.parse(`${id.slice(0, 10)}T00:00:00Z`);

// proposte: [{ id, tags, fonte }] di ogni voce pubblicata (feed/proposte.json).
export const computeBalances = (records, proposte = [], now = Date.now(), days = 60) => {
  const since = now - days * DAY_MS;
  const tags = {};
  const fonti = {};
  const stats = (map, key) => (map[key] ??= { punteggio: 0, proposte: 0, aperture: 0 });
  const each = (item, apply) => {
    for (const tag of item.tags ?? []) apply(stats(tags, tag));
    if (item.fonte) apply(stats(fonti, item.fonte));
  };

  for (const proposta of proposte) {
    if (proposalDate(proposta.id) >= since) each(proposta, (s) => { s.proposte += 1; });
  }
  for (const record of records) {
    const ts = Date.parse(record.ts);
    if (Number.isNaN(ts) || ts < since) continue;
    const voto = record.voto === 1 || record.voto === -1 ? record.voto : 0;
    const aperto = record.aperto === true ? 1 : 0;
    if (!voto && !aperto) continue;
    each(record, (s) => {
      s.punteggio += voto + aperto * PESO_APERTURA;
      s.aperture += aperto;
    });
  }
  for (const map of [tags, fonti]) {
    for (const s of Object.values(map)) {
      s.tasso = s.proposte >= MIN_PROPOSTE_TASSO ? Math.round((s.aperture / s.proposte) * 100) / 100 : null;
    }
  }
  return { tags, fonti };
};

// Dal punteggio più alto; a parità, alfabetico.
export const rankBalances = (map) =>
  Object.entries(map)
    .map(([nome, s]) => ({ nome, ...s }))
    .sort((a, b) => b.punteggio - a.punteggio || a.nome.localeCompare(b.nome));
