import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    // Đang lấy thông tin user → chờ, chưa làm gì cả
    if (isLoading) {
        return (
            <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "100vh",
                fontSize: "16px",
                color: "#6b7280"
            }}>
                Đang tải...
            </div>
        );
    }

    // Chưa đăng nhập → về trang login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Đã đăng nhập nhưng không phải admin → về trang chủ
    if (user.accountType !== "admin") {
        return <Navigate to="/" replace />;
    }

    // Là admin → render nội dung bên trong
    return <>{children}</>;
}  