import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

function ProductCard(props) {
  const { addToCart, items } = useCart();
  const { colors } = useTheme();

  const count = items.find((i) => i.id === props.id)?.qty || 0;

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      width: '240px',
      textAlign: 'center',
      margin: '10px',
      backgroundColor: colors.bg,
      color: colors.text,
      display: 'inline-block',
      verticalAlign: 'top'
    }}>
      <img src={props.image} alt={props.name} style={{ width: '100%', height: 'auto' }} />
      <h3>{props.name}</h3>
      <p>Цена: {props.price} руб.</p>
      <p>В корзине: {count}</p>
      <button
        onClick={() => addToCart(props)}
        style={{
          backgroundColor: colors.btnBg,
          color: colors.btnText,
          border: 'none',
          borderRadius: '6px',
          padding: '8px 14px',
          cursor: 'pointer'
        }}
      >
        В корзину
      </button>
    </div>
  );
}

export default ProductCard;