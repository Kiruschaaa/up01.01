import { NavLink } from "react-router-dom";
import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

function Cart() {
  const { items, removeFromCart, increment, decrement, total } = useCart();
  const { colors } = useTheme();
  const user = localStorage.getItem("user");

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#ff0000" : colors.text,
    fontWeight: isActive ? "bold" : "normal",
    textDecoration: "none",
    marginRight: "15px"
  });

  return (
    <div style={{ color: colors.text }}>
      <nav style={{
  padding: '12px 20px',
  borderBottom: `1px solid ${colors.text === "#000000" ? "#ccc" : "#444"}`,
  backgroundColor: colors.bg
}}>
  <NavLink to="/" end style={linkStyle}>Каталог</NavLink>
  <NavLink to="/cart" style={linkStyle}>Корзина</NavLink>
  {!user && (
    <NavLink to="/login" style={linkStyle}>Вход</NavLink>
  )}
  {user && (
    <NavLink to="/dashboard" style={linkStyle}>Кабинет</NavLink>
  )}
</nav>

      <div style={{ padding: '20px' }}>
        <h1>Корзина</h1>
        {items.length === 0 ? (
          <p>Корзина пуста</p>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '10px',
                borderBottom: '1px solid #ccc',
                flexWrap: 'wrap'
              }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '4px' }}
                />
                <span style={{ minWidth: '150px' }}>{item.name}</span>
                <span style={{ minWidth: '100px' }}>{item.price} руб.</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => decrement(item.id)} style={{ backgroundColor: colors.btnBg, color: colors.btnText, border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px' }}>−</button>
                  <span style={{ padding: '0 8px', fontWeight: 'bold' }}>{item.qty}</span>
                  <button onClick={() => increment(item.id)} style={{ backgroundColor: colors.btnBg, color: colors.btnText, border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px' }}>+</button>
                </div>
                <span style={{ minWidth: '80px', fontWeight: 'bold' }}>{item.price * item.qty} руб.</span>
                <button onClick={() => removeFromCart(item.id)} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Удалить</button>
              </div>
            ))}
            <h2 style={{ marginTop: '20px' }}>Итого: {total} руб.</h2>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;