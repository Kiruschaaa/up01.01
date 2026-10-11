import { useState, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import { loginUser } from "./api";
import { EMAIL_RE } from "./validate";

// вход
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Заполните email и пароль");
    if (!EMAIL_RE.test(email)) return setError("Некорректный email");
    try {
      setLoading(true);
      setError(null);
      login(await loginUser({ email, password }));
      // возвращаем туда, откуда пришли
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card form narrow">
      <h2>Авторизация</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading}>{loading ? "Загрузка..." : "Войти"}</button>
      <p><Link to="/forgot">Забыли пароль?</Link></p>
      <p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
    </form>
  );
}

export default Login;
