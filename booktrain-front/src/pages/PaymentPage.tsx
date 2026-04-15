import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tripApi } from "../api/trip";
import type { TripResult } from "../types/trip";
import "./payment.css";

interface PassengerForm {
    seatId: number;
    seatNumber: string;
    carriageType: string;
    carriageNumber: number;
    ticketPrice: number;
    passengerName: string;
    idNumber: string;
    phoneNumber: string;
    dateOfBirth: string;
}

interface BookingData {
    tripId: number;
    passengers: PassengerForm[];
    contact: { name: string; phone: string; email: string };
    totalPrice: number;
    confirmedAt: number;
}

const PAYMENT_METHODS = [
    {
        id: "credit_card",
        label: "Thẻ tín dụng/Thẻ ghi nợ",
        desc: "Visa, MasterCard, JCB",
        icon: "/images/payment/credit-card.png",
    },
    {
        id: "bank_transfer",
        label: "Thẻ ATM nội địa/Internet Banking",
        desc: "Tài khoản phải có đăng ký Internet banking",
        icon: "/images/payment/atm.png",
    },
    {
        id: "zalopay",
        label: "Ví ZaloPay",
        desc: "Điện thoại của bạn phải được cài đặt ứng dụng ZaloPay",
        icon: "/images/payment/zalopay.png",
    },
    {
        id: "momo",
        label: "Ví MoMo",
        desc: "Điện thoại của bạn phải được cài đặt ứng dụng MoMo",
        icon: "/images/payment/momo.png",
    },
    {
        id: "shopee_pay",
        label: "Ví ShopeePay",
        desc: "Thanh toán dễ dàng chỉ với 3 click với ứng dụng ShopeePay",
        icon: "/images/payment/shopeepay.png",
    },
    {
        id: "vexere_wallet",
        label: "Ví VNPAY-QR",
        desc: "Đảm bảo rằng bạn đã cài đặt ứng dụng VNPAY-QR",
        icon: "/images/payment/vnpay.png",
    },
];

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat: "Ngồi cứng",
    soft_seat: "Ngồi mềm",
    hard_sleeper: "Giường khoang 6",
    soft_sleeper: "Giường khoang 4",
    vip_ac_sleeper: "Giường VIP",
};

const TOTAL_SECONDS = 15 * 60;

export default function PaymentPage() {
    const navigate = useNavigate();
    const [bookingData, setBookingData] = useState<BookingData | null>(null);
    const [tripInfo, setTripInfo] = useState<TripResult | null>(null);
    const [selectedMethod, setSelectedMethod] = useState("");
    const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const raw = sessionStorage.getItem("bookingData");
        if (!raw) { navigate("/"); return; }

        const parsed: BookingData = JSON.parse(raw);
        setBookingData(parsed);

        tripApi.getById(parsed.tripId).then((res: { data: TripResult }) => {
            setTripInfo(res.data);
        });

        const elapsed = Math.floor((Date.now() - parsed.confirmedAt) / 1000);
        const remaining = TOTAL_SECONDS - elapsed;
        setTimeLeft(remaining > 0 ? remaining : 0);
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            sessionStorage.removeItem("bookingData");
            navigate("/trains/search");
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    }

    function handlePayment() {
        if (!selectedMethod) {
            setError("Vui lòng chọn phương thức thanh toán!");
            return;
        }
        setError("");
        setShowConfirm(true);
    }

    function handlePaymentSuccess() {
        sessionStorage.removeItem("bookingData");
        navigate("/trains/order-success");
    }

    if (!bookingData) return null;

    const serviceFee = 15000;
    const totalWithFee = bookingData.totalPrice + serviceFee;
    const isUrgent = timeLeft <= 60;

    return (
        <>
            {/* Header với countdown */}
            <div className="pay-header">
                <div className="pay-header-inner">
                    <div className="pay-logo">DatVeXe</div>
                    <div className="pay-countdown">
                        <span>Thời gian thanh toán còn lại</span>
                        <span className={`pay-timer ${isUrgent ? "pay-timer--urgent" : ""}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pay-page">
                <div className="pay-body">

                    {/* Cột trái */}
                    <div className="pay-left">

                        {/* Thông tin chuyến — giống PassengerInfoPage */}
                        <div className="pay-trip-card">
                            <div className="pay-trip-badge">MỘT CHIỀU</div>

                            {tripInfo && (
                            
                            <div className="pay-trip-route" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                <span className="pay-trip-station">{tripInfo.originName}</span>

                                <div className="pay-trip-middle" style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center" }}>
                                    <span className="pay-trip-time">{tripInfo.departureTime}</span>
                                    <div className="pay-trip-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 12px" }}>
                                        <span className="pay-trip-duration">{tripInfo.duration}</span>
                                        {tripInfo.nextDay && (
                                            <span className="pay-next-day">+1 ngày</span>
                                        )}
                                    </div>
                                    <span className="pay-trip-time">{tripInfo.arrivalTime}</span>
                                </div>

                                <span className="pay-trip-station">{tripInfo.destinationName}</span>
                            </div>                            )}

                            {tripInfo && (
                                <div className="pay-trip-train">
                                    🚂 {tripInfo.trainCode} • {tripInfo.trainName}
                                </div>
                            )}

                            <div className="pay-trip-meta">
                                <span>👥 {bookingData.passengers.length} Người lớn</span>
                                <span>
                                    🎫 {bookingData.passengers.map(p => `Ghế ${p.seatNumber}`).join(", ")}
                                </span>
                            </div>
                        </div>

                        {/* Phương thức thanh toán */}
                        <div className="pay-methods-card">
                            <h3 className="pay-section-title">Phương thức thanh toán</h3>

                            {error && <div className="pay-error">{error}</div>}

                            <div className="pay-methods-list">
                                {PAYMENT_METHODS.map(method => (
                                    <label
                                        key={method.id}
                                        className={`pay-method-item ${selectedMethod === method.id ? "pay-method-item--selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value={method.id}
                                            checked={selectedMethod === method.id}
                                            onChange={() => {
                                                setSelectedMethod(method.id);
                                                setError("");
                                            }}
                                        />
                                        <div className="pay-method-icon">
                                            <img
                                                src={method.icon}
                                                alt={method.label}
                                                onError={e => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        </div>
                                        <div className="pay-method-info">
                                            <span className="pay-method-label">{method.label}</span>
                                            <span className="pay-method-desc">{method.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Nút thanh toán */}
                        <button className="pay-submit-btn" onClick={handlePayment}>
                            🔒 Thanh toán bảo mật
                        </button>
                        <p className="pay-policy">
                            Bằng việc thanh toán, bạn đồng ý với{" "}
                            <a href="#">Chính sách bảo mật thanh toán</a> của DatVeXe
                        </p>
                    </div>

                    {/* Cột phải */}
                    <div className="pay-right">

                        {/* Chi tiết giá */}
                        <div className="pay-summary-card">
                            <div className="pay-summary-header">
                                <h3>Chi Tiết Giá</h3>
                            </div>

                            {bookingData.passengers.map((p, i) => (
                                <div key={i} className="pay-summary-item">
                                    <div className="pay-summary-item-label">
                                        <span>Người lớn {i + 1}</span>
                                        <span className="pay-summary-seat">
                                            Toa {p.carriageNumber} - Ghế {p.seatNumber}&nbsp;
                                            ({CARRIAGE_LABEL[p.carriageType]})
                                        </span>
                                    </div>
                                    <span className="pay-summary-price">
                                        {p.ticketPrice.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                            ))}

                            <div className="pay-summary-item">
                                <span>Phí dịch vụ</span>
                                <span className="pay-summary-price">
                                    {serviceFee.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                            <p className="pay-summary-note">
                                *Phí này sẽ không áp dụng hoàn trả
                            </p>

                            <div className="pay-summary-total">
                                <span>Tổng cộng cho {bookingData.passengers.length} người:</span>
                                <span className="pay-summary-total-price">
                                    {totalWithFee.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        </div>

                        {/* Mã giảm giá */}
                        <div className="pay-voucher-card">
                            <div className="pay-voucher-header">
                                <span>Mã giảm giá</span>
                                <button className="pay-voucher-link">Chọn hoặc nhập mã</button>
                            </div>
                            <div className="pay-voucher-placeholder">
                                🎫 Chức năng mã giảm giá sẽ sớm ra mắt!
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popup xác nhận thanh toán */}
            {showConfirm && (
                <div className="pay-confirm-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="pay-confirm-box" onClick={e => e.stopPropagation()}>
                        <div className="pay-confirm-icon">💳</div>
                        <h3>Xác nhận thanh toán</h3>
                        <p>
                            Bạn đã hoàn tất thanh toán qua&nbsp;
                            <strong>
                                {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}
                            </strong>?
                        </p>
                        <div className="pay-confirm-amount">
                            {totalWithFee.toLocaleString("vi-VN")}đ
                        </div>
                        <div className="pay-confirm-actions">
                            <button
                                className="pay-confirm-btn pay-confirm-btn--back"
                                onClick={() => setShowConfirm(false)}
                            >
                                Quay lại
                            </button>
                            <button
                                className="pay-confirm-btn pay-confirm-btn--ok"
                                onClick={handlePaymentSuccess}
                            >
                                Thanh toán thành công
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}