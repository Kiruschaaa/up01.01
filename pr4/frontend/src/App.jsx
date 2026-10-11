import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './Themecontext'
import ServerGate from './ServerGate'
import { AuthProvider } from './Authcontext'
import { CartProvider } from './Cartcontext'
import Navbar from './Navbar'
import Catalog from './Catalog'
import ProductDetail from './ProductDetail'
import Login from './Login'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import Cart from './Cart'
import Dashboard from './Dashboard'
import Admin from './Admin'
import NotFound from './NotFound'

// страницы сайта
function App() {
  return (
    <ThemeProvider>
    <ServerGate>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </ServerGate>
    </ThemeProvider>
  )
}

export default App
