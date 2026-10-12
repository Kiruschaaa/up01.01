// проверки данных
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;

// куски клавиатуры, по ним видно что имя набрано "от балды" (йцук, qwer)
const KEYBOARD_ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function hasKeyboardRun(word) {
    for (const row of KEYBOARD_ROWS) {
        for (let i = 0; i + 4 <= row.length; i++) {
            if (word.includes(row.slice(i, i + 4))) return true;
        }
    }
    return false;
}

// одно слово имени: только буквы, есть гласная, нет мусора вроде "ффффф" или "йцук"
function isRealNameWord(word) {
    const low = word.toLowerCase();
    if (!/^[A-Za-zА-Яа-яЁё]+(-[A-Za-zА-Яа-яЁё]+)*$/.test(word)) return false;
    if (word.length < 2 || word.length > 25) return false;
    if (!/[аеёиоуыэюяaeiouy]/.test(low)) return false;
    if (/(.)\1\1/.test(low)) return false; // три одинаковые буквы подряд
    if (/[бвгджзйклмнпрстфхцчшщbcdfghjklmnpqrstvwxz]{5,}/.test(low)) return false; // 5 согласных подряд
    if (hasKeyboardRun(low)) return false;
    return true;
}

// ФИО: от 2 до 4 слов
function isRealFullName(value) {
    const words = String(value || '').trim().split(/\s+/);
    return words.length >= 2 && words.length <= 4 && words.every(isRealNameWord);
}

// каждое слово с большой буквы: иван петров -> Иван Петров
function normalizeName(value) {
    return String(value).trim().split(/\s+/)
        .map((word) => word.split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('-'))
        .join(' ');
}

// мат: ищем корни слов
const BAD_ROOTS = ['хуй', 'хуе', 'хуя', 'пизд', 'ебан', 'ебат', 'ебал', 'ебну', 'ебуч', 'еблан', 'ебло', 'залуп',
    'мудак', 'мудил', 'пидор', 'пидар', 'пидр', 'гандон', 'шлюх', 'блят', 'бляд', 'говн', 'дерьм', 'сучар'];
// короткие слова ищем только целиком
const BAD_WORDS = ['бля', 'хули', 'сука', 'суки', 'сучка', 'чмо', 'мразь'];
// мат латиницей
const BAD_LATIN = ['pizd', 'huy', 'xuy', 'xui', 'ebat', 'ebal', 'blya', 'blyat', 'pidor', 'pidar', 'mudak', 'gandon', 'zalup', 'suka', 'govn'];
// латинские буквы, похожие на русские (x = х, p = р)
const LOOKALIKE = { a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', b: 'в', h: 'н' };

function containsProfanity(text) {
    // латиницей: смотрим каждое слово отдельно
    const latinWords = String(text).toLowerCase().split(/[^a-z]+/);
    if (latinWords.some((word) => BAD_LATIN.some((bad) => word.includes(bad)))) return true;

    // упрощаем текст: ё -> е, латиница -> кириллица, убираем знаки и повторы букв (ууу -> у)
    const simple = String(text).toLowerCase().replace(/ё/g, 'е')
        .replace(/[a-z]/g, (ch) => LOOKALIKE[ch] || ch)
        .replace(/[^а-я\s]/g, '')
        .replace(/(.)\1+/g, '$1');
    const noSpaces = simple.replace(/\s/g, ''); // ловим "б л я т ь"

    if (BAD_ROOTS.some((root) => simple.includes(root) || noSpaces.includes(root))) return true;
    return simple.split(/\s+/).some((word) => BAD_WORDS.includes(word));
}

// пароль: от 6 символов, есть цифра и спецсимвол
function passwordError(value) {
    const p = String(value || '');
    if (p.length < 6) return 'Пароль должен быть не менее 6 символов';
    if (!/\d/.test(p)) return 'Пароль должен содержать хотя бы одну цифру';
    if (!/[!@#$%^&*(),.?":{}|<>_\-\/\\\[\]]/.test(p)) return 'Пароль должен содержать хотя бы один специальный символ';
    return null;
}

module.exports = { EMAIL_RE, PHONE_RE, isRealFullName, normalizeName, containsProfanity, passwordError };
