import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Train, MapPin, Users,
    Armchair, CreditCard, ClipboardList, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
    { to: "/admin/dashboard",  label: "Dashboard",            icon: LayoutDashboard },
    { to: "/admin/trips",      label: "Quản lý chuyến tàu",  icon: Train           },
    { to: "/admin/locations",  label: "Quản lý ga tàu",      icon: MapPin          },
    { to: "/admin/users",      label: "Quản lý người dùng",  icon: Users           },
    { to: "/admin/seats",      label: "Quản lý ghế ngồi",    icon: Armchair        },
    { to: "/admin/payments",   label: "Quản lý thanh toán",  icon: CreditCard      },
    { to: "/admin/orders",     label: "Lịch sử đặt vé",      icon: ClipboardList   },
];

export default function AdminSidebar() {
    const { logout } = useAuth();
    const navigate   = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-logo">
                <div className="admin-sidebar-logo-text">🚂 DatVeXe</div>
                <div className="admin-sidebar-logo-sub">Admin Dashboard</div>
            </div>

            <nav className="admin-nav">
                <div className="admin-nav-section">Quản lý</div>

                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            "admin-nav-item" + (isActive ? " active" : "")
                        }
                    >
                        <item.icon size={17} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button className="admin-nav-item" onClick={handleLogout}>
                    <LogOut size={17} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}
