import { Link } from "react-router-dom";
import { PLACEHOLDER, onImageError } from "./placeholder";
import { money } from "./format";

// карточка товара
function ProductCard({ product, isAdmin, onAdd }) {
  return (
    <div className="card product">
      <Link to={`/product/${product.product_id}`}>
        <img className="product-img" src={product.image || PLACEHOLDER} alt={product.name} onError={onImageError} />
      </Link>
      <div className="product-body">
        <span className="cat">{product.category_name}</span>
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="price-row">
          <span className="warranty">Гарантия {product.warranty_months} мес.</span>
          <span className="price">{money(product.price)}</span>
        </div>
        <div className="row">
          <Link className="btn outline" to={`/product/${product.product_id}`}>Подробнее</Link>
          {!isAdmin && <button className="btn" onClick={() => onAdd(product)}>В корзину</button>}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
