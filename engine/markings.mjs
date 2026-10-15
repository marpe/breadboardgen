// Component markings derived from values, shared by tooltips and drawn parts so they always agree.

const DIGITS = [
  ["black", "#1A1A18"], ["brown", "#7A4A1E"], ["red", "#D23B2A"], ["orange", "#EB7A1C"], ["yellow", "#F2C81F"],
  ["green", "#2E8B3E"], ["blue", "#2F5FBF"], ["violet", "#7D4BB5"], ["grey", "#8A8A86"], ["white", "#F4F4F0"],
];
const GOLD = ["gold", "#C9A227"];
const SILVER = ["silver", "#B8B8B4"];

// Leading two significant digits and the power of ten that scales them, e.g. 27 000 -> [27, 3].
const sig2 = (n) => {
  let exp = Math.floor(Math.log10(n)) - 1;
  let digits = Math.round(n / 10 ** exp);
  if (digits >= 100) {
    digits = Math.round(digits / 10);
    exp++;
  }
  return [digits, exp];
};

// 4-band, 5 % code: two digits, multiplier, gold tolerance. Returns [name, hex] pairs.
export const bands4 = (ohms) => {
  const [digits, exp] = sig2(ohms);
  const mult = exp === -1 ? GOLD : exp === -2 ? SILVER : DIGITS[exp];
  return [DIGITS[Math.floor(digits / 10)], DIGITS[digits % 10], mult, GOLD];
};

// Three-digit EIA code used on film caps (in pF) and trimmers (in Ω): 1 µF -> "105", 100 kΩ -> "104".
export const code3 = (n) => {
  const [digits, exp] = sig2(n);
  return `${digits}${exp}`;
};

const num = (n) => String(+n.toPrecision(3));
export const formatOhms = (ohms) => (ohms >= 1e6 ? `${num(ohms / 1e6)} MΩ` : ohms >= 1e3 ? `${num(ohms / 1e3)} kΩ` : `${num(ohms)} Ω`);
export const formatFarads = (farads) => `${num(farads * 1e6)} µF`;

const withNote = (text, note) => (note ? `${text}, ${note}` : text);

// Tooltip info entries: { type, value, bands? | mark? }.
export const resistor = (type, ohms, note) => ({ type, value: withNote(formatOhms(ohms), note), bands: bands4(ohms) });
export const filmCap = (type, farads) => ({ type, value: formatFarads(farads), mark: `Printed "${code3(farads * 1e12)}"` });
export const elcoCap = (type, farads, note) => ({ type, value: withNote(formatFarads(farads), note), mark: "Stripe marks the − leg" });
export const trimmer = (type, ohms) => ({ type, value: formatOhms(ohms), mark: `Printed "${code3(ohms)}"` });
export const transistor = (type, part, mark) => ({ type, value: part, mark });
export const plain = (type, value, mark) => ({ type, value, ...(mark ? { mark } : {}) });
