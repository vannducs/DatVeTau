import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import AccountPage from "./pages/AccountPage"
import MyOrdersPage from "./pages/MyOrdersPage"
import SearchResultPage from "./pages/SearchResultPage"
import AdminRoute from "./components/common/AdminRoute"
import SeatSelectionPage from "./pages/SeatSelectionPage"

function App() {
  return (
    <BrowserRouter>        
      <AuthProvider> 
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/my-orders" element={<MyOrdersPage />} />
          <Route path="/trains/search" element={<SearchResultPage />} />
          <Route path="/trains/booking/:tripId" element={<SeatSelectionPage />} />
          <Route path="/admin/*" element={
              <AdminRoute>
                  <div>Admin Dashboard (sẽ làm ở bước 2)</div>
              </AdminRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
