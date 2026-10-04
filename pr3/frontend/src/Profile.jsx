import { useState } from 'react';
import AppointmentsList from './AppointmentsList';
import { useTheme } from './ThemeContext';

export default function Profile() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const { colors, theme } = useTheme(); 
  
  const [email, setEmail] = useState(user?.email || user?.Email || '');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [msg, setMsg] = useState('');

  if (!user) {
    return (
      <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text, minHeight: '100vh' }}>
        <h2>Доступ ограничен</h2>
        <p>Пожалуйста, авторизуйтесь.</p>
      </div>
    );
  }

  const userDiscount = user.discount || user.Discount || 0;
  const roleName = user.role === 'admin' || user.roleId === 1 ? 'Администратор' : 'Покупатель';

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    const updatedUser = { ...user, email, address };
    if (password) updatedUser.password = password;

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setPassword(''); 
    setMsg('Профиль успешно обновлен!');
    setTimeout(() => setMsg(''), 3000);
  };

  const cardStyle = {
    flex: '1 1 300px',
    backgroundColor: colors.cardBg || colors.navBg,
    padding: '25px',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    color: colors.text
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    boxSizing: 'border-box',
    backgroundColor: colors.bg,
    color: colors.text,
    marginTop: '5px',
    marginBottom: '15px'
  };

  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <h2>Мой профиль</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '40px' }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Информация</h3>
          <p><strong>Роль:</strong> {roleName}</p>
          <p><strong>Текущий логин:</strong> {user.email || user.Email}</p>
          
          {userDiscount > 0 ? (
            <p style={{ color: '#059669', fontWeight: 'bold' }}>
              Ваша персональная скидка: {userDiscount}%
            </p>
          ) : (
            <p style={{ color: colors.textSecondary || '#666' }}>У вас пока нет персональной скидки.</p>
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Настройки аккаунта</h3>
          
          {msg && (
            <div style={{ 
              backgroundColor: '#d1fae5', 
              color: '#065f46', 
              padding: '10px', 
              borderRadius: '4px', 
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              ✓ {msg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <label>Логин (Email)</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={inputStyle} 
            />

            <label>Новый пароль (пусто = без изменений)</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              style={inputStyle} 
            />

            <label>Основной адрес доставки</label>
            <input 
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)} 
              placeholder="г. Чехов" 
              style={inputStyle} 
            />

            <button 
              type="submit"
              style={{ 
                backgroundColor: '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '12px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '16px',
                width: '100%'
              }}
            >
              Сохранить изменения
            </button>
          </form>
        </div>
      </div>

      <AppointmentsList />
    </div>
  );
}