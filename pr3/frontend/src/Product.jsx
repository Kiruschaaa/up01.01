import { useCart } from "./CartContext";
import { useTheme } from "./ThemeContext";

export default function Product({ service }) {
  const { addToCart, cart } = useCart();
  const { colors } = useTheme();

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && (user.roleId === 1 || user.RoleId === 1 || user.role === 'admin');

  const productId = service.id || service.serviceId || service.Id;

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
        {service.image || service.Image ? (
          <img 
            src={service.image || service.Image} 
            alt={service.name || service.Name} 
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
        
        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: colors.text }}>
          {service.name || service.Name}
        </h3>
        
        {(service.description || service.Description) && (
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.textSecondary || '#666', flex: 1 }}>
            {service.description || service.Description}
          </p>
        )}

        <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', fontSize: '20px', color: colors.text }}>
          {service.price || service.Price} ₽
        </p>

        <div style={{ flex: 1 }}></div>

        {!isAdmin && (
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
              onClick={() => addToCart(service)}
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
              В корзину
            </button>
          </div>
        )}
      </div>
    </div>
  );
}