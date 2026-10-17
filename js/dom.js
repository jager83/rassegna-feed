// Unico punto che crea nodi DOM: solo createElement, setAttribute e testo.
// Nessuna stringa viene mai interpretata come HTML.
import { isHttpsUrl } from './lib/validate-feed.js';

const safeHref = (value) => value.startsWith('#') || isHttpsUrl(value);

export const mount = (spec, doc = document) => {
  if (typeof spec !== 'object') return doc.createTextNode(String(spec));
  const element = doc.createElement(spec.tag);
  for (const [name, value] of Object.entries(spec.attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === 'href' && !safeHref(String(value))) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of spec.children) element.append(mount(child, doc));
  return element;
};
