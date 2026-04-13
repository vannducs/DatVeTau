import { useState } from "react";
import { Link } from "react-router-dom";
import {
    User, Star, ShoppingBag, Tag, Gift,
    CreditCard, MessageSquare, HelpCircle,
    Lightbulb, Briefcase, LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "./AccountPage.css";
import Header from "../components/common/Header"

export default function AccountPage() {
    const { user, logout } = useAuth();
    const [form, setForm] = useState({
        fullName: user?.fullName || "",
        phoneNumber: user?.phoneNumber || "",
        dateOfBirth: "",
        gender: "male",
    });

    const set = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => setForm({ ...form, [field]: e.target.value });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: gọi API cập nhật thông tin
        alert("Lưu thành công!");
    };

    const menuItems = [
        { icon: <User size={18} />, label: "Thông tin tài khoản", to: "/account", active: true },
        { icon: <Star size={18} />, label: "Điểm thưởng của tôi", to: "#" },
        { icon: <ShoppingBag size={18} />, label: "Đơn hàng của tôi", to: "/my-orders" },
        { icon: <Tag size={18} />, label: "Ưu đãi", to: "#" },
        { icon: <Gift size={18} />, label: "Giới thiệu nhận quà", to: "#"},
        { icon: <CreditCard size={18} />, label: "Quản lý thẻ", to: "#" },
        { icon: <MessageSquare size={18} />, label: "Đánh giá chuyến đi", to: "#" },
        { icon: <HelpCircle size={18} />, label: "Trung tâm Hỗ trợ", to: "#"},
        { icon: <Lightbulb size={18} />, label: "Góp ý", to: "#" },
    ];

    return (
      <>
      <Header/>
        <div className="account-page">
            {/* Breadcrumb */}
            <div className="account-breadcrumb">
                <Link to="/">Trang chủ</Link>
                <span> &gt; </span>
                <span>Thông tin tài khoản</span>
            </div>

            <div className="account-layout">
                {/* Sidebar */}
                <aside className="account-sidebar">
                    {menuItems.map((item, i) => (
                        <Link
                            key={i}
                            to={item.to}
                            className={`sidebar-item ${item.active ? "sidebar-item--active" : ""}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-label">{item.label}</span>
                            {item.badge && (
                                <span className="sidebar-badge">{item.badge}</span>
                            )}
                        </Link>
                    ))}

                    {/* Đăng xuất */}
                    <button className="sidebar-item sidebar-item--logout" onClick={logout}>
                        <span className="sidebar-icon"><LogOut size={18} /></span>
                        <span className="sidebar-label">Đăng xuất</span>
                    </button>
                </aside>

                {/* Form content */}
                <main className="account-main">
                    <form className="account-form" onSubmit={handleSave}>
                        <div className="form-group">
                            <label>Họ và tên <span className="required">*</span></label>
                            <input
                                type="text"
                                value={form.fullName}
                                onChange={set("fullName")}
                                placeholder="Nhập họ và tên"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                                type="tel"
                                value={form.phoneNumber}
                                onChange={set("phoneNumber")}
                                placeholder="Nhập số điện thoại"
                            />
                        </div>

                        <div className="form-group">
                            <label>Ngày sinh</label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={set("dateOfBirth")}
                            />
                        </div>

                        <div className="form-group">
                            <label>Giới tính</label>
                            <div className="gender-group">
                                {[
                                    { value: "male", label: "Nam" },
                                    { value: "female", label: "Nữ" },
                                    { value: "other", label: "Khác" },
                                ].map((g) => (
                                    <button
                                        key={g.value}
                                        type="button"
                                        className={`gender-btn ${form.gender === g.value ? "gender-btn--active" : ""}`}
                                        onClick={() => setForm({ ...form, gender: g.value })}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-divider" />

                        <button type="submit" className="btn-save">
                            Lưu
                        </button>
                    </form>
                </main>
            </div>
        </div>
        </>
    );
}