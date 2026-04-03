export default function MyOrdersPage() {
  return (
    <div style={{ padding: "40px 24px", fontFamily: "'Google Sans Flex', system-ui, sans-serif", minHeight: "80vh" }}>
      <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "32px" }}>Đơn hàng của tôi</h2>
      <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280", fontSize: "16px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎫</div>
        <div>Chưa có đơn hàng nào</div>
        <div style={{ fontSize: "14px", marginTop: "8px" }}>Hãy đặt vé để xem đơn hàng tại đây</div>
      </div>
    </div>
  );
}
