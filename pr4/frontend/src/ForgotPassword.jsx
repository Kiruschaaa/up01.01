import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "./Authcontext";
import { forgotPassword, resetPassword } from "./api";
import { EMAIL_RE, passwordError } from "./validate";

// забыли пароль: email, потом код, потом новый пароль
function ForgotPassword() {
  const [step, setStep] = useState(1);
  const { user } = useContext(AuthContext);
  const [email, setEmail] = useState(user?.email || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // отправить код
  const sendCode = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError("Введите корректный email");
    try {
      setLoading(true);
      setError(null);
      setInfo((await forgotPassword(email)).message);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // проверить код и сменить пароль
  const changePass = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError("Код состоит из 6 цифр");
    if (!password) return setError("Введите новый пароль");
    const passErr = passwordError(password);
    if (passErr) return setError(passErr);
    try {
      setLoading(true);
      setError(null);
      await resetPassword({ email, code: code.trim(), new_password: password });
      setStep(3);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (step === 3) return (
    <div className="card form narrow">
      <h2>Пароль изменён</h2>
      <Link className="btn" to="/login">Войти</Link>
    </div>
  );

  return (
    <form onSubmit={step === 1 ? sendCode : changePass} noValidate className="card form narrow">
      <h2>Восстановление пароля</h2>
      {step === 1 ? (
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      ) : (
        <>
          {info && <p className="ok">{info}</p>}
          <input inputMode="numeric" maxLength={6} placeholder="Код из письма" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          <input type="password" placeholder="Новый пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading}>
        {loading ? "Загрузка..." : step === 1 ? "Отправить код" : "Сменить пароль"}
      </button>
      {step === 2 && (
        <button type="button" className="btn outline" onClick={() => { setStep(1); setCode(""); setError(null); }}>
          Запросить код заново
        </button>
      )}
      <p><Link to="/login">Назад ко входу</Link></p>
    </form>
  );
}

export default ForgotPassword;
