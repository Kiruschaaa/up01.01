import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useTheme } from "./ThemeContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { colors } = useTheme();
  const user = localStorage.getItem("user");

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#ff0000" : colors.text,
    fontWeight: isActive ? "bold" : "normal",
    textDecoration: "none",
    marginRight: "15px"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("user", username || "Гость");
    navigate("/dashboard");
  };

  const inputStyle = {
    padding: '8px',
    marginRight: '8px',
    marginBottom: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    display: 'block'
  };

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
        <h1>Вход</h1>
        <form onSubmit={handleSubmit}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Имя пользователя" style={inputStyle} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" style={inputStyle} />
          <button type="submit" style={{ backgroundColor: colors.btnBg, color: colors.btnText, border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer' }}>Войти</button>
        </form>
      </div>
    </div>
  );
}

export default Login;