import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

export default function Cart() {
  const { cart, decreaseCount, addToCart, removeFromCart, clearCart } = useCart();
  const { colors, theme } = useTheme();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userDiscount = user?.discount || user?.Discount || 0;

  const [savedCoupons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coupons') || '[]');
    } catch {
      return [];
    }
  });

  const [address, setAddress] = useState(user?.address || user?.Address || "");
  const [time, setTime] = useState("");
  const [msg, setMsg] = useState("");

  const [appliedPromo, setAppliedPromo] = useState(null);

  if (!user) {
    return (
      <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text, minHeight: '100vh' }}>
        <h2>Доступ ограничен</h2>
        <p>Пожалуйста, авторизуйтесь.</p>
      </div>
    );
  }

  const isAdmin = user && (user.roleId === 1 || user.RoleId === 1 || user.role === 'admin');
  if (isAdmin) {
    navigate('/dashboard');
    return null;
  }

  const safeCart = cart || [];
  const originalTotal = safeCart.reduce((sum, item) => sum + ((item.price || 0) * (item.count || 1)), 0);
  const rawProfileDiscount = Math.round(originalTotal * (userDiscount / 100));

  let rawPromoDiscount = 0;
  let promoWarning = "";

  if (appliedPromo) {
    if (appliedPromo.targetId) {
      const targetItem = safeCart.find(i => String(i.id) === String(appliedPromo.targetId) || String(i.Id) === String(appliedPromo.targetId));
      if (targetItem) {
        rawPromoDiscount = Math.round(((targetItem.price || 0) * (targetItem.count || 1)) * (appliedPromo.discount / 100));
      } else {
        promoWarning = "Товар для этого купона отсутствует в корзине";
      }
    } else {
      rawPromoDiscount = Math.round(originalTotal * (appliedPromo.discount / 100));
    }
  }

  let activeProfileDiscount = 0;
  let activePromoDiscount = 0;
  let discountStatusMsg = "";
  let discountStatusColor = "";

  if (appliedPromo) {
    if (promoWarning) {
      discountStatusMsg = promoWarning;
      discountStatusColor = "#dc3545";
    } else if (rawPromoDiscount > rawProfileDiscount) {
      activePromoDiscount = rawPromoDiscount;
      discountStatusMsg = userDiscount > 0 
        ? `Купон выгоднее вашей скидки (${rawPromoDiscount} ₽ против ${rawProfileDiscount} ₽)` 
        : `Купон применен! Скидка: ${appliedPromo.discount}%`;
      discountStatusColor = "#007bff";
    } else {
      activeProfileDiscount = rawProfileDiscount;
      discountStatusMsg = `Ваша скидка (${rawProfileDiscount} ₽) выгоднее купона. Оставляем её!`;
      discountStatusColor = "#28a745";
    }
  } else {
    activeProfileDiscount = rawProfileDiscount;
  }

  const finalTotal = Math.max(0, originalTotal - activeProfileDiscount - activePromoDiscount);

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setMsg("Пожалуйста, укажите адрес доставки.");
      return;
    }
    if (!time) {
      setMsg("Укажите желаемое время выдачи.");
      return;
    }
    try {
      alert("Заказ успешно оформлен! Истинный странник обрел желаемое.");
      clearCart();
      setAppliedPromo(null);
      navigate("/profile");
    } catch (err) {
      setMsg("Ошибка при оформлении: " + err.message);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text, minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Ваша Корзина</h2>

      {!safeCart || safeCart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Чаша пуста. Вернитесь в каталог, чтобы наполнить её.</p>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px', cursor: 'pointer' }}>В каталог</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '30px' }}>
            {safeCart.map((item) => (
              <div key={item.id || item.Id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '15px', 
                borderBottom: `1px solid ${colors.border}`,
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ flex: 2 }}>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '14px', color: colors.textSecondary || '#666' }}>{item.price} ₽ / шт.</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    onClick={() => decreaseCount(item.id || item.Id)} 
                    style={{ padding: '5px 12px', cursor: 'pointer', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg || colors.bg, color: colors.text, fontSize: '18px' }}
                  >
                    −
                  </button>
                  <span>{item.count}</span>
                  <button 
                    onClick={() => addToCart(item)} 
                    style={{ padding: '5px 12px', cursor: 'pointer', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.cardBg || colors.bg, color: colors.text, fontSize: '18px' }}
                  >
                    +
                  </button>
                </div>

                <div style={{ fontWeight: 'bold', minWidth: '80px', textAlign: 'right' }}>
                  {(item.price || 0) * (item.count || 1)} ₽
                </div>

                <button 
                  onClick={() => removeFromCart(item.id || item.Id)} 
                  style={{ backgroundColor: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer' }}
                >
                  удалить
                </button>
              </div>
            ))}
          </div>

          <div style={{ 
            backgroundColor: colors.cardBg || colors.navBg, 
            padding: '20px', 
            borderRadius: '12px', 
            border: `1px solid ${colors.border}` 
          }}>
            <h3>Детали заказа</h3>
            {savedCoupons.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Применить купон:</label>
                <select 
                  value={appliedPromo ? appliedPromo.id : ''}
                  onChange={(e) => {
                    const selected = savedCoupons.find(c => c.id === Number(e.target.value));
                    setAppliedPromo(selected || null);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: `1px solid ${colors.border}`, 
                    backgroundColor: colors.bg, 
                    color: colors.text 
                  }}
                >
                  <option value="">Без купона</option>
                  {savedCoupons.map(coupon => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} (-{coupon.discount}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
            {discountStatusMsg && (
              <div style={{ 
                color: discountStatusColor, 
                marginBottom: '15px', 
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                {discountStatusMsg}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Первозданная цена:</span>
              <span>{originalTotal} ₽</span>
            </div>
            {activeProfileDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#059669' }}>
                <span>Скидка странника ({userDiscount}%):</span>
                <span>−{activeProfileDiscount} ₽</span>
              </div>
            )}
            {activePromoDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#059669' }}>
                <span>Купон ({appliedPromo?.code}):</span>
                <span>−{activePromoDiscount} ₽</span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: '15px', 
              paddingTop: '15px', 
              borderTop: `1px solid ${colors.border}`, 
              fontWeight: 'bold', 
              fontSize: '18px' 
            }}>
              <span>Итого:</span>
              <span>{finalTotal} ₽</span>
            </div>
            <form onSubmit={handleOrder} style={{ marginTop: '20px' }}>
              {msg && (
                <div style={{ color: 'red', marginBottom: '10px' }}>{msg}</div>
              )}
              <label style={{ display: 'block', marginBottom: '5px' }}>Адрес доставки:</label>
              <input 
                type="text"
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                required 
                placeholder="Например: г. Москва, ул. Ленина, д.1"
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, boxSizing: 'border-box', marginBottom: '15px' }} 
              />
              <label style={{ display: 'block', marginBottom: '5px' }}>Время получения заказа:</label>
              <input 
                type="datetime-local"
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, boxSizing: 'border-box', marginBottom: '15px' }} 
              />
              <button 
                type="submit"
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Оформить заказ
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}