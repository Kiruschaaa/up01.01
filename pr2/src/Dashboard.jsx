import { useNavigate, NavLink } from "react-router-dom";
import { useTheme } from "./ThemeContext";

function Dashboard() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const user = localStorage.getItem("user");

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#ff0000" : colors.text,
    fontWeight: isActive ? "bold" : "normal",
    textDecoration: "none",
    marginRight: "15px"
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) {
    return (
      <div style={{ color: colors.text }}>
        <nav style={{
  padding: '12px 20px',
  borderBottom: `1px solid ${colors.text === "#000000" ? "#ccc" : "#444"}`,
  backgroundColor: colors.bg
}}>
  <NavLink to="/" end style={linkStyle}>Каталог</NavLink>
  <NavLink to="/cart" style={linkStyle}>Корзина</NavLink>
  <NavLink to="/login" style={linkStyle}>Вход</NavLink>
</nav>
        <div style={{ padding: '20px' }}>
          <h1>Личный кабинет</h1>
          <p>Вы не вошли в аккаунт.</p>
          <button onClick={() => navigate("/login")} style={{ backgroundColor: colors.btnBg, color: colors.btnText, border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer' }}>Войти</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: colors.text }}>
      <nav style={{
  padding: '12px 20px',
  borderBottom: `1px solid ${colors.text === "#000000" ? "#ccc" : "#444"}`,
  backgroundColor: colors.bg
}}>
  <NavLink to="/" end style={linkStyle}>Каталог</NavLink>
  <NavLink to="/cart" style={linkStyle}>Корзина</NavLink>
  <NavLink to="/dashboard" style={linkStyle}>Кабинет</NavLink>
</nav>
      <div style={{ padding: '20px' }}>
        <h1>Личный кабинет</h1>
        <p>Добро пожаловать, {user}!</p>
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer' }}>Выйти из аккаунта</button>
      </div>
    </div>
  );
}

export default Dashboard;