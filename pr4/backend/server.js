// ПОДКЛЮЧЕНИЕ ЗАВИСИМОСТЕЙ
const express = require('express');       // Фреймворк для создания HTTP-сервера и маршрутизации
const cors = require('cors');             // Middleware для разрешения кросс-доменных запросов (фронтенд на другом порту)
const dotenv = require('dotenv');         // Загрузка переменных окружения из файла .env (пароли, хосты БД)
const { Pool } = require('pg');           // Клиент PostgreSQL с пулом соединений для эффективной работы с БД
const crypto = require('crypto');         // Встроенный модуль Node.js для криптографии (токены, коды сброса)
const bcrypt = require('bcryptjs');       // Библиотека для безопасного хеширования паролей
const nodemailer = require('nodemailer'); // Отправка email-уведомлений (восстановление пароля)
// Импорт функций валидации из отдельного файла (проверка email, ФИО, мата, сложности пароля)
const { EMAIL_RE, PHONE_RE, isRealFullName, normalizeName, containsProfanity, passwordError } = require('./validators');

dotenv.config(); // Инициализация переменных окружения из .env

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());            // Разрешаем запросы с любого домена (для разработки)
app.use(express.json());    // Автоматически парсим JSON-тела входящих запросов в req.body

// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// Создаем пул соединений. Пул переиспользует активные соединения, что быстрее постоянного переподключения
const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

// Логирование статуса подключения к PostgreSQL
pool.on('connect', () => console.log('Подключение к PostgreSQL установлено'));
pool.on('error', (err) => console.error('Ошибка подключения к PostgreSQL:', err));

// Эндпоинт проверки здоровья системы (используется фронтендом для показа страницы техработ)
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Тестовый запрос к БД
        res.json({ status: 'ok' });
    } catch (error) { 
        res.status(503).json({ error: 'База данных недоступна' }); 
    }
});

// КОНСТАНТЫ И НАСТРОЙКИ БИЗНЕС-ЛОГИКИ
const STATUSES = ['Ожидает оплаты', 'Оплачен', 'В работе', 'Готов к выдаче', 'Доставлен', 'Отменён'];
const FINAL_STATUSES = ['Доставлен', 'Отменён']; // Статусы, после которых заказ нельзя изменить
const UNPAID = 'Ожидает оплаты';
const PAID = 'Оплачен';
const MAX_QTY = 10;          // Максимальное количество одного товара в корзине
const DAILY_LIMIT = 10;      // Общий лимит товаров на одну дату доставки (логистика)
const WELCOME_PERCENT = 10;  // Процент скидки на первый заказ
const NO_CATEGORY = 'Без категории'; // Системная категория для товаров удаленных категорий
const REMOVED_REVIEW = 'Отзыв удалён администратором за нарушение политики'; // Текст вместо удаленного отзыва

// Настройка почтового транспорта. Если SMTP не настроен, коды будут выводиться в консоль
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) !== 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;

// СИСТЕМА ТОКЕНОВ И АВТОРИЗАЦИИ
// Секретный ключ для подписи токенов. Берется из .env или генерируется случайно при старте
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_DAYS = 7; // Срок жизни токена в днях

// Генерация HMAC-SHA256 подписи для защиты токена от подделки
const sign = (data) => crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');

// Создание токена: payload (id + срок) + подпись
async function makeToken(userId) {
    const payload = { id: userId, exp: Date.now() + TOKEN_DAYS * 24 * 3600 * 1000 };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${data}.${sign(data)}`;
}

// Извлечение токена из заголовка Authorization: Bearer <token>
const getToken = (req) => String(req.header('authorization') || '').replace('Bearer ', '');

// Проверка валидности токена: подпись, срок действия, существование пользователя в БД
async function readToken(token) {
    const [data, sig] = String(token).split('.');
    if (!data || !sig) return null;
    
    // Безопасное сравнение подписей (защита от timing attack)
    if (!crypto.timingSafeEqual(Buffer.from(sign(data)), Buffer.from(sig))) return null;
    
    let payload;
    try { payload = JSON.parse(Buffer.from(data, 'base64url').toString()); } 
    catch { return null; }
    
    // Проверка срока действия токена
    if (!payload.exp || payload.exp < Date.now()) return null;
    
    // Получение актуальных данных пользователя и его роли из БД
    const result = await pool.query(
        `SELECT u.user_id, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`,
        [payload.id]
    );
    return result.rows[0] || null;
}

// Хранилище кодов сброса пароля в оперативной памяти сервера
const resetCodes = new Map();
const lastRequest = new Map(); // Для ограничения частоты запросов на сброс (anti-spam)

// Мидлвары для проверки прав доступа

// Проверка авторизации: валидный токен -> сохранение пользователя в req.user
async function auth(req, res, next) {
    try {
        const user = await readToken(getToken(req));
        if (!user) return res.status(401).json({ error: 'Требуется авторизация, войдите заново' });
        req.user = user;
        next();
    } catch (error) { res.status(500).json({ error: error.message }); }
}

// Только для администраторов
function adminOnly(req, res, next) {
    if (req.user.role_name !== 'admin') return res.status(403).json({ error: 'Доступно только администратору' });
    next();
}

// Доступ владельцу данных или админу (для редактирования профиля, заказов)
function selfOrAdmin(paramName) {
    return (req, res, next) => {
        if (req.user.role_name === 'admin' || Number(req.params[paramName]) === req.user.user_id) return next();
        res.status(403).json({ error: 'Нет доступа к чужим данным' });
    };
}

// Только для покупателей (админ не делает заказы и не имеет корзины)
function customerOnly(req, res, next) {
    if (req.user.role_name === 'admin') return res.status(403).json({ error: 'Администратор не оформляет заказы' });
    next();
}

// Строгий доступ только владельцу (без права админа)
function selfOnly(paramName) {
    return (req, res, next) => {
        if (Number(req.params[paramName]) === req.user.user_id) return next();
        res.status(403).json({ error: 'Нет доступа к чужим данным' });
    };
}

// АУТЕНТИФИКАЦИЯ И ПРОФИЛЬ

// РЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, password, phone } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        
        // Валидация всех полей через импортированные функции
        if (!full_name?.trim() || !email || !password || !phone?.trim())
            return res.status(400).json({ error: 'Заполните все поля' });
        if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ error: 'Некорректный email' });
        if (!isRealFullName(full_name)) return res.status(400).json({ error: 'Укажите настоящие имя и фамилию' });
        if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Телефон в формате +7 (900) 123-45-67' });
        const passError = passwordError(password);
        if (passError) return res.status(400).json({ error: passError });

        // Хешируем пароль перед сохранением (никогда не храним открытые пароли!)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // CTE (WITH) позволяет вставить пользователя и сразу получить данные с ролью одним запросом
        const result = await pool.query(
            `WITH new_user AS (
                 INSERT INTO users (full_name, email, password, phone, role_id)
                 VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'user'))
                 RETURNING *
             )
             SELECT n.user_id, n.full_name, n.email, n.phone, n.address, r.role_name
             FROM new_user n JOIN roles r ON n.role_id = r.role_id`,
            [normalizeName(full_name), email, hashedPassword, phone]
        );
        
        // Возвращаем данные пользователя и сразу выдаем токен для авто-входа
        res.status(201).json({ ...result.rows[0], token: await makeToken(result.rows[0].user_id) });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
        res.status(500).json({ error: error.message });
    }
});

// АВТОРИЗАЦИЯ (ВХОД В СИСТЕМУ)
app.post('/api/auth/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim();
        const { password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Заполните email и пароль' });

        // Поиск пользователя без учета регистра email (LOWER)
        const result = await pool.query(
            `SELECT u.user_id, u.full_name, u.email, u.phone, u.address, u.password, r.role_name
             FROM users u JOIN roles r ON u.role_id = r.role_id
             WHERE LOWER(u.email) = LOWER($1)`, [email]
        );
        
        const row = result.rows[0];
        // Сравниваем введенный пароль с хешем в БД через bcrypt.compare
        if (!row || !(await bcrypt.compare(String(password), row.password)))
            return res.status(401).json({ error: 'Неверный email или пароль' });
            
        // Удаляем хеш пароля из объекта перед отправкой клиенту (безопасность)
        const { password: _hash, ...user } = row;
        res.json({ ...user, token: await makeToken(user.user_id) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ЗАПРОС КОДА ДЛЯ СБРОСА ПАРОЛЯ
app.post('/api/auth/forgot', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Введите корректный email' });
        
        // Anti-spam: не чаще раза в минуту на один email
        if (Date.now() - (lastRequest.get(email) || 0) < 60 * 1000)
            return res.status(429).json({ error: 'Новый код можно запросить через минуту' });
        lastRequest.set(email, Date.now());

        // Проверяем существование email (не раскрываем факт регистрации для безопасности)
        const found = await pool.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [email]);
        if (found.rows.length > 0) {
            const code = String(crypto.randomInt(100000, 1000000));
            // Сохраняем код в память с временем жизни 10 минут и счетчиком попыток
            resetCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000, attempts: 0 });
            
            // Отправляем письмо или пишем в консоль (если SMTP не настроен)
            if (mailer) {
                await mailer.sendMail({
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: email, subject: 'Код для сброса пароля',
                    text: `Код для сброса пароля: ${code}\nКод действует 10 минут.`
                });
            } else {
                console.log(`[сброс пароля] ${email}: ${code}`);
            }
        }
        // Всегда возвращаем одинаковое сообщение (защита от перебора email)
        res.json({ message: 'Если такой email зарегистрирован, код отправлен на почту' });
    } catch (error) { res.status(500).json({ error: 'Не удалось отправить письмо' }); }
});

// ПРОВЕРКА КОДА И СМЕНА ПАРОЛЯ
app.post('/api/auth/reset', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const { code, new_password } = req.body;
        if (!email || !code || !new_password) return res.status(400).json({ error: 'Заполните все поля' });
        
        const passError = passwordError(new_password);
        if (passError) return res.status(400).json({ error: passError });

        const entry = resetCodes.get(email);
        // Проверка срока действия и количества попыток ввода
        if (!entry || entry.expires < Date.now()) {
            resetCodes.delete(email);
            return res.status(400).json({ error: 'Код недействителен или истёк' });
        }
        if (entry.attempts >= 5) {
            resetCodes.delete(email);
            return res.status(400).json({ error: 'Слишком много попыток' });
        }
        if (String(code).trim() !== entry.code) {
            entry.attempts++;
            return res.status(400).json({ error: 'Неверный код' });
        }

        // Обновляем пароль в БД (хешируем новый пароль)
        await pool.query('UPDATE users SET password = $1 WHERE LOWER(email) = $2', 
            [await bcrypt.hash(new_password, 10), email]);
        resetCodes.delete(email); // Удаляем использованный код
        res.json({ message: 'Пароль изменён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ОБНОВЛЕНИЕ ЛИЧНЫХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
app.put('/api/users/:id', auth, selfOnly('id'), async (req, res) => {
    try {
        const { full_name, phone, address } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        
        if (!full_name?.trim() || !email || !phone?.trim())
            return res.status(400).json({ error: 'ФИО, email и телефон обязательны' });
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Некорректный email' });
        if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Некорректный телефон' });

        // Проверяем ФИО только если оно изменилось (экономим ресурсы валидации)
        const current = await pool.query('SELECT full_name FROM users WHERE user_id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        
        const sameName = full_name.trim() === current.rows[0].full_name;
        if (!sameName && !isRealFullName(full_name)) 
            return res.status(400).json({ error: 'Укажите настоящие имя и фамилию' });

        const result = await pool.query(
            `UPDATE users SET full_name = $1, email = $2, phone = $3, address = $4 WHERE user_id = $5 RETURNING *`,
            [sameName ? current.rows[0].full_name : normalizeName(full_name), email, phone, address?.trim() || null, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Этот email уже занят' });
        res.status(500).json({ error: error.message });
    }
});

// СМЕНА ПАРОЛЯ В ЛИЧНОМ КАБИНЕТЕ
app.put('/api/users/:id/password', auth, selfOnly('id'), async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) return res.status(400).json({ error: 'Введите текущий и новый пароль' });
        
        const passError = passwordError(new_password);
        if (passError) return res.status(400).json({ error: passError });

        // Проверяем старый пароль перед установкой нового
        const found = await pool.query('SELECT password FROM users WHERE user_id = $1', [req.params.id]);
        if (found.rows.length === 0 || !(await bcrypt.compare(String(old_password), found.rows[0].password)))
            return res.status(400).json({ error: 'Текущий пароль неверный' });

        await pool.query('UPDATE users SET password = $1 WHERE user_id = $2', 
            [await bcrypt.hash(new_password, 10), req.params.id]);
        res.json({ message: 'Пароль изменён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ТОЛЬКО АДМИН)
app.get('/api/users', auth, adminOnly, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.user_id, u.full_name, u.email, u.phone, u.address, r.role_name
            FROM users u JOIN roles r ON u.role_id = r.role_id ORDER BY u.full_name`);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ АДМИНИСТРАТОРОМ
app.post('/api/users', auth, adminOnly, async (req, res) => {
    try {
        const { full_name, password, phone } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        
        if (!full_name?.trim() || !email || !password || !phone?.trim()) 
            return res.status(400).json({ error: 'Заполните все поля' });
        if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Некорректный email' });
        if (!isRealFullName(full_name)) return res.status(400).json({ error: 'Укажите настоящие имя и фамилию' });
        if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Некорректный телефон' });
        const passError = passwordError(password);
        if (passError) return res.status(400).json({ error: passError });

        await pool.query(
            `INSERT INTO users (full_name, email, password, phone, role_id)
             VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'user'))`,
            [normalizeName(full_name), email, await bcrypt.hash(password, 10), phone]
        );
        res.status(201).json({ message: 'Пользователь добавлен' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
        res.status(500).json({ error: error.message });
    }
});

// УПРАВЛЕНИЕ КАТЕГОРИЯМИ

// Получение списка категорий (доступно всем)
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY category_name');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Добавление категории (только админ)
app.post('/api/categories', auth, adminOnly, async (req, res) => {
    try {
        const name = req.body.category_name?.trim();
        if (!name || name.length > 60) return res.status(400).json({ error: 'Название категории не длиннее 60 символов' });
        const result = await pool.query('INSERT INTO categories (category_name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Такая категория уже есть' });
        res.status(500).json({ error: error.message });
    }
});

// Переименование категории (только админ)
app.put('/api/categories/:id', auth, adminOnly, async (req, res) => {
    try {
        const name = req.body.category_name?.trim();
        if (!name || name.length > 60) return res.status(400).json({ error: 'Название категории не длиннее 60 символов' });
        
        const current = await pool.query('SELECT category_name FROM categories WHERE category_id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });
        if (current.rows[0].category_name === NO_CATEGORY)
            return res.status(400).json({ error: `Категорию «${NO_CATEGORY}» нельзя переименовать` });

        await pool.query('UPDATE categories SET category_name = $1 WHERE category_id = $2', [name, req.params.id]);
        res.json({ message: 'Категория изменена' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Такая категория уже есть' });
        res.status(500).json({ error: error.message });
    }
});

// Удаление категории с переносом товаров в системную категорию (транзакция)
app.delete('/api/categories/:id', auth, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
        const current = await client.query('SELECT category_name FROM categories WHERE category_id = $1', [req.params.id]);
        if (current.rows.length === 0) return res.status(404).json({ error: 'Категория не найдена' });
        if (current.rows[0].category_name === NO_CATEGORY)
            return res.status(400).json({ error: `Категорию «${NO_CATEGORY}» удалить нельзя` });

        await client.query('BEGIN'); // Начало транзакции
        // Создаем "Без категории", если её еще нет
        await client.query('INSERT INTO categories (category_name) VALUES ($1) ON CONFLICT DO NOTHING', [NO_CATEGORY]);
        // Переносим товары удаляемой категории в "Без категории"
        await client.query(
            'UPDATE products SET category_id = (SELECT category_id FROM categories WHERE category_name = $1) WHERE category_id = $2',
            [NO_CATEGORY, req.params.id]
        );
        await client.query('DELETE FROM categories WHERE category_id = $1', [req.params.id]);
        await client.query('COMMIT'); // Фиксация изменений
        res.json({ message: `Категория удалена, товары перенесены в «${NO_CATEGORY}»` });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {}); // Откат при ошибке
        res.status(500).json({ error: error.message });
    } finally { client.release(); }
});

// УПРАВЛЕНИЕ ТОВАРАМИ

// Валидация данных товара перед сохранением
function validateProduct({ name, description, warranty_months, price, category_name, image }) {
    if (!name?.trim() || !description?.trim() || !category_name) return 'Заполните название, описание и категорию';
    if (name.trim().length > 100) return 'Название не длиннее 100 символов';
    if (!/^\d+$/.test(String(warranty_months)) || Number(warranty_months) < 1 || Number(warranty_months) > 600)
        return 'Гарантия: целое число от 1 до 600 месяцев';
    if (!/^\d+$/.test(String(price)) || Number(price) < 1 || Number(price) > 10000000) 
        return 'Цена должна быть целым числом от 1 до 10 млн';
    if (image && !/^https?:\/\/\S+$/i.test(String(image).trim())) 
        return 'Ссылка на фото должна начинаться с http:// или https://';
    return null;
}

// Получение списка товаров с названиями категорий (LEFT JOIN)
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.product_id, s.name, s.description, s.warranty_months, s.price, s.image,
                   COALESCE(c.category_name, 'Нет категории') AS category_name
            FROM products s LEFT JOIN categories c ON s.category_id = c.category_id
            ORDER BY s.name`);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Получение одного товара по ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.product_id, s.name, s.description, s.warranty_months, s.price, s.image,
                   COALESCE(c.category_name, 'Нет категории') AS category_name
            FROM products s LEFT JOIN categories c ON s.category_id = c.category_id
            WHERE s.product_id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Товар не найден' });
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Добавление товара (только админ)
app.post('/api/products', auth, adminOnly, async (req, res) => {
    try {
        const message = validateProduct(req.body);
        if (message) return res.status(400).json({ error: message });
        
        const { name, description, warranty_months, price, category_name, image } = req.body;
        // Проверяем существование категории перед вставкой
        const cat = await pool.query('SELECT 1 FROM categories WHERE category_name = $1', [category_name]);
        if (cat.rows.length === 0) return res.status(400).json({ error: 'Такой категории нет' });

        await pool.query(
            `INSERT INTO products (name, description, warranty_months, price, category_id, image)
             VALUES ($1, $2, $3, $4, (SELECT category_id FROM categories WHERE category_name = $5), $6)`,
            [name.trim(), description.trim(), warranty_months, price, category_name, image || null]
        );
        res.status(201).json({ message: 'Товар добавлен' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Изменение товара (только админ)
app.put('/api/products/:id', auth, adminOnly, async (req, res) => {
    try {
        const message = validateProduct(req.body);
        if (message) return res.status(400).json({ error: message });
        
        const { name, description, warranty_months, price, category_name, image } = req.body;
        const cat = await pool.query('SELECT 1 FROM categories WHERE category_name = $1', [category_name]);
        if (cat.rows.length === 0) return res.status(400).json({ error: 'Такой категории нет' });

        const upd = await pool.query(
            `UPDATE products SET name = $1, description = $2, warranty_months = $3, price = $4,
                category_id = (SELECT category_id FROM categories WHERE category_name = $5), image = $6
             WHERE product_id = $7`,
            [name.trim(), description.trim(), warranty_months, price, category_name, image || null, req.params.id]
        );
        if (upd.rowCount === 0) return res.status(404).json({ error: 'Товар не найден' });
        res.json({ message: 'Товар изменён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Удаление товара (только админ)
app.delete('/api/products/:id', auth, adminOnly, async (req, res) => {
    try {
        const del = await pool.query('DELETE FROM products WHERE product_id = $1', [req.params.id]);
        if (del.rowCount === 0) return res.status(404).json({ error: 'Товар не найден' });
        res.json({ message: 'Товар удалён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ОТЗЫВЫ К ТОВАРАМ

// Получение отзывов к товару (помечает отзыв текущего пользователя как mine)
app.get('/api/products/:id/reviews', async (req, res) => {
    try {
        const me = await readToken(getToken(req));
        const uid = me ? me.user_id : 0;
        const result = await pool.query(`
            SELECT r.review_id, u.full_name, r.rating, r.comment, TO_CHAR(r.created_at, 'DD.MM.YYYY') AS created_date,
                   (r.user_id = $2) AS mine
            FROM reviews r JOIN users u ON r.user_id = u.user_id
            WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [req.params.id, uid]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Валидация отзыва
function validateReview({ rating, comment }) {
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) 
        return 'Оценка должна быть целым числом от 1 до 5';
    const text = String(comment || '').trim();
    if (text.length < 3 || !/[A-Za-zА-Яа-яЁё]/.test(text)) 
        return 'Напишите осмысленный комментарий (не короче 3 символов)';
    if (text.length > 500) return 'Комментарий слишком длинный (до 500 символов)';
    if (containsProfanity(text)) return 'В отзыве нельзя использовать нецензурные слова';
    return null;
}

// Добавление отзыва (только авторизованный, один отзыв на товар)
app.post('/api/reviews', auth, async (req, res) => {
    try {
        const message = validateReview(req.body);
        if (message) return res.status(400).json({ error: message });
        
        const { product_id, rating, comment } = req.body;
        if (!Number.isInteger(Number(product_id))) return res.status(400).json({ error: 'Товар не найден' });
        
        // Проверка: пользователь уже оставлял отзыв на этот товар?
        const exists = await pool.query('SELECT 1 FROM reviews WHERE user_id = $1 AND product_id = $2', [req.user.user_id, product_id]);
        if (exists.rows.length > 0) return res.status(400).json({ error: 'Вы уже оставили отзыв на этот товар' });

        await pool.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [req.user.user_id, product_id, rating, comment.trim()]
        );
        res.status(201).json({ message: 'Отзыв добавлен' });
    } catch (error) {
        if (error.code === '23503') return res.status(400).json({ error: 'Товар не найден' });
        res.status(500).json({ error: error.message });
    }
});

// Изменение отзыва (только админ)
app.put('/api/reviews/:id', auth, adminOnly, async (req, res) => {
    try {
        const message = validateReview(req.body);
        if (message) return res.status(400).json({ error: message });
        
        const old = await pool.query('SELECT comment FROM reviews WHERE review_id = $1', [req.params.id]);
        if (old.rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
        if (old.rows[0].comment === REMOVED_REVIEW) return res.status(400).json({ error: 'Удалённый отзыв нельзя изменить' });

        await pool.query('UPDATE reviews SET rating = $1, comment = $2 WHERE review_id = $3',
            [req.body.rating, req.body.comment.trim(), req.params.id]);
        res.json({ message: 'Отзыв изменён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Удаление отзыва (мягкое удаление: замена текста на заглушку)
app.delete('/api/reviews/:id', auth, adminOnly, async (req, res) => {
    try {
        const upd = await pool.query('UPDATE reviews SET comment = $1 WHERE review_id = $2', [REMOVED_REVIEW, req.params.id]);
        if (upd.rowCount === 0) return res.status(404).json({ error: 'Отзыв не найден' });
        res.json({ message: 'Отзыв удалён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// КОРЗИНА ПОКУПАТЕЛЯ

// Получение содержимого корзины пользователя
app.get('/api/cart/:userId', auth, selfOnly('userId'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.product_id, s.name, s.warranty_months, s.price, ci.quantity
            FROM cart_items ci JOIN products s ON ci.product_id = s.product_id
            WHERE ci.user_id = $1 ORDER BY s.name`, [req.params.userId]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Добавление товара в корзину (с проверкой лимитов)
app.post('/api/cart', auth, customerOnly, async (req, res) => {
    try {
        if (!Number.isInteger(Number(req.body.product_id))) return res.status(400).json({ error: 'Товар не найден' });
        
        // Проверка лимита на один товар
        const current = await pool.query('SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2', 
            [req.user.user_id, req.body.product_id]);
        if (current.rows.length > 0 && current.rows[0].quantity >= MAX_QTY)
            return res.status(400).json({ error: `Не больше ${MAX_QTY} шт. одного товара` });

        // Проверка общего лимита корзины
        const all = await pool.query('SELECT COALESCE(SUM(quantity), 0)::int AS qty FROM cart_items WHERE user_id = $1', 
            [req.user.user_id]);
        if (all.rows[0].qty >= DAILY_LIMIT)
            return res.status(400).json({ error: `В корзине не больше ${DAILY_LIMIT} товаров` });

        // UPSERT: добавляем или увеличиваем количество
        await pool.query(
            `INSERT INTO cart_items (user_id, product_id) VALUES ($1, $2)
             ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + 1`,
            [req.user.user_id, req.body.product_id]
        );
        res.status(201).json({ message: 'Добавлено в корзину' });
    } catch (error) {
        if (error.code === '23503') return res.status(400).json({ error: 'Товар не найден' });
        res.status(500).json({ error: error.message });
    }
});

// Изменение количества товара в корзине
app.put('/api/cart', auth, customerOnly, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)
            return res.status(400).json({ error: 'Количество должно быть не меньше 1' });
        if (Number(quantity) > MAX_QTY) return res.status(400).json({ error: `Не больше ${MAX_QTY} шт.` });

        const exists = await pool.query('SELECT 1 FROM cart_items WHERE user_id = $1 AND product_id = $2', 
            [req.user.user_id, product_id]);
        if (exists.rows.length === 0) return res.status(404).json({ error: 'Товара нет в корзине' });

        // Проверка общего лимита с учетом других товаров
        const others = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0)::int AS qty FROM cart_items WHERE user_id = $1 AND product_id <> $2', 
            [req.user.user_id, product_id]);
        if (others.rows[0].qty + Number(quantity) > DAILY_LIMIT)
            return res.status(400).json({ error: `В корзине не больше ${DAILY_LIMIT} товаров` });

        const upd = await pool.query('UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
            [quantity, req.user.user_id, product_id]);
        if (upd.rowCount === 0) return res.status(404).json({ error: 'Товара нет в корзине' });
        res.json({ message: 'Количество изменено' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Удаление товара из корзины
app.delete('/api/cart/:userId/:productId', auth, selfOnly('userId'), async (req, res) => {
    try {
        await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', 
            [req.params.userId, req.params.productId]);
        res.json({ message: 'Удалено из корзины' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// КУПОНЫ И СКИДКИ

// Проверка приветственной скидки (действует только на первый заказ)
async function welcomePercent(db, userId) {
    const result = await db.query('SELECT 1 FROM orders WHERE user_id = $1 AND status <> $2 LIMIT 1', [userId, 'Отменён']);
    return result.rows.length === 0 ? WELCOME_PERCENT : 0;
}

// Поиск usable купона (активный, не использованный этим пользователем)
async function findUsableCoupon(db, userId, rawCode) {
    const found = await db.query(
        'SELECT coupon_id, code, discount_percent, active FROM coupons WHERE UPPER(code) = UPPER($1)', [String(rawCode).trim()]);
    if (found.rows.length === 0) return { error: 'Купон не найден' };
    const coupon = found.rows[0];
    if (!coupon.active) return { error: 'Этот купон отключён' };
    const used = await db.query('SELECT 1 FROM coupon_uses WHERE user_id = $1 AND coupon_id = $2', [userId, coupon.coupon_id]);
    if (used.rows.length > 0) return { error: 'Вы уже использовали этот купон' };
    return { coupon };
}

// Выбор лучшей скидки: приветственная vs купон
async function pickDiscount(db, userId, rawCode) {
    const welcome = await welcomePercent(db, userId);
    let best = { percent: welcome, note: welcome ? 'Скидка на первый заказ' : null, couponId: null };
    
    if (String(rawCode || '').trim()) {
        const result = await findUsableCoupon(db, userId, rawCode);
        if (result.error) return { error: result.error };
        if (result.coupon.discount_percent > best.percent)
            best = { percent: result.coupon.discount_percent, note: `Купон ${result.coupon.code}`, couponId: result.coupon.coupon_id };
    }
    return best;
}

// Проверка купона перед оформлением заказа
app.post('/api/coupons/check', auth, async (req, res) => {
    try {
        if (req.user.role_name === 'admin') return res.status(403).json({ error: 'Купоны применяются только покупателями' });
        if (!String(req.body.code || '').trim()) return res.status(400).json({ error: 'Введите код купона' });
        
        const result = await findUsableCoupon(pool, req.user.user_id, req.body.code);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ code: result.coupon.code, percent: result.coupon.discount_percent });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Валидация данных купона
function validateCoupon({ code, discount_percent }) {
    if (!/^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(String(code || '').trim()))
        return 'Код купона: 3-20 символов (буквы, цифры, «-» и «_»)';
    const percent = Number(discount_percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) return 'Скидка от 1 до 90 %';
    return null;
}

// CRUD купонов (только админ)
app.get('/api/coupons', auth, adminOnly, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.coupon_id, c.code, c.discount_percent, c.active,
                   (SELECT COUNT(*)::int FROM coupon_uses cu WHERE cu.coupon_id = c.coupon_id) AS uses
            FROM coupons c ORDER BY c.code`);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/coupons', auth, adminOnly, async (req, res) => {
    try {
        const message = validateCoupon(req.body);
        if (message) return res.status(400).json({ error: message });
        const result = await pool.query(
            'INSERT INTO coupons (code, discount_percent) VALUES (UPPER($1), $2) RETURNING coupon_id, code, discount_percent, active',
            [String(req.body.code).trim(), Number(req.body.discount_percent)]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Такой купон уже есть' });
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/coupons/:id', auth, adminOnly, async (req, res) => {
    try {
        const message = validateCoupon(req.body);
        if (message) return res.status(400).json({ error: message });
        await pool.query(
            'UPDATE coupons SET code = UPPER($1), discount_percent = $2, active = $3 WHERE coupon_id = $4',
            [String(req.body.code).trim(), Number(req.body.discount_percent), req.body.active !== false, req.params.id]);
        res.json({ message: 'Купон изменён' });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Такой купон уже есть' });
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/coupons/:id', auth, adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE coupon_id = $1', [req.params.id]);
        res.json({ message: 'Купон удалён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Получение размера приветственной скидки для пользователя
app.get('/api/users/:id/welcome-discount', auth, selfOrAdmin('id'), async (req, res) => {
    try {
        res.json({ percent: await welcomePercent(pool, req.params.id) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ОФОРМЛЕНИЕ ЗАКАЗОВ

// Подсчет забронированных товаров на дату (исключая отмененные)
async function getBookedCount(db, date) {
    const result = await db.query(
        `SELECT COALESCE(SUM(oi.quantity), 0)::int AS booked
         FROM orders o JOIN order_items oi ON o.order_id = oi.order_id
         WHERE o.delivery_date = $1 AND o.status <> 'Отменён'`, [date]);
    return result.rows[0].booked;
}

// Проверка формата даты ГГГГ-ММ-ДД
function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !isNaN(d) && d.toISOString().slice(0, 10) === value;
}

// Проверка доступности слотов доставки на дату
app.get('/api/orders/availability', auth, customerOnly, async (req, res) => {
    try {
        const date = req.query.date;
        if (!validDate(date)) return res.status(400).json({ error: 'Некорректная дата' });
        const booked = await getBookedCount(pool, date);
        res.json({ limit: DAILY_LIMIT, booked, free: Math.max(DAILY_LIMIT - booked, 0) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ОФОРМЛЕНИЕ ЗАКАЗА (АТОМАРНАЯ ТРАНЗАКЦИЯ)
app.post('/api/orders', auth, customerOnly, async (req, res) => {
    const client = await pool.connect();
    let began = false;
    try {
        const user_id = req.user.user_id;
        const { delivery_address, delivery_date, coupon_code } = req.body;

        // Валидация адреса и даты
        if (!delivery_address?.trim() || !delivery_date)
            return res.status(400).json({ error: 'Укажите адрес и дату доставки' });
        if (delivery_address.trim().length < 5 || delivery_address.trim().length > 255)
            return res.status(400).json({ error: 'Адрес доставки: от 5 до 255 символов' });
        if (!validDate(delivery_date)) return res.status(400).json({ error: 'Некорректная дата' });

        const past = await client.query(
            `SELECT $1::date < CURRENT_DATE AS past, $1::date > CURRENT_DATE + INTERVAL '1 year' AS far`, [delivery_date]);
        if (past.rows[0].past) return res.status(400).json({ error: 'Дата не может быть в прошлом' });
        if (past.rows[0].far) return res.status(400).json({ error: 'Доставка не дальше чем на год вперед' });

        // Проверка пустой корзины и товаров с нулевой ценой
        const cart = await client.query('SELECT 1 FROM cart_items WHERE user_id = $1', [user_id]);
        if (cart.rows.length === 0) return res.status(400).json({ error: 'Корзина пуста' });
        const free = await client.query(
            'SELECT 1 FROM cart_items ci JOIN products s ON ci.product_id = s.product_id WHERE ci.user_id = $1 AND s.price <= 0', [user_id]);
        if (free.rows.length > 0) return res.status(400).json({ error: 'В корзине есть товар с нулевой ценой' });

        await client.query('BEGIN');
        began = true;

        // Advisory lock: блокировка даты для предотвращения овербукинга при параллельных заказах
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [delivery_date]);
        
        // Проверка свободных мест на выбранную дату
        const booked = await getBookedCount(client, delivery_date);
        const inCart = await client.query('SELECT COALESCE(SUM(quantity), 0)::int AS qty FROM cart_items WHERE user_id = $1', [user_id]);
        const freePlaces = Math.max(DAILY_LIMIT - booked, 0);
        
        if (inCart.rows[0].qty > freePlaces) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: freePlaces === 0
                    ? 'На эту дату все слоты заняты'
                    : `Свободно только ${freePlaces} мест, а в корзине ${inCart.rows[0].qty}`
            });
        }

        // Расчет скидки (приветственная или купон, выбирается лучшая)
        const discount = await pickDiscount(client, user_id, coupon_code);
        if (discount.error) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: discount.error });
        }

        // Создание заказа с применением скидки
        const order = await client.query(
            `INSERT INTO orders (user_id, customer_name, customer_phone, delivery_address, delivery_date, status, total, discount_percent, discount_note)
             SELECT $1, u.full_name, u.phone, $2, $3, $4, 
                    ROUND(SUM(s.price * ci.quantity) * (100 - $5::int) / 100.0), $5::int, $6::text
             FROM cart_items ci JOIN products s ON ci.product_id = s.product_id JOIN users u ON u.user_id = ci.user_id
             WHERE ci.user_id = $1 GROUP BY u.full_name, u.phone RETURNING order_id`,
            [user_id, delivery_address.trim(), delivery_date, UNPAID, discount.percent, discount.note]
        );

        // Перенос товаров из корзины в состав заказа (сохраняем цену на момент покупки)
        await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
             SELECT $1, ci.product_id, s.name, ci.quantity, s.price
             FROM cart_items ci JOIN products s ON ci.product_id = s.product_id WHERE ci.user_id = $2`,
            [order.rows[0].order_id, user_id]
        );

        // Фиксация использования купона (если применился)
        if (discount.couponId)
            await client.query('INSERT INTO coupon_uses (user_id, coupon_id, order_id) VALUES ($1, $2, $3)',
                [user_id, discount.couponId, order.rows[0].order_id]);
        
        // Очистка корзины пользователя
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [user_id]);
        await client.query('COMMIT');
        
        res.json({ message: 'Заказ оформлен', order_number: order.rows[0].order_id });
    } catch (error) {
        if (began) await client.query('ROLLBACK').catch(() => {});
        res.status(500).json({ error: error.message });
    } finally { client.release(); }
});

// Заказы конкретного пользователя
app.get('/api/users/:id/orders', auth, selfOrAdmin('id'), async (req, res) => {
    try {
        const ordersQuery = `
            SELECT o.order_id, o.order_id AS order_number, o.user_id, 
                   COALESCE(u.full_name, o.customer_name) AS full_name, 
                   COALESCE(u.phone, o.customer_phone) AS phone,
                   (o.user_id IS NULL) AS user_deleted,
                   TO_CHAR(o.created_at, 'DD.MM.YYYY') AS created_date,
                   o.delivery_address, TO_CHAR(o.delivery_date, 'DD.MM.YYYY') AS delivery_date,
                   o.status, o.total, o.discount_percent, o.discount_note, o.created_at,
                   (SELECT STRING_AGG(COALESCE(s.name, oi.product_name) || ' × ' || oi.quantity, ', ' ORDER BY oi.order_item_id)
                    FROM order_items oi LEFT JOIN products s ON oi.product_id = s.product_id
                    WHERE oi.order_id = o.order_id) AS items
            FROM orders o LEFT JOIN users u ON o.user_id = u.user_id`;
            
        const result = await pool.query(`${ordersQuery} WHERE user_id = $1 ORDER BY created_at DESC`, [req.params.id]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Оплата заказа (только свой, только из статуса "Ожидает оплаты")
app.put('/api/orders/:id/pay', auth, customerOnly, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE order_id = $2 AND user_id = $3 AND status = $4',
            [PAID, req.params.id, req.user.user_id, UNPAID]);
        if (result.rowCount === 0) return res.status(400).json({ error: 'Заказ не найден или уже оплачен' });
        res.json({ message: 'Заказ оплачен' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Все заказы (только админ)
app.get('/api/orders', auth, adminOnly, async (req, res) => {
    try {
        const ordersQuery = `
            SELECT o.order_id, o.order_id AS order_number, o.user_id, 
                   COALESCE(u.full_name, o.customer_name) AS full_name, 
                   COALESCE(u.phone, o.customer_phone) AS phone,
                   (o.user_id IS NULL) AS user_deleted,
                   TO_CHAR(o.created_at, 'DD.MM.YYYY') AS created_date,
                   o.delivery_address, TO_CHAR(o.delivery_date, 'DD.MM.YYYY') AS delivery_date,
                   o.status, o.total, o.discount_percent, o.discount_note, o.created_at,
                   (SELECT STRING_AGG(COALESCE(s.name, oi.product_name) || ' × ' || oi.quantity, ', ' ORDER BY oi.order_item_id)
                    FROM order_items oi LEFT JOIN products s ON oi.product_id = s.product_id
                    WHERE oi.order_id = o.order_id) AS items
            FROM orders o LEFT JOIN users u ON o.user_id = u.user_id`;
            
        const result = await pool.query(`${ordersQuery} ORDER BY created_at DESC`);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Смена статуса заказа (только админ, с проверкой логики переходов)
app.put('/api/orders/:id/status', auth, adminOnly, async (req, res) => {
    try {
        if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Недопустимый статус' });
        
        const cur = await pool.query('SELECT status FROM orders WHERE order_id = $1', [req.params.id]);
        if (cur.rows.length === 0) return res.status(404).json({ error: 'Заказ не найден' });
        if (FINAL_STATUSES.includes(cur.rows[0].status)) 
            return res.status(400).json({ error: 'Заказ завершён, статус изменить нельзя' });
            
        // Логика переходов статусов
        if (req.body.status === UNPAID && cur.rows[0].status !== UNPAID)
            return res.status(400).json({ error: 'Оплаченный заказ нельзя вернуть в ожидание' });
        if (cur.rows[0].status === UNPAID && ![UNPAID, PAID, 'Отменён'].includes(req.body.status))
            return res.status(400).json({ error: 'Сначала заказ должен быть оплачен' });

        await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [req.body.status, req.params.id]);
        
        // При отмене заказа возвращаем использованный купон
        if (req.body.status === 'Отменён') 
            await pool.query('DELETE FROM coupon_uses WHERE order_id = $1', [req.params.id]);
            
        res.json({ message: 'Статус изменён' });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// Обработка неизвестных API-адресов
app.use('/api', (req, res) => res.status(404).json({ error: 'Такого адреса API нет' }));

// Глобальный обработчик ошибок
app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.status === 400 ? 'Некорректный запрос' : 'Ошибка сервера' }));

// Запуск сервера
app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));