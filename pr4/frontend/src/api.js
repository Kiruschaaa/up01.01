// адрес сервера
const API_URL = 'http://localhost:3001/api';

// общий запрос к api
async function request(endpoint, options = {}) {
    // берём токен из localStorage
    let token = null;
    try { token = JSON.parse(localStorage.getItem('user') || 'null')?.token || null; } catch { token = null; }
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch (networkError) {
        // говорим приложению что сервер лёг
        window.dispatchEvent(new Event('server-down'));
        throw new Error('Сервер недоступен. Убедитесь, что бэкенд запущен на порту 3001.');
    }

    let data;
    try {
        data = await res.json();
    } catch (parseError) {
        throw new Error('Сервер вернул некорректный ответ');
    }
    if (!res.ok) {
        // токен не подошёл, выходим из аккаунта
        if (res.status === 401 && token) window.dispatchEvent(new Event('auth-expired'));
        throw new Error(data.error || 'Ошибка запроса');
    }
    return data;
}

// короткие обёртки
const post = (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) });
const put = (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
const del = (endpoint) => request(endpoint, { method: 'DELETE' });

// проверка сервера
export const checkServer = () => request('/health');

// вход и регистрация
export const loginUser = (data) => post('/auth/login', data);
export const registerUser = (data) => post('/auth/register', data);
export const forgotPassword = (email) => post('/auth/forgot', { email });
export const resetPassword = (data) => post('/auth/reset', data);

// пользователи
export const getUsers = () => request('/users');
export const createUser = (data) => post('/users', data);
export const updateUser = (id, data) => put(`/users/${id}`, data);
export const changePassword = (id, data) => put(`/users/${id}/password`, data);
export const getUserOrders = (id) => request(`/users/${id}/orders`);

// категории
export const getCategories = () => request('/categories');
export const createCategory = (data) => post('/categories', data);
export const updateCategory = (id, data) => put(`/categories/${id}`, data);
export const deleteCategory = (id) => del(`/categories/${id}`);

// товары
export const getProducts = () => request('/products');
export const getProductById = (id) => request(`/products/${id}`);
export const createProduct = (data) => post('/products', data);
export const updateProduct = (id, data) => put(`/products/${id}`, data);
export const deleteProduct = (id) => del(`/products/${id}`);

// отзывы
export const getReviews = (productId) => request(`/products/${productId}/reviews`);
export const createReview = (data) => post('/reviews', data);
export const updateReview = (id, data) => put(`/reviews/${id}`, data);
export const deleteReview = (id) => del(`/reviews/${id}`);

// корзина
export const getCart = (userId) => request(`/cart/${userId}`);
export const addToCart = (userId, productId) => post('/cart', { product_id: productId });
export const setCartQuantity = (userId, productId, quantity) => put('/cart', { product_id: productId, quantity });
export const removeFromCart = (userId, productId) => del(`/cart/${userId}/${productId}`);

// заказы
export const createOrder = (data) => post('/orders', data);
export const getWelcomeDiscount = (userId) => request(`/users/${userId}/welcome-discount`);

// купоны
export const checkCoupon = (code) => post('/coupons/check', { code });
export const getCoupons = () => request('/coupons');
export const createCoupon = (data) => post('/coupons', data);
export const updateCoupon = (id, data) => put(`/coupons/${id}`, data);
export const deleteCoupon = (id) => del(`/coupons/${id}`);
export const getAvailability = (date) => request(`/orders/availability?date=${date}`);
export const payOrder = (id) => put(`/orders/${id}/pay`, {});
export const getAllOrders = () => request('/orders');
export const updateOrderStatus = (id, status) => put(`/orders/${id}/status`, { status });
