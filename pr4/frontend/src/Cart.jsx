import { useContext, useState, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import { CartContext } from "./Cartcontext";
import { money } from "./format";
import { createOrder, getAvailability, getWelcomeDiscount, checkCoupon } from "./api";

// лимит как на сервере: не больше 10 штук
const MAX_QTY = 10;
const CART_LIMIT = 10;

// корзина и оформление заказа
function Cart() {
  const { user } = useContext(AuthContext);
  const { items, loading, error: cartError, total, changeQuantity, removeFromCart, reloadCart } = useContext(CartContext);
  const location = useLocation();
  const [address, setAddress] = useState(user?.address || "");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // номер оформленного заказа
  const [availability, setAvailability] = useState(null);
  const [welcome, setWelcome] = useState(0); // скидка на первый заказ, %
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // купон: { code, percent }
  const [couponError, setCouponError] = useState(null);

  // сколько мест свободно на выбранную дату
  useEffect(() => {
    if (!date) { setAvailability(null); return; }
    let cancelled = false;
    getAvailability(date)
      .then((data) => { if (!cancelled) setAvailability(data); })
      .catch(() => { if (!cancelled) setAvailability(null); });
    return () => { cancelled = true; };
  }, [date]);

  // скидка на первый заказ (если заказов ещё не было)
  useEffect(() => {
    if (!user || user.role_name === "admin") return;
    getWelcomeDiscount(user.user_id).then((d) => setWelcome(d.percent)).catch(() => setWelcome(0));
  }, [user?.user_id]);

  const today = new Date().toLocaleDateString("sv-SE");

  // гостя отправляем на вход
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // у админа корзины нет
  if (user.role_name === "admin") return <Navigate to="/" replace />;

  // хватает ли мест на дату
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const dayFull = availability !== null && cartCount > availability.free;

  // проверка купона на сервере
  const applyCoupon = async () => {
    if (!couponInput.trim()) return setCouponError("Введите код купона");
    try {
      setCouponError(null);
      setCoupon(await checkCoupon(couponInput.trim()));
    } catch (err) { setCoupon(null); setCouponError(err.message); }
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(""); setCouponError(null); };

  // работает одна, самая большая скидка
  const percent = Math.max(welcome, coupon ? coupon.percent : 0);
  const toPay = Math.round(total * (100 - percent) / 100);
  const couponWins = coupon && coupon.percent > welcome;

  // оформить заказ
  const handleOrder = async (e) => {
    e.preventDefault();
    if (!address.trim() || !date) return setError("Укажите адрес и дату доставки");
    if (date < today) return setError("Дата доставки не может быть раньше сегодняшней");
    try {
      setSaving(true);
      setError(null);
      const created = await createOrder({ delivery_address: address.trim(), delivery_date: date, coupon_code: coupon ? coupon.code : undefined });
      await reloadCart();
      setDone(created.order_number || true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <h2>Загрузка...</h2>;

  if (done) return (
    <div className="card">
      <h2>Заказ{done !== true && ` №${done}`} оформлен</h2>
      <p>Статус заказа можно смотреть в <Link to="/dashboard">личном кабинете</Link>.</p>
    </div>
  );

  return (
    <>
      <h1>Корзина</h1>
      {(error || cartError) && <p className="error">{error || cartError}</p>}
      {items.length === 0 ? (
        <p>Корзина пуста. <Link to="/">Перейти к товарам</Link></p>
      ) : (
        <>
          {items.map((i) => (
            <div className="card row between" key={i.product_id}>
              <div className="grow">
                <b>{i.name}</b>
                <div>Гарантия {i.warranty_months} мес. · {money(i.price)}</div>
              </div>
              <div className="row">
                <button className="btn outline" disabled={i.quantity <= 1} onClick={() => changeQuantity(i.product_id, i.quantity - 1)}>−</button>
                <span>{i.quantity}</span>
                <button className="btn outline" disabled={i.quantity >= MAX_QTY || cartCount >= CART_LIMIT} onClick={() => changeQuantity(i.product_id, i.quantity + 1)}>+</button>
              </div>
              <b>{money(i.price * i.quantity)}</b>
              <button className="btn btn-danger" onClick={() => removeFromCart(i.product_id)}>Удалить</button>
            </div>
          ))}
          <p className="muted">Не больше {MAX_QTY} шт. одного товара и {CART_LIMIT} товаров в корзине (больше мы не успеем доставить за один день).</p>

          <p className="total">Итого: {money(total)}</p>

          <div className="card form">
            <h3>Купон</h3>
            {coupon ? (
              <div className="row between">
                <span>Купон <b>{coupon.code}</b>: −{coupon.percent}%</span>
                <button type="button" className="btn outline" onClick={removeCoupon}>Убрать</button>
              </div>
            ) : (
              <div className="row">
                <input className="grow" placeholder="Код купона" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                <button type="button" className="btn outline" onClick={applyCoupon}>Применить</button>
              </div>
            )}
            {couponError && <p className="error">{couponError}</p>}
            {coupon && !couponWins && welcome > 0 && (
              <p className="muted">Скидка на первый заказ ({welcome}%) выгоднее этого купона, поэтому купон не будет потрачен.</p>
            )}
          </div>

          {percent > 0 && (
            <p className="ok">
              {couponWins ? `Купон ${coupon.code}` : "Скидка на первый заказ"} (−{percent}%): −{money(total - toPay)}.
              К оплате: <b>{money(toPay)}</b>
            </p>
          )}

          <form className="card form" onSubmit={handleOrder} noValidate>
            <h3>Оформление заказа</h3>
            <input placeholder="Адрес доставки" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            {availability && (
              <p className={dayFull ? "error" : "muted"}>
                {availability.free === 0
                  ? "На эту дату все слоты доставки заняты, выберите другой день."
                  : dayFull
                    ? `На эту дату свободно только ${availability.free} шт., а в корзине ${cartCount}. Уменьшите количество или выберите другой день.`
                    : `На эту дату свободно: ${availability.free} из ${availability.limit} шт.`}
              </p>
            )}
            <button className="btn" disabled={saving || dayFull}>{saving ? "Оформляем..." : "Оформить заказ"}</button>
          </form>
        </>
      )}
    </>
  );
}

export default Cart;
