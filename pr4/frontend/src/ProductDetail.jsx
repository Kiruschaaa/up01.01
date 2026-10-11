import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById, getReviews, createReview, updateReview, deleteReview } from "./api";
import { AuthContext } from "./Authcontext";
import { CartContext } from "./Cartcontext";
import { money } from "./format";
import { PLACEHOLDER, onImageError } from "./placeholder";

// такой же текст на сервере
const REMOVED = "Отзыв удалён администратором за нарушение политики";

// страница товара с отзывами
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart, error: cartError } = useContext(CartContext);
  const isAdmin = user?.role_name === "admin";

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadData = () => {
    Promise.all([getProductById(id), getReviews(id)])
      .then(([srv, rev]) => { setProduct(srv); setReviews(rev); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [id]);

  // уже есть свой отзыв
  const hasReview = reviews.some((r) => r.mine);

  // новый отзыв
  const handleReview = async (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (text.length < 3 || !/[A-Za-zА-Яа-яЁё]/.test(text)) return setError("Напишите осмысленный комментарий (не короче 3 символов)");
    try {
      setSaving(true);
      setError(null);
      await createReview({ product_id: product.product_id, rating, comment: text });
      setComment("");
      setRating(5);
      loadData();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // админ меняет отзыв
  const handleEditReview = async (r) => {
    const newComment = prompt("Новый комментарий:", r.comment);
    if (!newComment || !newComment.trim()) return;
    const newRating = Number(prompt("Новая оценка (от 1 до 5):", r.rating));
    if (!Number.isInteger(newRating) || newRating < 1 || newRating > 5) return setError("Оценка должна быть целым числом от 1 до 5");
    try { setError(null); await updateReview(r.review_id, { rating: newRating, comment: newComment }); loadData(); } catch (err) { setError(err.message); }
  };

  // админ удаляет отзыв
  const handleDeleteReview = async (reviewId) => {
    try { setError(null); await deleteReview(reviewId); loadData(); } catch (err) { setError(err.message); }
  };

  const handleAdd = async () => {
    if (!user) return navigate("/login");
    if (await addToCart(product.product_id)) navigate("/cart");
  };

  if (loading) return <h2>Загрузка...</h2>;
  if (!product) return <p className="error">{error || "Услуга не найдена"}</p>;

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <Link className="btn outline" to="/">Вернуться в каталог</Link>
      </div>
      <div className="card">
        <img
          className="product-img detail"
          src={product.image || PLACEHOLDER}
          alt={product.name}
          onError={onImageError}
        />
        <span className="cat">{product.category_name}</span>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p>Гарантия: {product.warranty_months} мес.</p>
        <div className="price big">{money(product.price)}</div>
        {!isAdmin && <button className="btn" onClick={handleAdd}>В корзину</button>}
      </div>

      {(error || cartError) && <p className="error">{error || cartError}</p>}

      <h2>Отзывы ({reviews.length})</h2>
      {reviews.length === 0 && <p>Отзывов пока нет.</p>}
      {reviews.map((r) => r.comment === REMOVED ? (
        <div className="card" key={r.review_id}>
          <div className="row between">
            <b>{r.full_name}</b>
            <span>{r.created_date}</span>
          </div>
          <p className="muted">{REMOVED}</p>
        </div>
      ) : (
        <div className="card" key={r.review_id}>
          <div className="row between">
            <b>{r.full_name}</b>
            <span>{r.created_date}</span>
          </div>
          <div className="stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
          <p>{r.comment}</p>
          {isAdmin && (
            <div className="row">
              <button className="btn outline" onClick={() => handleEditReview(r)}>Изменить</button>
              <button className="btn btn-danger" onClick={() => handleDeleteReview(r.review_id)}>Удалить</button>
            </div>
          )}
        </div>
      ))}

      {!user && <p><Link to="/login">Войдите</Link>, чтобы оставить отзыв.</p>}
      {user && hasReview && <p className="muted">Вы уже оставили отзыв на этот товар.</p>}
      {user && !hasReview && (
        <form className="card form" onSubmit={handleReview} noValidate>
          <h3>Оставить отзыв</h3>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>Оценка: {n} из 5</option>)}
          </select>
          <textarea placeholder="Комментарий" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn" disabled={saving}>{saving ? "Отправка..." : "Отправить"}</button>
        </form>
      )}
    </>
  );
}

export default ProductDetail;
