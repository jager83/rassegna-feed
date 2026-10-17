// Data di oggi in ora italiana (YYYY-MM-DD). RASSEGNA_TODAY la fissa nei test.
export const todayRome = (env = process.env) =>
  env.RASSEGNA_TODAY ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
