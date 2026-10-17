// Viste come dati puri { tag, attrs, children }: le monta dom.js.
import { isHttpsUrl, validateVoce } from './lib/validate-feed.js';
import { rankBalances } from './lib/balances.js';

export const h = (tag, attrs = {}, ...children) => ({
  tag,
  attrs,
  children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false),
});

export const SEZIONI_UI = [
  ['ai', '🤖 AI & frontend'],
  ['web', '🌐 Web & Google'],
  ['pillola', '📘 Pillola del giorno'],
  ['sport', '⚽ Sport'],
  ['cronaca', '🌍 Cronaca'],
];

const formatGenerato = (iso) =>
  new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

const formatGiro = (giro) => `${giro.slice(8, 10)}/${giro.slice(5, 7)} ${giro.slice(11, 13)}:${giro.slice(13, 15)}`;

// data-apri: il clic registra l'apertura della voce (segnale per i saldi).
const link = (url, text, apri = null) =>
  isHttpsUrl(url) ? h('a', { href: url, target: '_blank', rel: 'noopener', 'data-apri': apri }, text) : h('span', {}, text);

const voteButton = (voce, voto, current) =>
  h('button', {
    type: 'button',
    class: 'vote',
    'data-id': voce.id,
    'data-voto': voto,
    'aria-pressed': current === voto ? 'true' : 'false',
    'aria-label': `${voto === 1 ? 'Mi interessa' : 'Non mi interessa'}: ${voce.titolo}`,
  }, voto === 1 ? '👍' : '👎');

export const voceView = (voce, { nuovo = false, voto = 0 } = {}) =>
  h('article', { class: `voce voce--${voce.sezione}`, 'data-id': voce.id },
    (nuovo || voce.esplorazione) && h('p', { class: 'voce__badges' },
      nuovo && h('span', { class: 'badge' }, 'nuovo'),
      voce.esplorazione && h('span', { class: 'badge badge--esplora' }, 'esplorazione')),
    h('h3', { class: 'voce__titolo' }, voce.titolo),
    h('p', { class: 'voce__sintesi' }, voce.sintesi),
    voce.corpo && h('div', { class: 'voce__corpo' }, voce.corpo.split(/\n{2,}/).map((p) => h('p', {}, p))),
    h('p', { class: 'voce__perche' }, h('strong', {}, 'Perché ti interessa: '), voce.perche),
    voce.provalo && h('p', { class: 'voce__provalo' }, h('strong', {}, 'Provalo: '),
      isHttpsUrl(voce.provalo) ? link(voce.provalo, voce.provalo, voce.id) : h('code', {}, voce.provalo)),
    h('footer', { class: 'voce__piede' },
      h('span', { class: 'voce__fonte' }, link(voce.url, voce.fonte, voce.id), ` · ${voce.data}`),
      h('span', { class: 'voce__voti' }, voteButton(voce, 1, voto), voteButton(voce, -1, voto))));

export const validVoci = (giro) => (Array.isArray(giro?.voci) ? giro.voci.filter((v) => validateVoce(v, giro.giro).length === 0) : []);

export const giroView = (giro, { letti = new Set(), segnali = {} } = {}) => {
  const voci = validVoci(giro);
  return h('section', { class: 'giro', 'aria-labelledby': 'giro-titolo' },
    h('h2', { id: 'giro-titolo', class: 'giro__titolo' }, `Aggiornato ${formatGenerato(giro.generato)}`),
    (giro.avvisi ?? []).map((avviso) => h('p', { class: 'avviso', role: 'note' }, avviso)),
    giro.scarno && h('p', { class: 'avviso', role: 'note' }, 'Giro scarno: poche notizie valide.'),
    SEZIONI_UI.map(([sezione, titolo]) => {
      const inSezione = voci.filter((v) => v.sezione === sezione);
      if (!inSezione.length) return null;
      return h('section', { class: 'sezione', 'aria-label': titolo },
        h('h2', { class: 'sezione__titolo' }, titolo),
        inSezione.map((v) => voceView(v, { nuovo: !letti.has(v.id), voto: segnali[v.id]?.voto ?? 0 })));
    }),
    !voci.length && h('p', { class: 'vuoto' }, 'Nessuna voce valida in questo giro.'));
};

export const storicoView = (index) =>
  h('section', { class: 'storico', 'aria-labelledby': 'storico-titolo' },
    h('h2', { id: 'storico-titolo' }, 'Storico (30 giorni)'),
    index.length
      ? h('ul', { class: 'storico__lista' }, index.map((e) =>
        h('li', {}, h('a', { href: `#/giro/${e.giro}` }, `${formatGiro(e.giro)} · ${e.voci} voci`))))
      : h('p', { class: 'vuoto' }, 'Ancora nessun giro pubblicato.'));

const formatPunteggio = (n) => `${n > 0 ? '+' : ''}${String(n).replace('.', ',')}`;

const saldiList = (titolo, map) => {
  const rows = rankBalances(map);
  return h('section', { class: 'saldi', 'aria-label': titolo },
    h('h3', {}, titolo),
    rows.length
      ? h('ul', {}, rows.map(({ nome, punteggio, proposte, aperture, tasso }) =>
        h('li', { class: punteggio > 0 ? 'saldo saldo--su' : punteggio < 0 ? 'saldo saldo--giu' : 'saldo' },
          h('span', {}, nome),
          h('span', { class: 'saldo__dettaglio' }, `aperte ${aperture} su ${proposte}${tasso === null ? '' : ` (${Math.round(tasso * 100)}%)`}`),
          h('span', { class: 'saldo__valore' }, formatPunteggio(punteggio)))))
      : h('p', { class: 'vuoto' }, 'Nessun dato negli ultimi 60 giorni.'));
};

export const teView = ({ tags, fonti }, fonte) =>
  h('section', { class: 'te', 'aria-labelledby': 'te-titolo' },
    h('h2', { id: 'te-titolo' }, 'Cosa ho imparato di te'),
    h('p', { class: 'nota' }, `Ultimi 60 giorni, segnali da ${fonte}. Punteggio: 👍 +1, 👎 -1, link aperto +0,5. I tag in positivo salgono nei prossimi giri, quelli in negativo scendono; anche un tag proposto spesso e mai aperto scende.`),
    saldiList('Tag', tags),
    saldiList('Fonti', fonti));

export const settingsView = ({ hasToken, pending }) =>
  h('section', { class: 'impostazioni', 'aria-labelledby': 'imp-titolo' },
    h('h2', { id: 'imp-titolo' }, 'Impostazioni'),
    h('p', {}, hasToken ? 'Token GitHub presente su questo dispositivo.' : 'Nessun token: voti e aperture restano su questo dispositivo.'),
    h('p', {}, `Voti e aperture in attesa di invio: ${pending}`),
    h('form', { id: 'token-form', class: 'token' },
      h('label', { for: 'token-input' }, 'Fine-grained token (solo Contents read/write su jager83/rassegna-segnali)'),
      h('input', { id: 'token-input', name: 'token', type: 'password', autocomplete: 'off', required: true }),
      h('button', { type: 'submit' }, 'Salva token')),
    hasToken && h('button', { type: 'button', 'data-azione': 'rimuovi-token' }, 'Rimuovi token'),
    h('p', {}, h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'Crea un token su GitHub')));

export const bannerView = ({ pending, tokenError, nonSalvabile = false }) => {
  if (tokenError) return h('p', { class: 'banner banner--errore', role: 'alert' }, `Token rifiutato: aggiornalo in Impostazioni. Segnali in attesa: ${pending}.`);
  if (pending > 0) return h('p', { class: 'banner', role: 'status' }, `Voti e aperture non sincronizzati (${pending})`);
  if (nonSalvabile) return h('p', { class: 'banner', role: 'status' }, 'Questo browser non salva lo stato: voti e aperture valgono fino alla chiusura della scheda.');
  return null;
};

export const messageView = (text) => h('p', { class: 'vuoto' }, text);
