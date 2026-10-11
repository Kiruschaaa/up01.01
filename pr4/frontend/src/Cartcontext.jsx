import { createContext, useState, useEffect, useContext } from "react";
import { AuthContext } from "./Authcontext";
import { getCart, addToCart as apiAdd, setCartQuantity, removeFromCart as apiRemove } from "./api";

// хранит корзину
export const CartContext = createContext();

export function CartProvider({ children }) {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(!!user && user.role_name !== "admin");
    const [error, setError] = useState(null);

    // загрузить корзину
    const fetchCart = () =>
        getCart(user.user_id).then(setItems).catch((err) => setError(err.message));

    useEffect(() => {
        setError(null);
        if (!user || user.role_name === "admin") return setItems([]);
        setLoading(true);
        fetchCart().finally(() => setLoading(false));
    }, [user]);

    // любое действие и потом обновляем корзину
    const run = async (action) => {
        try {
            setError(null);
            await action();
            await fetchCart();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const addToCart = (productId) => run(() => apiAdd(user.user_id, productId));
    const changeQuantity = (productId, quantity) => run(() => setCartQuantity(user.user_id, productId, quantity));
    const removeFromCart = (productId) => run(() => apiRemove(user.user_id, productId));
    const reloadCart = () => fetchCart();

    // сколько штук и на какую сумму
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, loading, error, itemCount, total, addToCart, changeQuantity, removeFromCart, reloadCart }}>
            {children}
        </CartContext.Provider>
    );
}
