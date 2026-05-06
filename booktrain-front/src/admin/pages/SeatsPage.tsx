import { useEffect, useState } from "react";
import { seatAdminApi } from "../api/adminApi";

interface Stats { available: number; booked: number; pending: number; unavailable: number; total: number; }

interface Seat {
    id: number;
    seat_number: string;
    berth_position: string;
    ticket_price: number;
    status: string;
    carriage_number: number;
    carriage_type: string;
}

const STATUS_BADGE: Record<string, string> = {
    available: "badge-available", booked: "badge-booked",
    pending: "badge-pending", unavailable: "badge-locked",
};

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat: "Ngồi cứng", soft_seat: "Ngồi mềm",
    hard_sleeper: "Giường 6", soft_sleeper: "Giường 4", vip_ac_sleeper: "Giường VIP",
};

export default function SeatsPage() {
    const [stats,   setStats]   = useState<Stats | null>(null);
    const [tripId,  setTripId]  = useState("");
    const [seats,   setSeats]   = useState<Seat[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg,     setMsg]     = useState("");

    useEffect(() => {
        seatAdminApi.stats().then(r => setStats(r.data));
    }, []);

    async function searchSeats() {
        if (!tripId.trim()) return;
        setLoading(true);
        try {
            const res = await seatAdminApi.byTrip(Number(tripId));
            setSeats(res.data);
        } finally { setLoading(false); }
    }

    async function updateStatus(seatId: number, status: string) {
        await seatAdminApi.updateStatus(seatId, status);
        setMsg(`Đã cập nhật ghế #${seatId} → ${status}`);
        setSeats(prev => prev.map(s => s.id === seatId ? { ...s, status } : s));
        seatAdminApi.stats().then(r => setStats(r.data));
    }

    const grouped = seats.reduce<Record<number, Seat[]>>((acc, s) => {
        (acc[s.carriage_number] ??= []).push(s);
        return acc;
    }, {});

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý ghế ngồi</div>
                    <div className="admin-page-subtitle">Tìm ghế theo ID chuyến tàu</div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: "#DCFCE7" }}>💺</div>
                        <div>
                            <div className="admin-stat-label">Còn trống</div>
                            <div className="admin-stat-value" style={{ color: "#16A34A" }}>{stats.available}</div>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: "#FEE2E2" }}>🔴</div>
                        <div>
                            <div className="admin-stat-label">Đã đặt</div>
                            <div className="admin-stat-value" style={{ color: "#DC2626" }}>{stats.booked}</div>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: "#FEF3C7" }}>⏳</div>
                        <div>
                            <div className="admin-stat-label">Đang giữ</div>
                            <div className="admin-stat-value" style={{ color: "#D97706" }}>{stats.pending}</div>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-icon" style={{ background: "#F3F4F6" }}>🚫</div>
                        <div>
                            <div className="admin-stat-label">Không dùng</div>
                            <div className="admin-stat-value" style={{ color: "#6B7280" }}>{stats.unavailable}</div>
                        </div>
                    </div>
                </div>
            )}

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            {/* Search by trip */}
            <div className="admin-card">
                <div className="admin-card-title">Xem ghế theo chuyến tàu</div>
                <div className="admin-toolbar">
                    <input
                        className="admin-search"
                        type="number"
                        placeholder="Nhập Trip ID (ví dụ: 1)"
                        value={tripId}
                        onChange={e => setTripId(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && searchSeats()}
                    />
                    <button className="admin-btn admin-btn-primary" onClick={searchSeats}>
                        🔍 Xem ghế
                    </button>
                </div>

                {loading && <div className="admin-loading">Đang tải...</div>}

                {!loading && seats.length > 0 && (
                    Object.entries(grouped).map(([cn, carriageSeats]) => (
                        <div key={cn} style={{ marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 10,
                                padding: "6px 12px", background: "#F9FAFB", borderRadius: 6 }}>
                                Toa {cn} — {CARRIAGE_LABEL[carriageSeats[0]?.carriage_type] ?? carriageSeats[0]?.carriage_type}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {carriageSeats.map(seat => (
                                    <div key={seat.id}
                                        style={{
                                            padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
                                            background: seat.status === "available" ? "#DCFCE7" :
                                                        seat.status === "booked"    ? "#FEE2E2" :
                                                        seat.status === "pending"   ? "#FEF3C7" : "#F3F4F6",
                                            minWidth: 120,
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>Ghế {seat.seat_number}</div>
                                        {seat.berth_position && <div style={{ fontSize: 11, color: "#6B7280" }}>{seat.berth_position}</div>}
                                        <div style={{ fontSize: 12, margin: "4px 0" }}>
                                            <span className={`admin-badge ${STATUS_BADGE[seat.status] ?? ""}`} style={{ fontSize: 10 }}>
                                                {seat.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 6 }}>
                                            {Number(seat.ticket_price).toLocaleString("vi-VN")}đ
                                        </div>
                                        <select
                                            style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid #D1D5DB", width: "100%" }}
                                            value={seat.status}
                                            onChange={e => updateStatus(seat.id, e.target.value)}
                                        >
                                            <option value="available">available</option>
                                            <option value="booked">booked</option>
                                            <option value="pending">pending</option>
                                            <option value="unavailable">unavailable</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {!loading && seats.length === 0 && tripId && (
                    <div className="admin-empty">Không tìm thấy ghế cho chuyến này.</div>
                )}
            </div>
        </div>
    );
}
