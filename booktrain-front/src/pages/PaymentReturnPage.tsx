import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./payment.css";

interface ReturnResult {
    success: boolean;
    orderCode?: string;
    amount?: number;
    transactionNo?: string;
    code?: string;
}

export default function PaymentReturnPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [result, setResult] = useState<ReturnResult | null>(null);

    useEffect(() => {
        const success      = searchParams.get("success") === "true";
        const orderCode    = searchParams.get("orderCode")    ?? undefined;
        const transactionNo= searchParams.get("transactionNo") ?? undefined;
        const code         = searchParams.get("code")         ?? undefined;
        const rawAmount    = searchParams.get("amount");
        const amount       = rawAmount ? Number(rawAmount) : undefined;

        if (success) sessionStorage.removeItem("bookingData");

        setResult({ success, orderCode, amount, transactionNo, code });
    }, []);

    if (!result) return null;

    return (
        <>
            <div className="pay-header">
                <div className="pay-header-inner">
                    <div className="pay-logo">DatVeXe</div>
                </div>
            </div>

            <div className="pay-page">
                <div className="pay-body" style={{ justifyContent: "center" }}>
                    <div className="pay-left" style={{ maxWidth: 560 }}>

                        {result.success ? (
                            <>
                                <div className="pay-trip-card" style={{ textAlign: "center", padding: "36px 24px" }}>
                                    <div style={{ fontSize: 60, marginBottom: 12 }}>✅</div>
                                    <div className="pay-trip-badge" style={{ background: "#dcfce7", color: "#16a34a", marginBottom: 16 }}>
                                        THANH TOÁN THÀNH CÔNG
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginBottom: 4 }}>
                                        Đặt vé thành công!
                                    </h2>
                                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                                        Vé của bạn đã được xác nhận.
                                    </p>
                                </div>

                                <div className="pay-summary-card">
                                    <div className="pay-summary-header"><h3>Thông tin giao dịch</h3></div>

                                    <div className="pay-summary-item">
                                        <span>Mã đơn hàng</span>
                                        <strong style={{ color: "#2F6FED" }}>{result.orderCode}</strong>
                                    </div>
                                    <div className="pay-summary-item">
                                        <span>Số tiền thanh toán</span>
                                        <span className="pay-summary-price">
                                            {result.amount?.toLocaleString("vi-VN")}đ
                                        </span>
                                    </div>
                                    <div className="pay-summary-item">
                                        <span>Mã giao dịch VNPay</span>
                                        <span style={{ fontSize: 13, color: "#6b7280" }}>{result.transactionNo}</span>
                                    </div>
                                    <div className="pay-summary-item">
                                        <span>Phương thức</span>
                                        <span>VNPay</span>
                                    </div>
                                    <div className="pay-summary-total">
                                        <span>Trạng thái</span>
                                        <span className="pay-summary-total-price" style={{ color: "#16a34a" }}>
                                            ✓ Đã thanh toán
                                        </span>
                                    </div>
                                </div>

                                <div className="pay-confirm-actions" style={{ marginTop: 0 }}>
                                    <button className="pay-confirm-btn pay-confirm-btn--back" onClick={() => navigate("/")}>
                                        Về trang chủ
                                    </button>
                                    <button className="pay-confirm-btn pay-confirm-btn--ok" onClick={() => navigate("/my-orders")}>
                                        Xem đơn hàng của tôi
                                    </button>
                                </div>

                                <p className="pay-policy">Cảm ơn bạn đã sử dụng dịch vụ của <strong>DatVeXe</strong> 🎉</p>
                            </>
                        ) : (
                            <>
                                <div className="pay-trip-card" style={{ textAlign: "center", padding: "36px 24px" }}>
                                    <div style={{ fontSize: 60, marginBottom: 12 }}>❌</div>
                                    <div className="pay-trip-badge" style={{ background: "#fee2e2", color: "#dc2626", marginBottom: 16 }}>
                                        THANH TOÁN THẤT BẠI
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>
                                        Giao dịch không thành công
                                    </h2>
                                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                                        {result.code === "99" ? "Lỗi không xác định từ cổng thanh toán."
                                         : result.code === "24" ? "Giao dịch bị hủy bởi người dùng."
                                         : result.code === "11" ? "Hết thời gian chờ thanh toán."
                                         : `Mã lỗi: ${result.code ?? "Không xác định"}`}
                                    </p>
                                </div>

                                <div className="pay-methods-card">
                                    <p style={{ color: "#374151", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                                        💡 <strong>Một số lý do thường gặp:</strong><br />
                                        • Thẻ không đủ số dư<br />
                                        • Giao dịch bị huỷ bởi người dùng<br />
                                        • Hết thời gian thanh toán (15 phút)<br />
                                        • Thông tin thẻ không chính xác
                                    </p>
                                </div>

                                <div className="pay-confirm-actions" style={{ marginTop: 0 }}>
                                    <button className="pay-confirm-btn pay-confirm-btn--back" onClick={() => navigate("/")}>
                                        Về trang chủ
                                    </button>
                                    <button className="pay-confirm-btn pay-confirm-btn--ok" onClick={() => navigate(-1)}>
                                        Thử lại
                                    </button>
                                </div>

                                <p className="pay-policy">
                                    Cần hỗ trợ? Liên hệ <a href="#">hotline 1900 6067</a>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
