import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PAGE_TITLES: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/trips":     "Quản lý chuyến tàu",
    "/admin/locations": "Quản lý ga tàu",
    "/admin/users":     "Quản lý người dùng",
    "/admin/seats":     "Quản lý ghế ngồi",
    "/admin/payments":  "Quản lý thanh toán",
    "/admin/orders":    "Lịch sử đặt vé",
};

export default function AdminHeader() {
    const location = useLocation();
    const { user } = useAuth();

    const title = PAGE_TITLES[location.pathname] ?? "Admin";
    const initials = user?.fullName
        ? user.fullName.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase()
        : "A";

    return (
        <header className="admin-header">
            <span className="admin-header-title">{title}</span>
            <div className="admin-header-right">
                <div className="admin-avatar">{initials}</div>
                <span className="admin-header-name">{user?.fullName ?? "Admin"}</span>
            </div>
        </header>
    );
}
