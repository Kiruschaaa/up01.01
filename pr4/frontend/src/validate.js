// проверки форм (такие же как на сервере)
export const EMAIL_RE = /^\S+@\S+\.\S+$/;
export const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

// маска телефона +7 (900) 123-45-67
export function formatPhone(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (d && !d.startsWith("7")) d = "7" + d;
  const p = d.slice(1, 11);
  let r = d ? "+7" : "";
  if (p.length > 0) r += " (" + p.slice(0, 3);
  if (p.length > 3) r += ") " + p.slice(3, 6);
  if (p.length > 6) r += "-" + p.slice(6, 8);
  if (p.length > 8) r += "-" + p.slice(8, 10);
  return r;
}

// фио: 2-4 слова, только буквы
const KEYBOARD = [['йцукенгшщзхъ', 4], ['фывапролджэ', 5], ['ячсмитьбю', 4], ['qwertyuiop', 4], ['asdfghjkl', 4], ['zxcvbnm', 4]]
  .flatMap(([row, n]) => Array.from({ length: row.length - n + 1 }, (_, i) => row.slice(i, i + n)));
export function isRealFullName(value) {
  const parts = String(value || "").trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  return parts.every((w) => {
    const low = w.toLowerCase();
    return /^[A-Za-zА-Яа-яЁё]+(-[A-Za-zА-Яа-яЁё]+)*$/.test(w)
      && w.length >= 2 && w.length <= 25
      && /[аеёиоуыэюяaeiouy]/.test(low)
      && !/^[ьъы]/.test(low)
      && !/(.)\1\1/.test(low)
      && !/[бвгджзйклмнпрстфхцчшщbcdfghjklmnpqrstvwxz]{5,}/.test(low)
      && !/фы|[жчшщ]ы|ъ|ьь/.test(low)
      && !(w.replace(/-/g, '').length >= 5 && new Set(low.replace(/-/g, '')).size <= 2)
      && !KEYBOARD.some((k) => low.includes(k));
  });
}

// каждое слово с большой буквы
export function normalizeName(value) {
  return String(value).trim().split(/\s+/)
    .map((w) => w.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-"))
    .join(" ");
}

export const NAME_ERROR = "Укажите настоящие имя и фамилию";
export const PHONE_ERROR = "Телефон в формате +7 (900) 123-45-67";

// пароль: от 6 символов, цифра и спецсимвол
export function passwordError(value) {
  const p = String(value || "");
  if (p.length < 6) return "Пароль должен быть не менее 6 символов";
  if (!/\d/.test(p)) return "Пароль должен содержать хотя бы одну цифру";
  if (!/[!@#$%^&*(),.?":{}|<>_\-\/\\\[\]]/.test(p)) return "Пароль должен содержать хотя бы один специальный символ";
  return null;
}
