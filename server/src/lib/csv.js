/**
 * CSV helper bersama — satu implementasi untuk survey.js dan tenant.js.
 *
 * Sebelumnya tiap route punya salinan `csvEscape` sendiri, dan keduanya
 * kehilangan dua hal: (1) escaping **CSV injection** — sel yang diawali `=`,
 * `+`, `-`, `@`, TAB, atau CR dieksekusi Excel/Sheets sebagai formula saat file
 * dibuka; (2) CR (`\r`) dianggap pemisah baris yang "aman", padahal ia memecah
 * record. Helper ini menutup keduanya.
 */

/** Karakter awal yang membuat Excel/LibreOffice memperlakukan sel sebagai formula. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Escape satu nilai CSV.
 *
 * - `null` / `undefined` → string kosong
 * - nilai lain → `String(...)`
 * - diawali `= + - @ TAB CR` → diberi prefiks `'` agar dibaca sebagai teks
 * - memuat koma, kutip, LF, atau CR → dibungkus kutip ganda, kutip di dalamnya
 *   digandakan
 *
 * @param {unknown} val
 * @returns {string}
 */
export function csvEscape(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (FORMULA_TRIGGER.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
