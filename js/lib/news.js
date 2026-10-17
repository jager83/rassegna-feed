// Selezione e formato delle voci per /news nel terminale.
const ORDINE = ['ai', 'web', 'pillola', 'sport', 'cronaca'];
const ETICHETTE = { ai: '🤖', web: '🌐', pillola: '📘', sport: '⚽', cronaca: '🌍' };

// Voci non viste, dal giro più recente; dentro il giro prima ai e web, poi le altre.
export const pickUnseen = (giri, seen, limit) =>
  giri
    .flatMap((giro) => [...giro.voci].sort((a, b) => ORDINE.indexOf(a.sezione) - ORDINE.indexOf(b.sezione)))
    .filter((voce) => !seen.has(voce.id))
    .slice(0, limit);

export const formatVoce = (voce) =>
  [
    `${ETICHETTE[voce.sezione] ?? '•'} ${voce.titolo}`,
    `   ${voce.sintesi}`,
    `   Perché: ${voce.perche}`,
    ...(voce.provalo ? [`   Provalo: ${voce.provalo}`] : []),
    ...(voce.corpo ? ['', ...voce.corpo.split('\n').map((line) => `   ${line}`), ''] : []),
    `   ${voce.fonte} · ${voce.url}`,
    `   id: ${voce.id}`,
  ].join('\n');

export const giroOfId = (id) => id.split('-').slice(0, 4).join('-');
