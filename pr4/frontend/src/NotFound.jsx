import { Link } from "react-router-dom";

// страница 404
function NotFound() {
  return (
    <div className="card">
      <h1>404</h1>
      <p>Такой страницы не существует.</p>
      <Link className="btn" to="/">На главную</Link>
    </div>
  );
}

export default NotFound;
