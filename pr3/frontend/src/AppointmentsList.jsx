import { useState, useEffect } from 'react';
import { getAppointments, deleteAppointment } from './api/appointments';
import { getServices } from './api/services';
import { useTheme } from './ThemeContext';

export default function AppointmentsList({ userId }) {
  const { colors, theme } = useTheme(); 
  const [appointments, setAppointments] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    console.error('Ошибка чтения пользователя', e);
  }

  const isAdmin = currentUser && (currentUser.roleId === 1 || currentUser.RoleId === 1 || currentUser.role === 'admin');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appData, srvData] = await Promise.all([
        getAppointments().catch(() => []),
        getServices().catch(() => []) 
      ]);
      setAppointments(Array.isArray(appData) ? appData : []);
      setServicesCatalog(Array.isArray(srvData) ? srvData : []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки заказов');
      setAppointments([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteGroup = async (orderIds) => {
    if (!window.confirm('Отменить этот заказ целиком?')) return;
    try {
      for (const id of orderIds) {
        await deleteAppointment(id);
      }
      setAppointments((prev) => prev.filter((item) => !orderIds.includes(item.id || item.appointmentId || item.Id)));
    } catch (err) {
      alert('Не удалось отменить заказ: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: colors.text }}>Загрузка списка заказов...</div>;
  if (error) return <div style={{ padding: '20px', color: '#dc3545' }}>Ошибка: {error}</div>;

  const currentUserId = userId || currentUser?.id || currentUser?.userId || currentUser?.Id;

  const filteredList = isAdmin
    ? appointments
    : appointments.filter((item) => {
        if (!item) return false;
        const itemUserId = item.clientId || item.userId || item.ClientId || item.UserId || item.user_id;
        return String(itemUserId) === String(currentUserId);
      });

  const groupedOrders = {};

  filteredList.forEach(item => {
    if (!item) return;

    const timeKey = item.appointmentTime || item.appointment_date || 'unknown';
    const userKey = item.clientId || item.userId || item.ClientId || item.UserId || item.user_id || 'unknown';
    
    const key = `${timeKey}_${userKey}`;
    
    const orderId = item.id || item.appointmentId || item.Id || Math.random();

    const targetServiceId = item.serviceId || item.ServiceId || (item.service && item.service.id);
    const foundDrink = servicesCatalog.find(s => String(s.id || s.Id) === String(targetServiceId));
    const catalogPrice = foundDrink ? Number(foundDrink.price || foundDrink.Price || 0) : 0;

    const price = Number(
      item.servicePrice || 
      item.price || 
      item.Price || 
      (item.service && item.service.price) || 
      catalogPrice || 
      0
    );

    if (!groupedOrders[key]) {
      groupedOrders[key] = {
        orderId: orderId, 
        date: timeKey,
        clientInfo: item.clientEmail || (item.user && item.user.email) || item.clientId || 'Аноним',
        status: item.status || 'Оплачено',
        address: item.address || item.deliveryAddress || item.Address || 'Не указан',
        items: {},
        totalSum: 0, 
        allIds: []
      };
    }

    let drinkName = 'Неизвестный напиток';
    if (item.serviceName) drinkName = item.serviceName;
    else if (item.service && item.service.name) drinkName = item.service.name;
    else if (item.drinkName) drinkName = item.drinkName;
    else if (foundDrink && (foundDrink.name || foundDrink.Name)) drinkName = foundDrink.name || foundDrink.Name;
    else if (item.serviceId) drinkName = `Напиток #${item.serviceId}`;

    if (!groupedOrders[key].items[drinkName]) groupedOrders[key].items[drinkName] = 0;
    groupedOrders[key].items[drinkName] += 1; 

    groupedOrders[key].totalSum += price;
    groupedOrders[key].allIds.push(orderId);
  });

  const ordersArray = Object.values(groupedOrders).sort((a, b) => {
    if (a.date === 'unknown') return 1;
    if (b.date === 'unknown') return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div style={{ padding: '20px', backgroundColor: colors.bg, color: colors.text }}>
      <h2>{isAdmin ? 'Все оформленные заказы' : 'История заказов'}</h2>

      {ordersArray.length === 0 ? (
        <p>Заказов пока нет.</p>
      ) : (
        <div>
          {ordersArray.map((order) => {
            return (
              <div key={order.orderId} style={{ 
                border: `1px solid ${colors.border}`, 
                padding: '20px', 
                marginBottom: '20px', 
                borderRadius: '12px',
                backgroundColor: colors.cardBg || colors.navBg,
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>Заказ #{order.orderId}</h3>
                  <span style={{ 
                    backgroundColor: '#dbeafe', 
                    color: '#1e40af', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {order.status}
                  </span>
                </div>

                {/* Список товаров */}
                <ul style={{ paddingLeft: '20px', marginBottom: '15px', color: colors.textSecondary || '#666' }}>
                  {Object.entries(order.items).map(([name, count]) => (
                    <li key={name}>
                      <strong>{name}</strong> — {count} шт.
                    </li>
                  ))}
                </ul>

                <p style={{ fontWeight: 'bold', fontSize: '18px', margin: '10px 0' }}>
                  Сумма заказа: {Math.round(order.totalSum)} ₽
                </p>

                {/* Вывод адреса в чеке */}
                <p style={{ color: colors.textSecondary || '#666', fontSize: '14px', marginBottom: '5px' }}>
                  <strong>Адрес доставки:</strong> {order.address}
                </p>

                <p style={{ color: colors.textSecondary || '#666', fontSize: '14px' }}>
                  <strong>Время выдачи:</strong> {' '}
                  {order.date !== 'unknown' ? new Date(order.date).toLocaleString('ru-RU') : 'Не указано'}
                </p>

                {isAdmin && (
                  <p style={{ fontSize: '14px', color: colors.textSecondary || '#666' }}>
                    <strong>Покупатель:</strong> {order.clientInfo}
                  </p>
                )}

                <button 
                  onClick={() => handleDeleteGroup(order.allIds)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    transition: 'background-color 0.2s',
                    marginTop: '10px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  Отменить заказ
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}