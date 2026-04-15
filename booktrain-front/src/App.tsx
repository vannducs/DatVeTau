import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import AccountPage from "./pages/AccountPage"
import MyOrdersPage from "./pages/MyOrdersPage"
import SearchResultPage from "./pages/SearchResultPage"
import SeatSelectionPage from "./pages/SeatSelectionPage"
import PassengerInfoPage from "./pages/PassengerInfoPage"
import AdminRoute from "./components/common/AdminRoute"
import PrivateRoute from "./components/common/PrivateRoute"
import PaymentPage from "./pages/PaymentPage"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/trains/search" element={<SearchResultPage />} />

          <Route path="/account" element={
            <PrivateRoute><AccountPage /></PrivateRoute>
          } />
          <Route path="/my-orders" element={
            <PrivateRoute><MyOrdersPage /></PrivateRoute>
          } />
          <Route path="/trains/booking/:tripId" element={ 
            <PrivateRoute><SeatSelectionPage /></PrivateRoute>
          } />
          <Route path="/trains/passenger-info" element={ 
            <PrivateRoute><PassengerInfoPage /></PrivateRoute>
          } />
          <Route path="/trains/payment" element={
              <PrivateRoute><PaymentPage /></PrivateRoute>
          } />

  
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