import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';

export default function Dashboard() {
  const { colors, theme } = useTheme();
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && (user.roleId === 1 || user.RoleId === 1 || user.role === 'admin');

  const [categories, setCategories] = useState([
    { id: 1, name: 'Газировки' }
  ]);
  const [catName, setCatName] = useState('');
  const [catMsg, setCatMsg] = useState('');

  // Загружаем купоны из памяти, чтобы они не пропадали
  const [coupons, setCoupons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coupons') || '[]');
    } catch {
      return [];
    }
  });
  
  const [editCouponId, setEditCouponId] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponTarget, setCouponTarget] = useState(''); 

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  // Сохраняем купоны в общую память при любом изменении
  useEffect(() => {
    localStorage.setItem('coupons', JSON.stringify(coupons));
  }, [coupons]);

  const handleAddCategory = (e) => {
    e.preventDefault();
    const newCat = catName.trim();
    if (!newCat) return;

    if (categories.some(cat => cat.name?.toLowerCase() === newCat.toLowerCase())) {
      setCatMsg(`Категория "${newCat}" уже существует!`);
      return;
    }
    setCategories([...categories, { id: Date.now(), name: newCat }]);
    setCatName('');
    setCatMsg('Успешно добавлено!');
    setTimeout(() => setCatMsg(''), 3000);
  };

  const handleSaveCoupon = (e) => {
    e.preventDefault();
    const code = couponCode.toUpperCase().trim();
    const discount = Math.min(Number(couponDiscount), 99);
    const targetId = couponTarget.trim();

    if (editCouponId) {
      setCoupons(coupons.map(c => c.id === editCouponId ? { ...c, code, discount, targetId } : c));
      setEditCouponId(null);
    } else {
      if (coupons.some(c => c.code === code)) {
        alert('Такой купон уже существует!');
        return;
      }
      setCoupons([...coupons, { id: Date.now(), code, discount, targetId }]);
    }
    resetCouponForm();
  };

  const handleEditCoupon = (coupon) => {
    setEditCouponId(coupon.id);
    setCouponCode(coupon.code);
    setCouponDiscount(coupon.discount);
    setCouponTarget(coupon.targetId || '');
  };

  const handleDeleteCoupon = (id) => {
    if (window.confirm('Удалить этот купон?')) {
      setCoupons(coupons.filter(c => c.id !== id));
      if (editCouponId === id) resetCouponForm();
    }
  };

  const resetCouponForm = () => {
    setEditCouponId(null);
    setCouponCode('');
    setCouponDiscount('');
    setCouponTarget('');
  };

  if (!isAdmin) return null;

  const cardStyle = {
    flex: '1 1 450px', 
    backgroundColor: colors.cardBg || colors.navBg, 
    padding: '20px', 
    borderRadius: '12px', 
    border: `1px solid ${colors.border}`,
    color: colors.text
  };

  const inputStyle = {
    padding: '10px', 
    borderRadius: '6px', 
    border: `1px solid ${colors.border}`, 
    backgroundColor: colors.bg, 
    color: colors.text
  };

  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <h2>Панель администратора</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Категории */}
        <div style={cardStyle}>
          <h3>Категории</h3>
          
          {catMsg && (
            <div style={{ color: 'green', marginBottom: '10px' }}>{catMsg}</div>
          )}

          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              value={catName}
              onChange={(e) => setCatName(e.target.value)} 
              placeholder="Новая категория" 
              style={{ ...inputStyle, flex: 1 }} 
            />
            <button type="submit" style={{ padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Добавить</button>
          </form>

          <ul style={{ paddingLeft: '20px' }}>
            {categories.map(cat => (
              <li key={cat.id}>{cat.name}</li>
            ))}
          </ul>
        </div>

        {/* Управление купонами */}
        <div style={cardStyle}>
          <h3>Управление купонами</h3>
          
          <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)} 
                placeholder="Код (напр. PROMO)" 
                required 
                style={{ ...inputStyle, flex: 2 }} 
              />
              <input 
                value={couponDiscount}
                onChange={(e) => setCouponDiscount(e.target.value)} 
                placeholder="% (до 99)" 
                required 
                max="99" 
                min="1" 
                type="number"
                style={{ ...inputStyle, flex: 1 }} 
              />
            </div>
            
            <input 
              value={couponTarget}
              onChange={(e) => setCouponTarget(e.target.value)} 
              placeholder="ID товара (оставьте пустым для всех товаров)" 
              style={{ ...inputStyle, width: '100%' }} 
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '10px', borderRadius: '6px', cursor: 'pointer', flex: 1 }}>
                {editCouponId ? 'Сохранить изменения' : 'Создать купон'}
              </button>
              
              {editCouponId && (
                <button 
                  type="button" 
                  onClick={resetCouponForm}
                  style={{ padding: '10px', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#6b7280', color: 'white', border: 'none' }}
                >
                  Отмена
                </button>
              )}
            </div>
          </form>

          {coupons.length === 0 ? (
            <p>Купонов пока нет.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {coupons.map(coupon => (
                <li key={coupon.id} style={{ 
                  borderBottom: `1px solid ${colors.border}`, 
                  padding: '10px 0', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div>
                    <strong>{coupon.code}</strong> −{coupon.discount}%
                    <div style={{ fontSize: '12px', color: colors.textSecondary || '#666' }}>
                      {coupon.targetId ? `Только для товара ID: ${coupon.targetId}` : 'Действует на всю корзину'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => handleEditCoupon(coupon)} 
                      style={{ backgroundColor: 'transparent', color: '#ffc107', border: '1px solid #ffc107', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      изменить
                    </button>
                    <button 
                      onClick={() => handleDeleteCoupon(coupon.id)} 
                      style={{ backgroundColor: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}