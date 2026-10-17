// Indice dei giri, archivi di pillole e proposte, deduplica: funzioni pure.
// I file dei giri non si cancellano mai: l'indice mostra solo gli ultimi 30 giorni.
// Un URL non si ripubblica per una settimana: le notizie `web` possono avere fino a 7 giorni.
export const DEDUP_GIORNI = 7;

export const giroFile = (giro) => `${giro}.json`;
export const giroDate = (giro) => giro.slice(0, 10);

export const shiftDate = (ymd, days) => {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const addToIndex = (index, giro, keepDays = 30) => {
  const cutoff = shiftDate(giroDate(giro.giro), -(keepDays - 1));
  const entry = { giro: giro.giro, file: giroFile(giro.giro), voci: giro.voci.length };
  return [entry, ...index.filter((e) => e.giro !== giro.giro)]
    .filter((e) => giroDate(e.giro) >= cutoff)
    .sort((a, b) => b.giro.localeCompare(a.giro));
};

// Registro di tutto ciò che è stato proposto: il denominatore del tasso di apertura.
export const addProposte = (proposte, giro) => [
  ...proposte.filter((p) => !p.id.startsWith(`${giro.giro}-`)),
  ...giro.voci.map(({ id, tags, fonte }) => ({ id, tags, fonte })),
];

export const addPillola = (pillole, giro) => {
  const pillola = giro.voci.find((voce) => voce.sezione === 'pillola');
  if (!pillola) return pillole;
  const { id, data, titolo, tags } = pillola;
  return [...pillole.filter((p) => p.id !== id), { id, data, titolo, tags }];
};

export const recentGiri = (index, today, days) => {
  const cutoff = shiftDate(today, -(days - 1));
  return index.filter((e) => giroDate(e.giro) >= cutoff);
};

export const duplicateUrls = (giro, recentVoci) => {
  const seen = new Set(recentVoci.map((voce) => voce.url));
  return giro.voci.filter((voce) => seen.has(voce.url)).map((voce) => voce.id);
};
