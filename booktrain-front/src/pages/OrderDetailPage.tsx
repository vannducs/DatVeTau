import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/common/Header";
import "./myorders.css";

interface Passenger {
  passengerName: string;
  carriageNumber: number;
  seatNumber: string;
  carriageType: string;
  ticketPrice: number;
  idNumber: string;
}

interface Order {
  orderCode: string;
  status: string;
  tripStatus: string;
  totalAmount: number;
  serviceFee: number;
  createdAt: string;
  trainCode: string;
  trainName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  paymentMethod: string;
  transactionCode: string;
  paidAt: string | null;
  passengers: Passenger[];
}

const CARRIAGE_LABEL: Record<string, string> = {
  HARD_SEAT: "Ghế cứng",
  SOFT_SEAT: "Ghế mềm",
  HARD_SLEEPER: "Nằm cứng",
  SOFT_SLEEPER: "Nằm mềm",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  VNPAY: "VNPay",
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};

function parseVNDate(s: string): Date {
  const [time, date] = s.split(" ");
  const [hh, mm] = time.split(":");
  const [dd, mo, yyyy] = date.split("/");
  return new Date(+yyyy, +mo - 1, +dd, +hh, +mm);
}

function getBadge(order: Order) {
  if (order.status === "cancelled") {
    return { cls: "mo-badge--cancelled", icon: "cancel", label: "Đã hủy" };
  }
  if (order.status === "pending") {
    return { cls: "mo-badge--pending", icon: "schedule", label: "Chờ thanh toán" };
  }
  try {
    if (parseVNDate(order.departureTime) > new Date()) {
      return { cls: "mo-badge--upcoming", icon: "check_circle", label: "Sắp khởi hành" };
    }
  } catch { /* fall through */ }
  return { cls: "mo-badge--completed", icon: "done_all", label: "Đã hoàn thành" };
}

function formatCurrency(n: number) {
  return n.toLocaleString("vi-VN") + " đ";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mo-detail-section-title">{children}</div>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mo-detail-row">
      <span className="mo-detail-label">{label}</span>
      <span className="mo-detail-value">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch(`/api/orders/my-orders/${orderCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem("token"); navigate("/login"); return null; }
        if (r.status === 404) { setError("Không tìm thấy đơn hàng"); return null; }
        if (!r.ok) throw new Error("Lỗi tải chi tiết đơn hàng");
        return r.json();
      })
      .then(data => { if (data) setOrder(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [orderCode, navigate]);

  if (loading) {
    return (
      <div className="mo-detail-page">
        <Header />
        <div className="mo-detail-container">
          {[1, 2, 3].map(i => (
            <div key={i} className="mo-skeleton">
              <div className="mo-skel-line" style={{ width: "50%", marginBottom: 12 }} />
              <div className="mo-skel-line" style={{ width: "80%" }} />
              <div className="mo-skel-line" style={{ width: "65%" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mo-detail-page">
        <Header />
        <div className="mo-detail-container">
          <div className="mo-empty">
            <div className="mo-empty-icon">
              <span className="material-icons-round">error_outline</span>
            </div>
            <div className="mo-empty-title">{error || "Không tìm thấy đơn hàng"}</div>
            <div className="mo-empty-sub">Vui lòng kiểm tra lại mã đơn hàng</div>
            <button className="mo-empty-btn" onClick={() => navigate("/my-orders")}>
              <span className="material-icons-round">arrow_back</span>
              Về danh sách đơn
            </button>
          </div>
        </div>
      </div>
    );
  }

  const badge = getBadge(order);
  const depParts = order.departureTime.split(" ");
  const arrParts = order.arrivalTime.split(" ");

  return (
    <div className="mo-detail-page">
      <Header />

      <div className="mo-detail-container">
        {/* Actions */}
        <div className="mo-detail-actions">
          <button
            className="mo-action-btn mo-action-btn--back"
            onClick={() => navigate("/my-orders")}
          >
            <span className="material-icons-round">arrow_back</span>
            Đơn hàng của tôi
          </button>
          <button
            className="mo-action-btn mo-action-btn--primary"
            onClick={() => window.print()}
          >
            <span className="material-icons-round">print</span>
            In vé
          </button>
        </div>

        {/* Order status */}
        <div className="mo-detail-section" style={{ marginTop: 16 }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Mã đơn hàng</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: 1 }}>
                {order.orderCode}
              </div>
            </div>
            <span className={`mo-badge ${badge.cls}`} style={{ fontSize: 13, padding: "6px 14px" }}>
              <span className="material-icons-round">{badge.icon}</span>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Trip info */}
        <div className="mo-detail-section">
          <SectionTitle>Thông tin chuyến đi</SectionTitle>
          <Row label="Tàu" value={`${order.trainCode} — ${order.trainName}`} />
          <Row label="Ga đi" value={order.originName} />
          <Row label="Ga đến" value={order.destinationName} />
          <Row
            label="Khởi hành"
            value={<><span style={{ fontWeight: 700, color: "#2F6FED" }}>{depParts[0]}</span> ngày {depParts[1]}</>}
          />
          <Row
            label="Đến nơi"
            value={<><span style={{ fontWeight: 700, color: "#2F6FED" }}>{arrParts[0]}</span> ngày {arrParts[1]}</>}
          />
        </div>

        {/* Passengers */}
        <div className="mo-detail-section">
          <SectionTitle>Hành khách ({order.passengers.length} người)</SectionTitle>
          {order.passengers.map((p, i) => (
            <div key={i} className="mo-passenger-card">
              <div className="mo-passenger-name">{p.passengerName}</div>
              <div className="mo-passenger-info">
                <span>CMND/CCCD: {p.idNumber}</span>
                <span>
                  {CARRIAGE_LABEL[p.carriageType] ?? p.carriageType} số {p.carriageNumber} — Ghế {p.seatNumber}
                </span>
              </div>
              <div className="mo-passenger-price">{formatCurrency(p.ticketPrice)}</div>
            </div>
          ))}
          <div className="mo-detail-total">
            <span className="mo-detail-total-label">
              Tổng tiền vé ({order.passengers.length} vé)
            </span>
            <span className="mo-detail-total-price">
              {formatCurrency(order.totalAmount - order.serviceFee)}
            </span>
          </div>
        </div>

        {/* Payment info */}
        <div className="mo-detail-section">
          <SectionTitle>Thông tin thanh toán</SectionTitle>
          <Row label="Tiền vé" value={formatCurrency(order.totalAmount - order.serviceFee)} />
          {order.serviceFee > 0 && (
            <Row label="Phí dịch vụ" value={formatCurrency(order.serviceFee)} />
          )}
          <Row
            label="Tổng thanh toán"
            value={
              <span style={{ fontSize: 17, fontWeight: 800, color: "#dc2626" }}>
                {formatCurrency(order.totalAmount)}
              </span>
            }
          />
          <Row
            label="Phương thức"
            value={PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod ?? "—"}
          />
          {order.transactionCode && (
            <Row label="Mã giao dịch" value={order.transactionCode} />
          )}
          {order.paidAt && (
            <Row label="Thời gian thanh toán" value={order.paidAt} />
          )}
          <Row label="Ngày đặt vé" value={order.createdAt} />
        </div>
      </div>
    </div>
  );
}
