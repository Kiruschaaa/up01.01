const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'BuyDrinks',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '12345',
});

pool.on('connect', () => {
  console.log('Подключение к БД BuyDrinks установлено!');
  
  // АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ТАБЛИЦЫ КУПОНОВ (если её нет)
  pool.query(`
    CREATE TABLE IF NOT EXISTS Coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 99)
    )
  `).catch(err => console.error("Ошибка при проверке таблицы Coupons:", err.message));
});

// ==========================================
// 1. УСЛУГИ / НАПИТКИ
// ==========================================
app.get('/api/Services', async (req, res) => {
  try {
    const result = await pool.query('SELECT *, discount_percent AS discount FROM Services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/Services/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE Services SET discount_percent = $1 WHERE id = $2 RETURNING *',
      [req.body.discount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. КАТЕГОРИИ
// ==========================================
app.get('/api/Categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category AS name, category AS id 
      FROM Services 
      WHERE category IS NOT NULL 
      ORDER BY category ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/Categories', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO Services (name, description, duration_min, price, discount_percent, category, image)
       VALUES ($1, 'Новый напиток', 2, 100, 0, $1, '')`,
      [req.body.name]
    );
    res.status(201).json({ id: req.body.name, name: req.body.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ПОЛЬЗОВАТЕЛИ
// ==========================================
app.get('/api/Users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.password, u.role_id AS "roleId", 
             r.name AS role, u.personal_discount AS discount
      FROM Users u JOIN Roles r ON u.role_id = r.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/Users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE Users SET personal_discount = $1 WHERE id = $2 RETURNING *',
      [req.body.discount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ЗАКАЗЫ
// ==========================================
app.get('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.user_id AS "clientId", u.email AS "clientEmail",
             a.service_id AS "serviceId", s.name AS "serviceName",
             a.appointment_date AS "appointmentTime", a.status
      FROM Appointments a
      LEFT JOIN Users u ON a.user_id = u.id
      LEFT JOIN Services s ON a.service_id = s.id
      ORDER BY a.appointment_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO Appointments (user_id, service_id, appointment_date, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.body.clientId, req.body.serviceId, req.body.appointmentTime || new Date(), req.body.status || 'Оплачено']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Appointments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. КУПОНЫ
// ==========================================
app.get('/api/Coupons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Coupons ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получение купона по коду (для проверки в корзине)
app.get('/api/Coupons/:code', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Coupons WHERE code = $1', [req.params.code]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Купон не найден' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/Coupons', async (req, res) => {
  let { code, discount } = req.body;
  if (discount > 99) discount = 99; // Ограничение в 99%
  try {
    const result = await pool.query(
      'INSERT INTO Coupons (code, discount_percent) VALUES ($1, $2) RETURNING *',
      [code, discount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/Coupons/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});