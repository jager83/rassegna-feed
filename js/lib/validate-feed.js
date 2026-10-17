// Schema del feed: unica definizione, usata da publish-feed, pagina e test.
export const SEZIONI = ['ai', 'web', 'pillola', 'sport', 'cronaca'];
export const MAX_VOCI = { ai: 5, web: 4, pillola: 1, sport: 4, cronaca: 4 };
// "Provalo" ha senso solo per le sezioni tecniche.
export const SEZIONI_PROVALO = ['ai', 'web'];

const GIRO_RE = /^\d{4}-\d{2}-\d{2}-\d{4}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMPI_TESTO = ['titolo', 'sintesi', 'perche', 'fonte'];

const isText = (value) => typeof value === 'string' && value.trim() !== '';

export const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateVoce = (voce, giro) => {
  if (!voce || typeof voce !== 'object') return ['voce non è un oggetto'];
  const where = `voce ${voce.id ?? '?'}`;
  const errors = [];
  if (!SEZIONI.includes(voce.sezione)) errors.push(`${where}: sezione non valida`);
  const idRe = new RegExp(`^${giro}-${voce.sezione}-\\d+$`);
  if (typeof voce.id !== 'string' || !idRe.test(voce.id)) errors.push(`${where}: id non valido`);
  for (const campo of CAMPI_TESTO) {
    if (!isText(voce[campo])) errors.push(`${where}: ${campo} mancante`);
  }
  if (!isHttpsUrl(voce.url)) errors.push(`${where}: url non https`);
  if (!DATA_RE.test(voce.data ?? '')) errors.push(`${where}: data non valida`);
  const tagsOk = Array.isArray(voce.tags)
    && voce.tags.length >= 1
    && voce.tags.length <= 4
    && voce.tags.every((tag) => typeof tag === 'string' && TAG_RE.test(tag));
  if (!tagsOk) errors.push(`${where}: tags non validi`);
  if (typeof voce.esplorazione !== 'boolean') errors.push(`${where}: esplorazione non booleano`);
  if ('provalo' in voce && (!SEZIONI_PROVALO.includes(voce.sezione) || !isText(voce.provalo))) {
    errors.push(`${where}: provalo ammesso solo in ai e web, non vuoto`);
  }
  if (voce.sezione === 'pillola' ? !isText(voce.corpo) : 'corpo' in voce) {
    errors.push(`${where}: corpo obbligatorio solo in pillola`);
  }
  return errors;
};

export const validateGiro = (giro) => {
  if (!giro || typeof giro !== 'object') return ['giro non è un oggetto'];
  const errors = [];
  if (!GIRO_RE.test(giro.giro ?? '')) errors.push('giro: formato non valido');
  if (Number.isNaN(Date.parse(giro.generato))) errors.push('generato: data non valida');
  if (typeof giro.scarno !== 'boolean') errors.push('scarno: non booleano');
  if (!Array.isArray(giro.avvisi) || !giro.avvisi.every(isText)) errors.push('avvisi: lista di testi attesa');
  if (!Array.isArray(giro.voci)) return [...errors, 'voci: lista attesa'];

  const ids = new Set();
  const urls = new Set();
  const perSezione = {};
  for (const voce of giro.voci) {
    errors.push(...validateVoce(voce, giro.giro));
    if (ids.has(voce?.id)) errors.push(`voce ${voce.id}: id duplicato`);
    if (urls.has(voce?.url)) errors.push(`voce ${voce?.id}: url duplicato`);
    ids.add(voce?.id);
    urls.add(voce?.url);
    perSezione[voce?.sezione] = (perSezione[voce?.sezione] ?? 0) + 1;
  }
  for (const [sezione, max] of Object.entries(MAX_VOCI)) {
    if ((perSezione[sezione] ?? 0) > max) errors.push(`${sezione}: più di ${max} voci`);
  }
  if (perSezione.pillola && !String(giro.giro).endsWith('-0730')) {
    errors.push('pillola ammessa solo nel giro 0730');
  }
  return errors;
};
