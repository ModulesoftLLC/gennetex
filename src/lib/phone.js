export const MONGOLIA_COUNTRY_CODE = '+976';

export function localPhoneDigits(value) {
  return String(value || '').replace(/\D/g, '').replace(/^976/, '').slice(0, 8);
}

export function normalizeMongolianPhone(value) {
  const local = localPhoneDigits(value);
  if (!/^\d{8}$/.test(local)) throw new Error('Монгол утасны дугаар 8 оронтой байна.');
  return `+976${local}`;
}

export function formatMongolianPhone(value) {
  const local = localPhoneDigits(value);
  return `+976${local ? ` ${local.slice(0, 4)}${local.length > 4 ? ` ${local.slice(4)}` : ''}` : ''}`;
}
