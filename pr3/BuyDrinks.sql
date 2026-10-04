-- 0. Очистка таблиц перед созданием
DROP TABLE IF EXISTS Payments CASCADE;
DROP TABLE IF EXISTS Appointments CASCADE;
DROP TABLE IF EXISTS Services CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;

-- 1. ТАБЛИЦА РОЛЕЙ (Roles)
CREATE TABLE Roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ (Users)
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES Roles(id) ON DELETE RESTRICT,
    coupon_type VARCHAR(50) DEFAULT 'NONE',        -- Вид скидочного купона (WELCOME_10, VIP_20 и т.д.)
    personal_discount INT DEFAULT 0 CHECK (personal_discount BETWEEN 0 AND 100), -- Персональная скидка от админа
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ТАБЛИЦА УСЛУГ / ТОВАРОВ (Services)
CREATE TABLE Services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_min INT NOT NULL DEFAULT 5,           -- Длительность приготовления/подачи
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    discount_percent INT DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100), -- Общая скидка от админа (30% товаров со скидкой)
    category VARCHAR(100) NOT NULL,                -- Категория для динамического списка checkbox в aside
    image TEXT
);

-- 4. ТАБЛИЦА ЗАПИСЕЙ / ЗАКАЗОВ (Appointments)
CREATE TABLE Appointments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    service_id INT NOT NULL REFERENCES Services(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    appointment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'   -- PENDING, CONFIRMED, COMPLETED, CANCELLED
);

-- 5. ТАБЛИЦА ПЛАТЕЖЕЙ (Payments)
CREATE TABLE Payments (
    id SERIAL PRIMARY KEY,
    appointment_id INT NOT NULL REFERENCES Appointments(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ЗАПОЛНЕНИЕ ТЕСТОВЫМИ ДАННЫМИ
-- =====================================================

-- Роли
INSERT INTO Roles (id, name) VALUES 
(1, 'Admin'),
(2, 'Client');

-- Пользователи (с авторизацией по email и паролю)
INSERT INTO Users (id, email, password, role_id, coupon_type, personal_discount) VALUES 
(1, 'admin@bar.com', 'admin123', 1, 'NONE', 0),
(2, 'client1@mail.ru', 'pass123', 2, 'COUPON_15', 15),
(3, 'client2@mail.ru', 'pass123', 2, 'WELCOME_10', 10);

-- 10 напитков (3 из 10 со скидкой = ровно 30%)
INSERT INTO Services (id, name, description, duration_min, price, discount_percent, category, image) VALUES 
-- 1. Со скидкой 10%
(1, 'Кока-кола', 'Освежающий газированный напиток 0.5л', 2, 150.00, 10, 'Газировка', 'https://avatars.mds.yandex.net/i?id=0e0db6ea9c32e456062615e160a5057c55e344ee-4280934-images-thumbs&n=13'),
(2, 'Спрайт', 'Лимонно-лаймовый газированный напиток 0.5л', 2, 120.00, 0, 'Газировка', 'https://avatars.mds.yandex.net/i?id=f2a2e6f17d8ba0e5b4e1d7ab40d6f0cb9f32aefa-8210080-images-thumbs&n=13'),
-- 2. Со скидкой 15%
(3, 'Маунтидью', 'Цитрусовый вкус с кофеином 0.5л', 2, 200.00, 15, 'Газировка', 'https://avatars.mds.yandex.net/i?id=282f2050f3b80c3ea96729af27965e1d92f45eea-10518571-images-thumbs&n=13'),
(4, 'Фанта', 'Апельсиновый газированный напиток 0.5л', 2, 140.00, 0, 'Газировка', 'https://avatars.mds.yandex.net/i?id=4a30d0e9f7ab58537349f9db9025a567b500e102-5236117-images-thumbs&n=13'),
(5, 'Лимонад Золотой Ключик', 'Классический карамельный вкус', 2, 80.00, 0, 'Лимонады', 'https://avatars.mds.yandex.net/i?id=12caf0b0dccdd90526510a8e7cb5248ed9fce398-12481555-images-thumbs&n=13'),
(6, 'Тархун', 'Пряный лимонад на основе экстракта эстрагона', 2, 95.00, 0, 'Лимонады', 'https://avatars.mds.yandex.net/i?id=7e5315dd71dd71d7a8937325f9897d03b967a386-5177029-images-thumbs&n=13'),
-- 3. Со скидкой 20%
(7, 'Байкал', 'Натуральный хвойно-травяной экстракт', 2, 110.00, 20, 'Лимонады', 'https://avatars.mds.yandex.net/i?id=08d3b33676965563355b0dc7479e79585c5c6422-5222242-images-thumbs&n=13'),
(8, 'Adrenaline Rush', 'Энергетический тонизирующий напиток 0.449л', 1, 175.00, 0, 'Энергетики', 'https://avatars.mds.yandex.net/i?id=bcd97990990e5bfe3126b4649eee3b4b51e87344-10310841-images-thumbs&n=13'),
(9, 'Холодный чай Lipton Лимон', 'Черный чай с натуральным лимонным соком', 2, 130.00, 0, 'Холодный чай', 'https://avatars.mds.yandex.net/i?id=869b6994abdc978d2d1e221d33e19104f8b96a09-4476671-images-thumbs&n=13'),
(10, 'Морс Клюквенный', 'Освежающий ягодный морс', 3, 115.00, 0, 'Холодный чай', 'https://avatars.mds.yandex.net/i?id=bd011d4affe3ceb9683bbdecfcea7693fb93c0e8-10869804-images-thumbs&n=13');

-- Тестовая запись (заказ)
INSERT INTO Appointments (id, user_id, service_id, quantity, status) VALUES 
(1, 2, 1, 1, 'CONFIRMED');

-- Тестовый платеж с учетом 10% скидки (150 - 10% = 135 руб)
INSERT INTO Payments (id, appointment_id, amount, payment_status) VALUES 
(1, 1, 135.00, 'PAID');

-- Выравнивание счетчиков ID
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM Roles));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM Users));
SELECT setval('services_id_seq', (SELECT MAX(id) FROM Services));
SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM Appointments));
SELECT setval('payments_id_seq', (SELECT MAX(id) FROM Payments));