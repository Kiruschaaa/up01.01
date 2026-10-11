import { createContext, useState, useEffect } from "react";

// хранит текущего пользователя
export const AuthContext = createContext();

// берём пользователя из localStorage
function readUser() {
    try {
        const saved = localStorage.getItem("user");
        const parsed = saved ? JSON.parse(saved) : null;
        return parsed && parsed.role_name && parsed.token ? parsed : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readUser);

    // вход или выход в одной вкладке обновляет остальные
    useEffect(() => {
        const onStorage = (e) => { if (e.key === "user" || e.key === null) setUser(readUser()); };
        window.addEventListener("storage", onStorage);
        // токен больше не подходит, выходим
        const onExpired = () => { localStorage.removeItem("user"); setUser(null); };
        window.addEventListener("auth-expired", onExpired);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("auth-expired", onExpired);
        };
    }, []);

    // сохраняем пользователя в localStorage
    // после сохранения профиля токен не приходит, оставляем старый
    const login = (userData) => {
        let token = userData.token;
        if (!token) { try { token = JSON.parse(localStorage.getItem("user") || "null")?.token; } catch { token = undefined; } }
        const full = { ...userData, token };
        localStorage.setItem("user", JSON.stringify(full));
        setUser(full);
    };
    const logout = () => {
        localStorage.removeItem("user");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
