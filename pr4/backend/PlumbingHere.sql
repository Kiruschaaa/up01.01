-- Вся база данных в одном файле: сначала таблицы, внизу инсерты.
-- Старые таблицы с такими же именами удаляются (sessions - от старой версии, больше не нужна).
DROP TABLE IF EXISTS sessions, coupon_uses, coupons, reviews, order_items, orders, cart_items, products, categories, users, roles CASCADE;

CREATE TABLE roles (
    role_id   INT PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL
);

-- password: bcrypt-хеш (60 символов), а не сам пароль
CREATE TABLE users (
    user_id   SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email     VARCHAR(100) NOT NULL,
    password  VARCHAR(100) NOT NULL,
    phone     VARCHAR(20) NOT NULL,
    address   VARCHAR(255),
    role_id   INT NOT NULL REFERENCES roles(role_id)
);

CREATE TABLE categories (
    category_id   SERIAL PRIMARY KEY,
    category_name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE products (
    product_id      SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    warranty_months INT NOT NULL,
    price           INT NOT NULL CONSTRAINT products_price_positive CHECK (price > 0),
    image           TEXT,
    category_id     INT REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Корзина в БД: у каждого пользователя своя
CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id   INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity     INT NOT NULL DEFAULT 1,
    UNIQUE (user_id, product_id)
);

CREATE TABLE orders (
    order_id         SERIAL PRIMARY KEY,
    -- заказ (чек) остаётся, даже если пользователя удалили: имя и телефон покупателя сохранены в самом заказе
    user_id          INT REFERENCES users(user_id) ON DELETE SET NULL,
    customer_name    VARCHAR(100),
    customer_phone   VARCHAR(20),
    delivery_address VARCHAR(255) NOT NULL,
    delivery_date    DATE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'Ожидает оплаты',
    total            INT NOT NULL,
    discount_percent INT NOT NULL DEFAULT 0,
    discount_note    VARCHAR(60),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    -- название и цена сохраняются в заказе: при удалении товара состав заказа не теряется
    product_id    INT REFERENCES products(product_id) ON DELETE SET NULL,
    product_name  VARCHAR(100) NOT NULL,
    quantity      INT NOT NULL,
    price         INT NOT NULL
);

CREATE TABLE reviews (
    review_id  SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    rating     INT NOT NULL,
    comment    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Купоны: код и процент скидки; каждый купон можно использовать один раз на пользователя
CREATE TABLE coupons (
    coupon_id        SERIAL PRIMARY KEY,
    code             VARCHAR(20) NOT NULL UNIQUE,
    discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 90),
    active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE coupon_uses (
    user_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    coupon_id INT NOT NULL REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    order_id  INT REFERENCES orders(order_id) ON DELETE CASCADE,
    used_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, coupon_id)
);

-- email уникален без учёта регистра
CREATE UNIQUE INDEX users_email_lower ON users (LOWER(email));

-- Один отзыв от пользователя на товар
CREATE UNIQUE INDEX reviews_one_per_user_product ON reviews (user_id, product_id);

-- ===================== ИНСЕРТЫ =====================

INSERT INTO roles (role_id, role_name) VALUES (1, 'user'), (2, 'admin');

-- Тестовые аккаунты:
-- Админ: admin@shop.ru / admin123
-- Остальные пользователи: пароль 123qwerty!
INSERT INTO users (full_name, email, password, phone, address, role_id) VALUES
    ('Администратор Системы', 'admin@shop.ru', '$2a$10$w8jJgSF5C2vOXNK5j3w4denykMEsQcg81J0cvjsTOifN.rBN/tfny', '+7 (999) 000-00-00', 'г. Москва, ул. Административная, 1', 2),
    ('Иванов Иван Иванович', 'ivan@mail.ru', '$2a$10$HK6Vsj76XF6k27NJSGJEr.nm5eOQJcFHUDsKkIGOmUmvS5YNQUXji', '+7 (916) 123-45-67', 'г. Москва, ул. Ленина, д. 10, кв. 5', 1),
    ('Петрова Анна Сергеевна', 'anna.petrova@gmail.com', '$2a$10$HK6Vsj76XF6k27NJSGJEr.nm5eOQJcFHUDsKkIGOmUmvS5YNQUXji', '+7 (926) 987-65-43', 'г. Санкт-Петербург, Невский пр., д. 25', 1),
    ('Сидоров Алексей Петрович', 'alex.sid@yandex.ru', '$2a$10$HK6Vsj76XF6k27NJSGJEr.nm5eOQJcFHUDsKkIGOmUmvS5YNQUXji', '+7 (903) 555-12-34', 'г. Казань, ул. Баумана, д. 5', 1),
    ('Кузнецова Мария Владимировна', 'maria.kuz@inbox.ru', '$2a$10$HK6Vsj76XF6k27NJSGJEr.nm5eOQJcFHUDsKkIGOmUmvS5YNQUXji', '+7 (999) 111-22-33', NULL, 1);

INSERT INTO categories (category_name) VALUES ('Смесители'), ('Раковины и унитазы'), ('Ванны и душевые'), ('Трубы и фитинги'), ('Отопление и водоподготовка'), ('Без категории');

-- Картинка товара: прямая ссылка (если её нет, на сайте показывается заглушка)
INSERT INTO products (name, description, warranty_months, price, category_id, image) VALUES
    ('Смеситель для кухни «Aqua»', 'Однорычажный смеситель с поворотным изливом, хромированное покрытие', 24, 3200, 1, 'https://avatars.mds.yandex.net/i?id=0a266f6c632141e21fffa63240302a1bd2697651-8318446-images-thumbs&n=13'),
    ('Смеситель для ванны с душем', 'Настенный смеситель с переключателем и гибким шлангом', 24, 4500, 1, 'https://avatars.mds.yandex.net/i?id=e7be48f794d8a1088c673da5460bafa66e6804ce-4452287-images-thumbs&n=13'),
    ('Раковина накладная 55 см', 'Керамическая раковина с отверстием под смеситель', 36, 5400, 2, 'https://avatars.mds.yandex.net/i?id=2a30e7976f13560bfcaea2657e94aa0cd43db36a-12967326-images-thumbs&n=13'),
    ('Унитаз-компакт с сиденьем', 'Напольный унитаз с горизонтальным выпуском и сиденьем soft-close', 36, 8900, 2, 'https://avatars.mds.yandex.net/i?id=d64e108214a7ed8f9da025ba1e6e5cb42a9e9771-5453448-images-thumbs&n=13'),
    ('Акриловая ванна 150×70', 'Прямоугольная ванна из литого акрила с регулируемыми ножками', 60, 14500, 3, 'https://avatars.mds.yandex.net/i?id=089d838f2e6093f865a7f5be2160e55b14abfecd-5507593-images-thumbs&n=13'),
    ('Душевая лейка со шлангом', 'Лейка с тремя режимами струи и шлангом 150 см', 12, 1300, 3, 'https://avatars.mds.yandex.net/i?id=f5eb4328d9292d9c1bef824fa2f5a86e819278e8-12510920-images-thumbs&n=13'),
    ('Труба полипропиленовая 20 мм', 'Труба PPR для холодной воды, длина 2 метра', 120, 180, 4, 'https://avatars.mds.yandex.net/i?id=555a6163c2af4126497b89576c81bf0b20ecef6e-13234616-images-thumbs&n=13'),
    ('Сифон для раковины', 'Пластиковый сифон с гофрированной трубкой и выпуском', 12, 650, 4, 'https://avatars.mds.yandex.net/i?id=7fe81b63dfc465c339f224a81c36c01f93767a5b-8497474-images-thumbs&n=13'),
    ('Шаровой кран 1/2"', 'Латунный шаровой кран с рычагом для воды и отопления', 60, 480, 4, 'https://avatars.mds.yandex.net/i?id=1f1d21ac7e646650b62f29d1695e07975c69f93d-5173372-images-thumbs&n=13'),
    ('Радиатор биметаллический 6 секций', 'Секционный радиатор отопления, межосевое расстояние 500 мм', 60, 4800, 5, 'https://avatars.mds.yandex.net/i?id=3b0682b72e485849e24ea832ff556c3f2f10495a-5234987-images-thumbs&n=13'),
    ('Электрический водонагреватель 80 л', 'Накопительный бойлер с эмалированным баком и защитой от перегрева', 24, 12900, 5, 'https://avatars.mds.yandex.net/i?id=c25a2daddd5d52a638185d98670180727b91885e-10810377-images-thumbs&n=13'),
    ('Магистральный фильтр для воды', 'Фильтр механической очистки с прозрачной колбой и картриджем', 12, 2100, 5, 'https://avatars.mds.yandex.net/i?id=f119b23101e2979ea62dc795aeb1b462c522da71-4272795-images-thumbs&n=13');

INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
    ((SELECT user_id FROM users WHERE email = 'ivan@mail.ru'), 1, 5, 'Смеситель установили за час, не течёт, хром не царапается'),
    ((SELECT user_id FROM users WHERE email = 'maria.kuz@inbox.ru'), 11, 4, 'Воду греет быстро, но хотелось бы более тихую работу'),
    ((SELECT user_id FROM users WHERE email = 'ivan@mail.ru'), 9, 5, 'Хороший латунный кран за свои деньги');

-- Тестовые купоны
INSERT INTO coupons (code, discount_percent) VALUES ('SALE10', 10), ('SUPER20', 20);