import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, getCategories } from "./api";
import { AuthContext } from "./Authcontext";
import { CartContext } from "./Cartcontext";
import { money } from "./format";
import ProductCard from "./ProductCard";

// каталог
function Catalog() {
  const { user } = useContext(AuthContext);
  const { addToCart, error: cartError } = useContext(CartContext);
  const navigate = useNavigate();
  const isAdmin = user?.role_name === "admin";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([srv, cat]) => { setProducts(srv); setCategories(cat); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // в корзину
  const handleAdd = async (product) => {
    setMessage("");
    if (!user) return navigate("/login");
    if (await addToCart(product.product_id)) setMessage(`«${product.name}» добавлен в корзину`);
  };

  // поиск и фильтры работают сразу при вводе
  const q = query.trim().toLowerCase();
  const filtered = products.filter((s) =>
    (!category || s.category_name === category) &&
    (!maxPrice || s.price <= Number(maxPrice)) &&
    (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  );
  // подсказки под поиском
  const suggestions = q ? products.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6) : [];

  if (loading) return <h2>Загрузка...</h2>;

  return (
    <>
      <h1>Каталог сантехники</h1>
      <p className="lead">Смесители, ванны, трубы и отопление. Доставим в выбранный вами день.</p>

      <div className="filters">
        <div className="search">
          <input
            type="search"
            placeholder="Поиск товара"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
          />
          {focus && suggestions.length > 0 && (
            <div className="suggest">
              {suggestions.map((s) => (
                <div key={s.product_id} className="suggest-item" onMouseDown={() => navigate(`/product/${s.product_id}`)}>
                  <span>{s.name}</span>
                  <b>{money(s.price)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.category_id}>{c.category_name}</option>)}
        </select>
        <input type="number" min="0" placeholder="Цена до, ₽" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </div>

      {(error || cartError) && <p className="error">{error || cartError}</p>}
      {message && !cartError && <p className="ok">{message}</p>}

      <div className="grid">
        {filtered.map((s) => <ProductCard key={s.product_id} product={s} isAdmin={isAdmin} onAdd={handleAdd} />)}
      </div>
      {filtered.length === 0 && <p>Ничего не найдено.</p>}
    </>
  );
}

export default Catalog;
