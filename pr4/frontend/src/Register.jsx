import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import { registerUser } from "./api";
import { EMAIL_RE, PHONE_RE, isRealFullName, normalizeName, formatPhone, passwordError, NAME_ERROR, PHONE_ERROR } from "./validate";

// регистрация
function Register() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // телефон сразу по маске
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === "phone" ? formatPhone(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password || !form.phone.trim())
      return setError("Заполните все поля");
    if (!isRealFullName(form.full_name)) return setError(NAME_ERROR);
    if (!EMAIL_RE.test(form.email)) return setError("Некорректный email");
    if (!PHONE_RE.test(form.phone)) return setError(PHONE_ERROR);
    const passErr = passwordError(form.password);
    if (passErr) return setError(passErr);
    try {
      setLoading(true);
      setError(null);
      login(await registerUser({ ...form, full_name: normalizeName(form.full_name) }));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card form narrow">
      <h2>Регистрация</h2>
      <input name="full_name" placeholder="Имя и фамилия" value={form.full_name} onChange={handleChange} />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
      <input name="password" type="password" placeholder="Пароль" value={form.password} onChange={handleChange} />
      <input name="phone" type="tel" inputMode="tel" maxLength={18} placeholder="+7 (900) 123-45-67" value={form.phone} onChange={handleChange} />
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading}>{loading ? "Загрузка..." : "Зарегистрироваться"}</button>
      <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </form>
  );
}

export default Register;
