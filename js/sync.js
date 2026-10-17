// Invia i segnali in coda, in ordine. Si ferma al primo errore: rete assente o token
// rifiutato. La coda resta per il prossimo tentativo.
import { pushSignal } from './lib/github.js';

export const flushQueue = async (store, api) => {
  for (const signal of store.coda()) {
    try {
      await pushSignal(api, signal);
      store.togliDallaCoda(signal);
    } catch (error) {
      return { tokenError: error.status === 401 || error.status === 403 };
    }
  }
  return { tokenError: false };
};

// Un solo invio alla volta: i segnali arrivati durante un invio partono nel giro
// successivo, così sulla stessa voce l'ordine resta quello dei clic.
export const createSyncer = (store, getApi) => {
  let inFlight = null;
  let pending = false;
  const loop = async () => {
    let result = { tokenError: false };
    do {
      pending = false;
      const api = getApi();
      if (!api || !store.coda().length) break;
      result = await flushQueue(store, api);
    } while (pending && !result.tokenError);
    return result;
  };
  const run = () => {
    if (inFlight) {
      pending = true;
      return inFlight;
    }
    // Un segnale arrivato dopo l'ultimo controllo del ciclo riparte da qui.
    inFlight = loop().finally(() => {
      inFlight = null;
      if (pending) run();
    });
    return inFlight;
  };
  return run;
};
