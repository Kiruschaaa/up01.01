import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';

export default function Menu() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, colors } = useTheme();
  
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    console.error(e);
  }
  
  const isAdmin = user && (user.roleId === 1 || user.RoleId === 1 || user.role === 'admin');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getLinkStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      marginRight: '20px',
      textDecoration: 'none',
      color: isActive ? '#dc2626' : colors.text,
      fontWeight: isActive ? 'bold' : 'normal',
      fontSize: '16px',
      transition: 'color 0.3s'
    };
  };

  return (
    <nav style={{ 
      padding: '15px 20px', 
      borderBottom: `1px solid ${colors.border}`, 
      backgroundColor: colors.background,
      display: 'flex', 
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      <Link to="/" style={getLinkStyle('/')}>Каталог</Link>

      {!isAdmin && (
        <Link to="/cart" style={getLinkStyle('/cart')}>Корзина</Link>
      )}

      {isAdmin && (
        <Link to="/dashboard" style={getLinkStyle('/dashboard')}>Админка</Link>
      )}

      <button 
        onClick={toggleTheme}
        style={{ 
          background: 'none', 
          border: `1px solid ${colors.border}`,
          color: colors.text,
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginRight: '20px',
          fontSize: '14px'
        }}
      >
        {theme === 'light' ? 'Тёмная' : 'Светлая'}
      </button>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          <Link to="/profile" style={getLinkStyle('/profile')}>Профиль</Link>
          
          <span style={{ 
            marginRight: '20px', 
            fontSize: '14px', 
            color: colors.textSecondary || '#666' 
          }}>
            {user.email || user.Email}
          </span>

          <button 
            onClick={handleLogout}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#dc3545', 
              cursor: 'pointer', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Выйти
          </button>
        </div>
      ) : (
        <Link to="/login" style={{ ...getLinkStyle('/login'), marginLeft: 'auto' }}>Войти</Link>
      )}
    </nav>
  );
}