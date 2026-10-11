import { useContext, useEffect, useState } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import { getUserOrders, updateUser, changePassword, payOrder } from "./api";
import { money, statusClass } from "./format";
import { EMAIL_RE, PHONE_RE, isRealFullName, formatPhone, passwordError, NAME_ERROR, PHONE_ERROR } from "./validate";

// личный кабинет
function Dashboard() {
  const { user, login } = useContext(AuthContext);
  const location = useLocation();
  const isAdmin = user?.role_name === "admin";
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({
    full_name: user?.full_name || "", email: user?.email || "", phone: formatPhone(user?.phone), address: user?.address || "",
  });
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "" });
  const [profileMsg, setProfileMsg] = useState(null);
  const [passMsg, setPassMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // заказы только для пользователя
  useEffect(() => {
    if (!user || user.role_name === "admin") return setLoading(false);
    getUserOrders(user.user_id)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  // оплатить заказ
  const handlePay = async (orderId) => {
    try {
      setError(null);
      await payOrder(orderId);
      setOrders(await getUserOrders(user.user_id));
    } catch (err) { setError(err.message); }
  };

  // сохранить данные
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profile.full_name.trim() || !profile.email.trim() || !profile.phone.trim())
      return setProfileMsg({ text: "ФИО, email и телефон обязательны", error: true });
    if (profile.full_name.trim() !== user.full_name && !isRealFullName(profile.full_name))
      return setProfileMsg({ text: NAME_ERROR, error: true });
    if (!EMAIL_RE.test(profile.email)) return setProfileMsg({ text: "Некорректный email", error: true });
    if (!PHONE_RE.test(profile.phone)) return setProfileMsg({ text: PHONE_ERROR, error: true });
    try {
      const saved = await updateUser(user.user_id, profile);
      login(saved);
      setProfile({ ...profile, full_name: saved.full_name });
      setProfileMsg({ text: "Данные сохранены" });
    } catch (err) { setProfileMsg({ text: err.message, error: true }); }
  };

  // сменить пароль
  const savePassword = async (e) => {
    e.preventDefault();
    if (!passwords.old_password || !passwords.new_password)
      return setPassMsg({ text: "Введите текущий и новый пароль", error: true });
    const passErr = passwordError(passwords.new_password);
    if (passErr) return setPassMsg({ text: passErr, error: true });
    try {
      await changePassword(user.user_id, passwords);
      setPasswords({ old_password: "", new_password: "" });
      setPassMsg({ text: "Пароль изменён" });
    } catch (err) { setPassMsg({ text: err.message, error: true }); }
  };

  const Msg = ({ m }) => m && <p className={m.error ? "error" : "ok"}>{m.text}</p>;

  return (
    <>
      <h1>Личный кабинет</h1>
      <div className="grid">
        <form className="card form" onSubmit={saveProfile} noValidate>
          <h3>Личные данные</h3>
          <input placeholder="ФИО" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          <input type="email" placeholder="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          <input type="tel" inputMode="tel" maxLength={18} placeholder="+7 (900) 123-45-67" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })} />
          {!isAdmin && (
            <input placeholder="Адрес по умолчанию" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          )}
          <Msg m={profileMsg} />
          <button className="btn">Сохранить</button>
        </form>

        <form className="card form" onSubmit={savePassword} noValidate>
          <h3>Смена пароля</h3>
          <input type="password" placeholder="Текущий пароль" value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} />
          <input type="password" placeholder="Новый пароль" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
          <Msg m={passMsg} />
          <button className="btn">Изменить пароль</button>
          <p className="muted">Забыли текущий пароль? <Link to="/forgot">Сбросить по почте</Link></p>
        </form>
      </div>

      {!isAdmin && (
        <>
          <h2>Мои заказы</h2>
          {loading && <p>Загрузка...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && orders.length === 0 && <p>Заказов пока нет.</p>}
          {orders.map((o) => (
            <div className="card" key={o.order_id}>
              <div className="row between">
                <b>Заказ №{o.order_number} от {o.created_date}</b>
                <div className="row">
                  <span className={statusClass(o.status)}>{o.status}</span>
                  {o.status === "Ожидает оплаты" && <button className="btn" onClick={() => handlePay(o.order_id)}>Оплатить</button>}
                </div>
              </div>
              <p>{o.items}</p>
              <p>Адрес доставки: {o.delivery_address}</p>
              <p>Дата доставки: {o.delivery_date}</p>
              {o.discount_percent > 0 && <p className="ok">{o.discount_note || "Скидка"}: −{o.discount_percent}%</p>}
              <b>{money(o.total)}</b>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export default Dashboard;
