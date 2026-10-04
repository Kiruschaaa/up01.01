import { useState, useEffect } from 'react';
import Product from './Product'; 
import { getServices, getCategories } from './api/services';
import { useTheme } from './ThemeContext'; 

export default function Home() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { colors } = useTheme(); 

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [s, c] = await Promise.all([getServices(), getCategories()]);
        setServices(s || []);
        setCategories(c || []);
      } catch (err) {
        if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
          setError('Сервер временно недоступен. Пожалуйста, запустите бэкенд или проверьте подключение.');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCheck = (catId) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const filtered = services.filter((s) => {
    const matchCat = selectedCats.length === 0 || selectedCats.includes(s.category);
    const name = s.name || s.Name || '';
    const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || String(s.id || s.Id) === searchQuery.trim();
    
    return matchCat && matchSearch;
  });

  if (loading) return <p style={{ padding: '20px', color: colors.text }}>Загрузка каталога напитков...</p>;
  
  if (error) return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: colors.text }}>
      <h2 style={{ color: '#dc3545', marginBottom: '10px' }}>Упс, проблема с подключением</h2>
      <p style={{ fontSize: '18px', opacity: 0.8 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', padding: '20px', gap: '25px', color: colors.text }}>
      
      <aside style={{ width: '220px', borderRight: `1px solid ${colors.border}`, paddingRight: '15px' }}>
        <h3>Категории</h3>
        {categories.length === 0 && <p style={{ opacity: 0.7 }}>Категорий нет</p>}
        
        {categories.map((c) => {
          const id = c.id || c.Id || c.name;
          return (
            <div key={id} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedCats.includes(id)}
                  onChange={() => handleCheck(id)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                {c.name || c.Name}
              </label>
            </div>
          );
        })}
      </aside>

      <main style={{ flex: 1 }}>
        <input 
          type="text" 
          placeholder="Поиск напитков по названию или коду..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginBottom: '20px', 
            borderRadius: '8px', 
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            color: colors.text,
            boxSizing: 'border-box'
          }}
        />

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '15px'
        }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', opacity: 0.7 }}>
              <p style={{ fontSize: '18px' }}>Напитков не найдено</p>
            </div>
          ) : (
            filtered.map((item) => (
              <Product key={item.id || item.serviceId || item.Id} service={item} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}