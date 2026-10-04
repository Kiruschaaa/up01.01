import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    console.error('Ошибка чтения пользователя в CartContext', e);
  }
  
  const cartKey = user ? `cart_${user.email || user.id || 'guest'}` : 'cart_guest';

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      setCart(saved ? JSON.parse(saved) : []);
    } catch {
      setCart([]);
    }
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  const addToCart = (product) => {
    setCart((prev) => {
      const productId = product.id || product.serviceId || product.Id;
      const existing = prev.find(item => 
        (item.id || item.serviceId || item.Id) === productId
      );
      
      if (existing) {
        return prev.map(item => 
          (item.id || item.serviceId || item.Id) === productId 
            ? { ...item, count: item.count + 1 } 
            : item
        );
      }
      return [...prev, { ...product, count: 1 }];
    });
  };

  const decreaseCount = (id) => {
    setCart((prev) => prev.map(item => 
      (item.id === id || item.serviceId === id || item.Id === id) 
        ? { ...item, count: Math.max(1, item.count - 1) } 
        : item
    ));
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter(item => 
      item.id !== id && item.serviceId !== id && item.Id !== id
    ));
  };

  const clearCart = () => setCart([]);
  return (
    <CartContext.Provider value={{ cart, addToCart, decreaseCount, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);