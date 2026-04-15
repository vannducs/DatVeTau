import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { tripApi } from "../api/trip";
import { useAuth } from "@/hooks/useAuth";
import type { TripResult } from "../types/trip";
import type { SeatDTO } from "../types/seat";
import "./passengerInfo.css";

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

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat: "Ngồi cứng",
    soft_seat: "Ngồi mềm",
    hard_sleeper: "Giường khoang 6",
    soft_sleeper: "Giường khoang 4",
    vip_ac_sleeper: "Giường VIP",
};

export default function PassengerInfoPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const tripId = Number(searchParams.get("tripId"));
    const seatIds = searchParams.get("seatIds")?.split(",").map(Number) || [];

    const [trip, setTrip] = useState<TripResult | null>(null);
    const [forms, setForms] = useState<PassengerForm[]>([]);
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showConfirm, setShowConfirm] = useState(false);

    // Tự điền thông tin liên hệ từ user đang đăng nhập
    useEffect(() => {
        if (user) {
            setContactName(user.fullName?.toUpperCase() || "");
            setContactPhone(user.phoneNumber || "");
            setContactEmail(user.email || "");
            
        }
    }, [user]);

    // Load thông tin chuyến + ghế
    useEffect(() => {
        if (!tripId || seatIds.length === 0) return;

        Promise.all([
            tripApi.getById(tripId),
            tripApi.getSeats(tripId),
        ]).then(([tripRes, seatsRes]) => {
            setTrip(tripRes.data);

            const allSeats: SeatDTO[] = Object.values(seatsRes.data).flat() as SeatDTO[];
            const chosen = allSeats.filter(s => seatIds.includes(s.id));

            setForms(chosen.map((s, index) => ({
                seatId: s.id,
                seatNumber: s.seatNumber,
                carriageType: s.carriageType,
                carriageNumber: s.carriageNumber,
                ticketPrice: s.ticketPrice,
                // Hành khách đầu tiên tự điền từ user đang đăng nhập
                passengerName: index === 0 ? (user?.fullName?.toUpperCase() || "") : "",
                idNumber: "",
                phoneNumber: index === 0 ? (user?.phoneNumber || "") : "",
                dateOfBirth: index === 0 ? (user?.dateOfBirth || "") : "",
            })));
        }).finally(() => setLoading(false));
    }, [tripId, user]);

    function updateForm(index: number, field: keyof PassengerForm, value: string) {
        setForms(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
    }

    const totalPrice = forms.reduce((sum, f) => sum + f.ticketPrice, 0);

    function validate() {
        const errs: Record<string, string> = {};
        forms.forEach((f, i) => {
            if (!f.passengerName.trim()) errs[`name_${i}`] = "Vui lòng nhập họ tên";
            if (!f.idNumber.trim()) errs[`id_${i}`] = "Vui lòng nhập CMND/CCCD";
        });
        if (!contactName.trim()) errs["contact_name"] = "Vui lòng nhập họ tên liên hệ";
        if (!contactPhone.trim()) errs["contact_phone"] = "Vui lòng nhập số điện thoại";
        if (!contactEmail.trim()) errs["contact_email"] = "Vui lòng nhập email";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleValidate() {
        if (!validate()) return;
        setShowConfirm(true);
    }

    function handleConfirm() {
        setSubmitting(true);
        const now = Date.now();
        const bookingData = {
            tripId,
            passengers: forms,
            contact: { name: contactName, phone: contactPhone, email: contactEmail },
            totalPrice,
            confirmedAt: now,
        };
        sessionStorage.setItem("bookingData", JSON.stringify(bookingData));
        navigate("/trains/payment");
        setSubmitting(false);
    }

    if (loading) return (
        <>
            <Header />
            <div className="pi-loading">🔍 Đang tải thông tin...</div>
        </>
    );

    return (
        <>
            <Header />

            {/* Breadcrumb steps */}
            <div className="pi-steps">
                <div className="pi-steps-inner">
                    <span className="pi-step pi-step--done">✓ Chọn ghế</span>
                    <span className="pi-step-arrow">──────</span>
                    <span className="pi-step pi-step--active">2 Nhập thông tin</span>
                    <span className="pi-step-arrow">──────</span>
                    <span className="pi-step">3 Thanh toán</span>
                </div>
            </div>

            <div className="pi-page">
                <div className="pi-body">

                    {/* Cột trái */}
                    <div className="pi-left">

                        {/* Thông tin chuyến */}
                        {trip && (
                            <div className="pi-trip-info">
                                <div className="pi-trip-badge">MỘT CHIỀU</div>
                                <div className="pi-trip-route">
                                    <span className="pi-trip-station">{trip.originName}</span>
                                    <div className="pi-trip-time-wrap">
                                        <span className="pi-trip-time">{trip.departureTime}</span>
                                        <span className="pi-trip-duration">{trip.duration}</span>
                                        <span className="pi-trip-time">{trip.arrivalTime}</span>
                                    </div>
                                    <span className="pi-trip-station">{trip.destinationName}</span>
                                </div>
                                <div className="pi-trip-train">
                                    🚂 {trip.trainCode} • {trip.trainName}
                                </div>
                            </div>
                        )}

                        {/* Form thông tin từng hành khách */}
                        <div className="pi-section">
                            <h3 className="pi-section-title">Thông tin hành khách</h3>

                            {forms.map((form, index) => (
                                <div key={form.seatId} className="pi-passenger-card">
                                    <div className="pi-passenger-header">
                                        <span className="pi-passenger-label">
                                            Người lớn {index + 1}
                                        </span>
                                        <span className="pi-passenger-seat">
                                            Toa {form.carriageNumber} • Ghế {form.seatNumber}&nbsp;
                                            ({CARRIAGE_LABEL[form.carriageType]})
                                        </span>
                                    </div>

                                    <div className="pi-form-grid">
                                        <div className="pi-form-group pi-form-group--full">
                                            <label>
                                                Họ và tên <span className="pi-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="VD: NGUYEN VAN A"
                                                value={form.passengerName}
                                                onChange={e => updateForm(index, "passengerName", e.target.value.toUpperCase())}
                                                className={errors[`name_${index}`] ? "pi-input-error" : ""}
                                            />
                                            {errors[`name_${index}`] && (
                                                <span className="pi-error-msg">
                                                    {errors[`name_${index}`]}
                                                </span>
                                            )}
                                        </div>

                                        <div className="pi-form-group">
                                            <label>
                                                Số CMND/CCCD/Hộ chiếu <span className="pi-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nhập số CMND/CCCD"
                                                value={form.idNumber}
                                                onChange={e => updateForm(index, "idNumber", e.target.value)}
                                                className={errors[`id_${index}`] ? "pi-input-error" : ""}
                                            />
                                            {errors[`id_${index}`] && (
                                                <span className="pi-error-msg">
                                                    {errors[`id_${index}`]}
                                                </span>
                                            )}
                                        </div>

                                        <div className="pi-form-group">
                                            <label>Ngày sinh</label>
                                            <input
                                                type="date"
                                                value={form.dateOfBirth}
                                                onChange={e => updateForm(index, "dateOfBirth", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Thông tin liên hệ */}
                        <div className="pi-section">
                            <h3 className="pi-section-title">Thông tin liên hệ</h3>
                            <p className="pi-section-hint">
                                Hệ thống sẽ xác nhận đặt chỗ, hoàn tiền hoặc đổi lịch qua thông tin này
                            </p>

                           

                            <div className="pi-form-grid">
                                <div className="pi-form-group pi-form-group--full">
                                    <label>
                                        Họ và tên <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="VD: NGUYEN VAN A"
                                        value={contactName}
                                        onChange={e => setContactName(e.target.value.toUpperCase())}
                                        className={errors["contact_name"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_name"] && (
                                        <span className="pi-error-msg">{errors["contact_name"]}</span>
                                    )}
                                </div>

                                <div className="pi-form-group">
                                    <label>
                                        Số điện thoại <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="VD: 0912345678"
                                        value={contactPhone}
                                        onChange={e => setContactPhone(e.target.value)}
                                        className={errors["contact_phone"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_phone"] && (
                                        <span className="pi-error-msg">{errors["contact_phone"]}</span>
                                    )}
                                </div>

                                <div className="pi-form-group">
                                    <label>
                                        Email <span className="pi-required">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="VD: example@gmail.com"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        className={errors["contact_email"] ? "pi-input-error" : ""}
                                    />
                                    {errors["contact_email"] && (
                                        <span className="pi-error-msg">{errors["contact_email"]}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Nút tiếp tục */}
                        <button
                            className="pi-submit-btn"
                            onClick={handleValidate}
                            disabled={submitting}
                        >
                            {submitting ? "Đang xử lý..." : "Tiếp tục"}
                        </button>
                    </div>

                    {/* Cột phải - Tóm tắt */}
                    <div className="pi-right">
                        <div className="pi-summary-card">
                            <h3 className="pi-summary-title">Chi tiết giá</h3>

                            {forms.map((form, index) => (
                                <div key={form.seatId} className="pi-summary-item">
                                    <div className="pi-summary-item-label">
                                        Người lớn {index + 1}
                                        <span className="pi-summary-seat">
                                            Toa {form.carriageNumber} • Ghế {form.seatNumber}
                                        </span>
                                    </div>
                                    <span className="pi-summary-price">
                                        {form.ticketPrice.toLocaleString("vi-VN")}đ
                                    </span>
                                </div>
                            ))}

                            <div className="pi-summary-divider" />

                            <div className="pi-summary-total">
                                <span>Tổng cộng cho {forms.length} người:</span>
                                <span className="pi-summary-total-price">
                                    {totalPrice.toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popup xác nhận */}
            {showConfirm && (
                <div className="pi-confirm-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="pi-confirm-box" onClick={e => e.stopPropagation()}>
                        <h3>Xác nhận thông tin</h3>
                        <p>Bạn có chắc chắn thông tin hành khách đã chính xác?</p>

                        <div className="pi-confirm-summary">
                            {forms.map((f, i) => (
                                <div key={i} className="pi-confirm-row">
                                    <span>Hành khách {i + 1}:</span>
                                    <span>{f.passengerName || "Chưa nhập"}</span>
                                </div>
                            ))}
                            <div className="pi-confirm-row pi-confirm-row--total">
                                <span>Tổng tiền:</span>
                                <span>{totalPrice.toLocaleString("vi-VN")}đ</span>
                            </div>
                        </div>

                        <div className="pi-confirm-actions">
                            <button
                                className="pi-confirm-btn pi-confirm-btn--back"
                                onClick={() => setShowConfirm(false)}
                            >
                                Quay lại
                            </button>
                            <button
                                className="pi-confirm-btn pi-confirm-btn--ok"
                                onClick={handleConfirm}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}