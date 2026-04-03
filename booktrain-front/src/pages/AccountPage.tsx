import { useAuth } from "@/context/AuthContext";

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <div style={{ padding: "40px 24px", fontFamily: "'Google Sans Flex', system-ui, sans-serif", minHeight: "80vh" }}>
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "32px" }}>Thông tin tài khoản</h2>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", maxWidth: "480px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#2F6FED", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 700 }}>
            {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>{user?.fullName || "Chưa có tên"}</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "4px" }}>Họ và tên</div>
            <div style={{ fontSize: "15px", color: "#111827", fontWeight: 500 }}>{user?.fullName || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "4px" }}>Email</div>
            <div style={{ fontSize: "15px", color: "#111827", fontWeight: 500 }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "4px" }}>Số điện thoại</div>
            <div style={{ fontSize: "15px", color: "#111827", fontWeight: 500 }}>{user?.phone || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
