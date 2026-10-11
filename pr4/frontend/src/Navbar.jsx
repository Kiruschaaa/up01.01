import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./Authcontext";
import { CartContext } from "./Cartcontext";
import { ThemeContext } from "./Themecontext";

// меню
function Navbar() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const { itemCount } = useContext(CartContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isAdmin = user?.role_name === "admin";

  return (
    <nav className="navbar">
      <NavLink to="/" end className="brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2z"/></svg>
        АкваМастер
      </NavLink>
      <NavLink to="/" end>Каталог</NavLink>
      {isAuthenticated && !isAdmin && <NavLink to="/cart">Корзина ({itemCount})</NavLink>}
      {isAdmin && <NavLink to="/admin">Админ-панель</NavLink>}
      {isAuthenticated && <NavLink to="/dashboard">Кабинет</NavLink>}

      <div className="right">
        <button className="btn theme-btn" onClick={toggleTheme}>
          {theme === "light" ? "Тёмная тема" : "Светлая тема"}
        </button>
        {isAuthenticated ? (
          <>
            <span className="user">{user.full_name}</span>
            <button className="btn btn-danger" onClick={() => { logout(); navigate("/"); }}>Выйти</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Войти</NavLink>
            <NavLink to="/register">Регистрация</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
