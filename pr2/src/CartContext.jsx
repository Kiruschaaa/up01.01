import { createContext, useContext, useReducer, useEffect, useMemo } from "react";

const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const exists = state.find((i) => i.id === action.payload.id);
      if (exists) {
        return state.map((i) =>
          i.id === action.payload.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...state, { ...action.payload, qty: 1 }];
    }
    case "REMOVE":
      return state.filter((i) => i.id !== action.payload);
    case "INCREMENT":
      return state.map((i) =>
        i.id === action.payload ? { ...i, qty: i.qty + 1 } : i
      );
    case "DECREMENT":
      return state
        .map((i) =>
          i.id === action.payload ? { ...i, qty: i.qty - 1 } : i
        )
        .filter((i) => i.qty > 0);
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], () => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product) => dispatch({ type: "ADD", payload: product });
  const removeFromCart = (id) => dispatch({ type: "REMOVE", payload: id });
  const increment = (id) => dispatch({ type: "INCREMENT", payload: id });
  const decrement = (id) => dispatch({ type: "DECREMENT", payload: id });

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, increment, decrement, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);