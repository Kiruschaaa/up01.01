import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { CartProvider, useCart } from "./CartContext";
import ProductCard from "./ProductCard";
import Cart from "./Cart";
import Login from "./Login";
import Dashboard from "./Dashboard";

function Navigation() {
  const { theme, toggleTheme, colors } = useTheme();
  const { count } = useCart();
  const user = localStorage.getItem("user");

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#ff0000" : colors.text,
    fontWeight: isActive ? "bold" : "normal",
    textDecoration: "none",
    marginRight: "15px"
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <nav style={{
      padding: '12px 20px',
      borderBottom: `1px solid ${colors.text === "#000000" ? "#ccc" : "#444"}`,
      backgroundColor: colors.bg,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <NavLink to="/" end style={linkStyle}>Каталог</NavLink>
      <NavLink to="/cart" style={linkStyle}>
        Корзина{count > 0 ? ` (${count})` : ""}
      </NavLink>

      {!user && (
        <NavLink to="/login" style={linkStyle}>Вход</NavLink>
      )}

      {user && (
        <NavLink to="/dashboard" style={linkStyle}>Кабинет</NavLink>
      )}

      <button
        onClick={toggleTheme}
        style={{
          backgroundColor: colors.btnBg,
          color: colors.btnText,
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          cursor: 'pointer',
          marginLeft: '15px'
        }}
      >
        Тема: {theme === "light" ? "Светлая" : "Тёмная"}
      </button>

      {user && (
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: 'transparent',
            color: '#dc2626',
            border: '1px solid #dc2626',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer'
          }}
        >
          Выйти
        </button>
      )}
    </nav>
  );
}

function Catalog() {
  const { colors } = useTheme();
  return (
    <div style={{ color: colors.text }}>
      <Navigation />
      <div style={{ padding: '20px' }}>
        <h1>Каталог напитков</h1>
        <ProductCard id={1} name="Кока-кола" price={150} image="https://avatars.mds.yandex.net/i?id=0e0db6ea9c32e456062615e160a5057c55e344ee-4280934-images-thumbs&n=13" />
        <ProductCard id={2} name="Спрайт" price={120} image="https://avatars.mds.yandex.net/i?id=f2a2e6f17d8ba0e5b4e1d7ab40d6f0cb9f32aefa-8210080-images-thumbs&n=13" />
        <ProductCard id={3} name="Маунтидью" price={200} image="https://avatars.mds.yandex.net/i?id=282f2050f3b80c3ea96729af27965e1d92f45eea-10518571-images-thumbs&n=13" />
        <ProductCard id={4} name="Фанта" price={140} image="https://avatars.mds.yandex.net/i?id=4a30d0e9f7ab58537349f9db9025a567b500e102-5236117-images-thumbs&n=13" />
        <ProductCard id={5} name="Лимонад Золотой Ключик" price={80} image="https://avatars.mds.yandex.net/i?id=12caf0b0dccdd90526510a8e7cb5248ed9fce398-12481555-images-thumbs&n=13" />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </CartProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;