import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

function ProductCard(props) {
  const { addToCart, cart } = useCart();
  const { colors } = useTheme();

  const productId = props.id || props.serviceId || props.Id;
  
  const count = (cart || []).find((i) => 
    (i.id || i.serviceId || i.Id) === productId
  )?.count || 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.cardBg || colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      height: '100%'
    }}>
      <div style={{ width: '100%', height: '180px', backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
        {props.image ? (
          <img 
            src={props.image} 
            alt={props.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#999' 
          }}>
            Нет фото
          </div>
        )}
      </div>

      <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: colors.text }}>{props.name}</h3>
        <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '20px', color: colors.text }}>
          {props.price} ₽
        </p>

        <div style={{ flex: 1 }}></div>

        <div style={{ marginTop: 'auto' }}>
          {count > 0 ? (
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '10px', 
              color: '#28a745', 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              В корзине: {count} шт.
            </div>
          ) : (
            <div style={{ height: '21px', marginBottom: '10px' }}></div>
          )}

          <button 
            onClick={() => addToCart(props)}
            style={{
              width: '100%',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Добавить в корзину
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;