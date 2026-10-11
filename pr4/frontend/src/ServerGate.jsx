import { useState, useEffect } from "react";
import { checkServer } from "./api";

// проверка сервера и бд
const ping = (setOnline) => checkServer().then(() => setOnline(true)).catch(() => setOnline(false));

// страница «Технические работы»
function ServerGate({ children }) {
  // null = проверяем, true = работает, false = техработы
  const [online, setOnline] = useState(null);

  useEffect(() => {
    ping(setOnline);
    // раз в 5 секунд проверяем сервер
    const timer = setInterval(() => ping(setOnline), 5000);
    // если запрос не прошёл, сразу показываем техработы
    const handleDown = () => setOnline(false);
    window.addEventListener("server-down", handleDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener("server-down", handleDown);
    };
  }, []);

  if (online === null) return <main className="container"><h2>Загрузка...</h2></main>;

  if (!online) return (
    <main className="container">
      <div className="card">
        <h1>Технические работы</h1>
        <p>Нет связи с сервером: сервис временно недоступен, на сервере ведутся технические работы. Мы скоро вернёмся.</p>
        <p className="muted">Страница обновится сама, как только сервер заработает.</p>
        <button className="btn" onClick={() => ping(setOnline)}>Проверить снова</button>
      </div>
    </main>
  );

  return children;
}

export default ServerGate;
