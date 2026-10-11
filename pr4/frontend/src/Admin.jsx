import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import Productform from "./Productform";
import { money, statusClass } from "./format"; // Утилиты для форматирования денег и классов статусов
// Валидаторы дублируются на фронтенде для мгновенной обратной связи до отправки на сервер
import { EMAIL_RE, PHONE_RE, isRealFullName, normalizeName, formatPhone, passwordError, NAME_ERROR, PHONE_ERROR } from "./validate";
// Импорт всех API-функций для управления ресурсами
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getAllOrders, updateOrderStatus,
  getUsers, createUser,
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
} from "./api";

// КОНСТАНТЫ БИЗНЕС-ЛОГИКИ
const STATUSES = ["Ожидает оплаты", "Оплачен", "В работе", "Готов к выдаче", "Доставлен", "Отменён"];
const NO_CATEGORY = "Без категории"; // Системная категория, защищенная от изменений
const FINAL = ["Доставлен", "Отменён"]; // Терминальные статусы заказа

// Функция блокировки недопустимых переходов статусов (зеркало серверной логики)
// Запрещает возвращать оплаченный заказ в ожидание или менять финальные статусы
const blocked = (current, next) =>
  next !== current && (next === "Ожидает оплаты" || (current === "Ожидает оплаты" && next !== "Оплачен" && next !== "Отменён"));

const EMPTY_USER = { full_name: "", email: "", password: "", phone: "" };

// ВКЛАДКА ТОВАРОВ
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null = режим создания, объект = режим редактирования
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Параллельная загрузка товаров и категорий при монтировании
  const loadData = () => {
    Promise.all([getProducts(), getCategories()])
      .then(([s, c]) => { setProducts(s); setCategories(c); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadData, []);

  // Универсальный обработчик сохранения (создание или обновление)
  const handleSave = async (form) => {
    if (editing) await updateProduct(editing.product_id, form);
    else await createProduct(form);
    setEditing(null); // Сброс режима редактирования
    loadData();       // Перезагрузка списка для отображения актуальных данных
  };

  // Удаление товара с перезагрузкой списка
  const handleDelete = async (s) => {
    try { setError(null); await deleteProduct(s.product_id); loadData(); } 
    catch (err) { setError(err.message); }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      {/* Форма добавления/редактирования меняется динамически через key */}
      <Productform key={editing ? editing.product_id : "new"} product={editing} categories={categories}
        onSave={handleSave} onCancel={() => setEditing(null)} />
      
      {/* Список товаров с кнопками действий */}
      {products.map((s) => (
        <div className="card row between" key={s.product_id}>
          <div className="grow">
            <b>{s.name}</b>
            <div>{s.category_name} · гарантия {s.warranty_months} мес. · {money(s.price)}</div>
          </div>
          <button className="btn outline" onClick={() => setEditing(s)}>Изменить</button>
          <button className="btn btn-danger" onClick={() => handleDelete(s)}>Удалить</button>
        </div>
      ))}
    </>
  );
}

// ВКЛАДКА КАТЕГОРИЙ
function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadData, []);

  // Обертка для выполнения асинхронных действий с автоматической перезагрузкой
  const run = async (action) => {
    try { setError(null); await action(); loadData(); } 
    catch (err) { setError(err.message); }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Введите название категории");
    run(async () => { await createCategory({ category_name: name }); setName(""); });
  };

  // Переименование через нативный prompt
  const handleRename = (c) => {
    const newName = prompt("Новое название:", c.category_name);
    if (newName && newName.trim()) run(() => updateCategory(c.category_id, { category_name: newName }));
  };

  // Удаление с подтверждением и предупреждением о переносе товаров
  const handleDelete = (c) => {
    if (confirm(`Удалить категорию «${c.category_name}»? Её товары переместятся в «${NO_CATEGORY}».`))
      run(() => deleteCategory(c.category_id));
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <form className="card row" onSubmit={handleAdd} noValidate>
        <input className="grow" placeholder="Новая категория" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn">Добавить</button>
      </form>
      {error && <p className="error">{error}</p>}
      {categories.map((c) => (
        <div className="card row between" key={c.category_id}>
          <b>{c.category_name}</b>
          {/* Системную категорию нельзя изменить или удалить */}
          {c.category_name === NO_CATEGORY ? (
            <span className="muted">Системная категория: сюда попадают товары удалённых категорий</span>
          ) : (
            <div className="row">
              <button className="btn outline" onClick={() => handleRename(c)}>Переименовать</button>
              <button className="btn btn-danger" onClick={() => handleDelete(c)}>Удалить</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// ВКЛАДКА КУПОНОВ
function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", discount_percent: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    getCoupons()
      .then(setCoupons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadData, []);

  const run = async (action) => {
    try { setError(null); await action(); loadData(); } 
    catch (err) { setError(err.message); }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    // Клиентская валидация перед отправкой на сервер
    if (!/^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(form.code.trim())) 
      return setError("Код купона: 3-20 символов (буквы, цифры, «-» и «_»)");
    const percent = Number(form.discount_percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) 
      return setError("Скидка должна быть целым числом от 1 до 90 %");
    
    run(async () => { 
      await createCoupon({ code: form.code.trim(), discount_percent: percent }); 
      setForm({ code: "", discount_percent: "" }); 
    });
  };

  const handlePercent = (c) => {
    const answer = prompt("Новый процент скидки (1-90):", c.discount_percent);
    if (answer === null) return;
    const percent = Number(answer);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) 
      return setError("Скидка должна быть целым числом от 1 до 90 %");
    run(() => updateCoupon(c.coupon_id, { code: c.code, discount_percent: percent, active: c.active }));
  };

  // Переключение активности купона (вкл/выкл)
  const toggle = (c) => run(() => updateCoupon(c.coupon_id, { code: c.code, discount_percent: c.discount_percent, active: !c.active }));

  const handleDelete = (c) => {
    if (confirm(`Удалить купон ${c.code}?`)) run(() => deleteCoupon(c.coupon_id));
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <p className="muted">Каждый купон можно использовать один раз на пользователя. Скидка на первый заказ (10%) выдаётся новым пользователям автоматически.</p>
      <form className="card row" onSubmit={handleAdd} noValidate>
        <input className="grow" placeholder="Код купона (например, SALE10)" value={form.code} 
          onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input type="number" min="1" max="90" placeholder="Скидка, %" value={form.discount_percent} 
          onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        <button className="btn">Добавить</button>
      </form>
      {error && <p className="error">{error}</p>}
      {coupons.length === 0 && <p>Купонов пока нет.</p>}
      {coupons.map((c) => (
        <div className="card row between" key={c.coupon_id}>
          <div>
            <b>{c.code}</b> · −{c.discount_percent}% · использован {c.uses} раз
            {!c.active && <span className="status cancel"> отключён</span>}
          </div>
          <div className="row">
            <button className="btn outline" onClick={() => handlePercent(c)}>Изменить %</button>
            <button className="btn outline" onClick={() => toggle(c)}>{c.active ? "Отключить" : "Включить"}</button>
            <button className="btn btn-danger" onClick={() => handleDelete(c)}>Удалить</button>
          </div>
        </div>
      ))}
    </>
  );
}

// ВКЛАДКА ЗАКАЗОВ
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    getAllOrders()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadData, []);

  const run = async (action) => {
    try { setError(null); await action(); loadData(); } 
    catch (err) { setError(err.message); }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p>Заказов пока нет.</p>}
      {orders.map((o) => (
        <div className="card" key={o.order_id}>
          <div className="row between">
            <b>Заказ №{o.order_number} от {o.created_date}</b>
            <b>{money(o.total)}{o.discount_percent > 0 && ` (${o.discount_note || "скидка"} −${o.discount_percent}%)`}</b>
          </div>
          <p>{o.items}</p>
          <p>{o.full_name}{o.user_deleted && " (пользователь удалён)"}, {o.phone}<br />
             Доставка: {o.delivery_address}, {o.delivery_date}
          </p>
          <div className="row">
            <span className={statusClass(o.status)}>{o.status}</span>
            {/* Select заблокирован для финальных статусов, опции заблокированы функцией blocked */}
            <select value={o.status} disabled={FINAL.includes(o.status)} 
              onChange={(e) => run(() => updateOrderStatus(o.order_id, e.target.value))}>
              {STATUSES.map((s) => <option key={s} disabled={blocked(o.status, s)}>{s}</option>)}
            </select>
            {FINAL.includes(o.status) && <span className="muted">Заказ завершён, статус изменить нельзя</span>}
          </div>
        </div>
      ))}
    </>
  );
}

// ВКЛАДКА ПОЛЬЗОВАТЕЛЕЙ
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_USER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(loadData, []);

  // Создание нового пользователя с полной клиентской валидацией
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password || !newUser.phone.trim())
      return setError("Заполните все поля");
    if (!isRealFullName(newUser.full_name)) return setError(NAME_ERROR);
    if (!EMAIL_RE.test(newUser.email)) return setError("Некорректный email");
    if (!PHONE_RE.test(newUser.phone)) return setError(PHONE_ERROR);
    const passErr = passwordError(newUser.password);
    if (passErr) return setError(passErr);
    
    try {
      setError(null);
      // Нормализация имени перед отправкой (как на сервере)
      await createUser({ ...newUser, full_name: normalizeName(newUser.full_name) });
      setNewUser(EMPTY_USER);
      setCreating(false);
      loadData();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      {!creating && (
        <p><button className="btn" onClick={() => setCreating(true)}>Добавить пользователя</button></p>
      )}
      {creating && (
        <form className="card form" onSubmit={handleCreate} noValidate>
          <h3>Новый пользователь</h3>
          <input placeholder="Имя и фамилия" value={newUser.full_name} 
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
          <input type="email" placeholder="Email" value={newUser.email} 
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <input type="password" placeholder="Пароль" value={newUser.password} 
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          <input type="tel" inputMode="tel" maxLength={18} placeholder="+7 (900) 123-45-67" 
            value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: formatPhone(e.target.value) })} />
          <div className="row">
            <button className="btn">Добавить</button>
            <button type="button" className="btn outline" onClick={() => { setCreating(false); setError(null); }}>Отмена</button>
          </div>
        </form>
      )}
      {users.map((u) => (
        <div className="card row between" key={u.user_id}>
          <div className="grow">
            <div><b>{u.full_name}</b> <span className="tag">{u.role_name}</span></div>
            <div>{u.email} · {u.phone}</div>
          </div>
        </div>
      ))}
    </>
  );
}

// ГЛАВНЫЙ КОМПОНЕНТ АДМИН-ПАНЕЛИ
function Admin() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState("products");

  // Защита маршрута: если роль не admin, показываем заглушку
  if (user?.role_name !== "admin") return (
    <div className="card">
      <h1>Доступ запрещён</h1>
      <p>У вас нет прав для просмотра этой страницы.</p>
      <Link className="btn" to="/">На главную</Link>
    </div>
  );

  const tabs = { 
    products: "Товары", 
    categories: "Категории", 
    orders: "Заказы", 
    coupons: "Купоны", 
    users: "Пользователи" 
  };

  return (
    <>
      <h1>Админ-панель</h1>
      {/* Навигация по вкладкам */}
      <div className="row tabs">
        {Object.entries(tabs).map(([key, title]) => (
          <button key={key} className={"btn outline" + (tab === key ? " active" : "")} 
            onClick={() => setTab(key)}>{title}</button>
        ))}
      </div>
      {/* Рендеринг активной вкладки */}
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "coupons" && <CouponsTab />}
      {tab === "users" && <UsersTab />}
    </>
  );
}

export default Admin;