import { useEffect, useState, useCallback } from "react";
import { tripAdminApi, trainAdminApi } from "../api/adminApi";
import axios from "axios";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripItem {
    id: number;
    train_id: number;
    train_code: string;
    train_name: string;
    origin_name: string;
    destination_name: string;
    departure_date: string;
    departure_time: string;
    arrival_time: string;
    status: string;
    confirmed_bookings: number;
}

interface TrainOption {
    id: number;
    train_code: string;
    train_name: string;
    carriage_count: number;
    has_active_trip: boolean;
}

interface Station {
    location_id: number;
    location_name: string;
    stop_order: number;
}

interface CarriageOption {
    id: number;
    carriage_number: number;
    carriage_type: string;
    is_vip: boolean;
    seat_count: number;
}

interface PriceMap {
    [carriageId: number]: {
        seat?: string;
        lower?: string;
        middle?: string;
        upper?: string;
    };
}

interface TripStatus {
    hasActiveTrip: boolean;
    latestDepartureDate: string | null;
    earliestNewTripDate: string;
    latestAllowedDate: string;
}

const STATUS_BADGE: Record<string, string> = {
    open: "badge-active",
    cancelled: "badge-cancelled",
    completed: "badge-used",
};

const STATUS_LABEL: Record<string, string> = {
    open: "Đang mở",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function TripsPage() {
    // List state
    const [trips,        setTrips]        = useState<TripItem[]>([]);
    const [total,        setTotal]        = useState(0);
    const [page,         setPage]         = useState(0);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterTrain,  setFilterTrain]  = useState("");
    const [filterDate,   setFilterDate]   = useState("");
    const [loading,      setLoading]      = useState(true);
    const [msg,          setMsg]          = useState("");
    const [allTrains,    setAllTrains]    = useState<TrainOption[]>([]);

    // Wizard state
    const [showWizard, setShowWizard] = useState(false);
    const [step,       setStep]       = useState<1 | 2 | 3 | 4>(1);
    const [wizErr,     setWizErr]     = useState("");

    // Step 1
    const [selTrain,     setSelTrain]     = useState<TrainOption | null>(null);
    const [trainStatus,  setTrainStatus]  = useState<TripStatus | null>(null);
    const [stations,     setStations]     = useState<Station[]>([]);
    const [originId,     setOriginId]     = useState<number | null>(null);
    const [destId,       setDestId]       = useState<number | null>(null);

    // Step 2
    const [depDate,      setDepDate]      = useState("");
    const [depTime,      setDepTime]      = useState("");
    const [arrivalStr,   setArrivalStr]   = useState("");
    const [duration,     setDuration]     = useState<number | null>(null);

    // Step 3
    const [carriages,    setCarriages]    = useState<CarriageOption[]>([]);
    const [prices,       setPrices]       = useState<PriceMap>({});

    // Cancel dialog
    const [cancelInfo,   setCancelInfo]   = useState<{ tripId: number; code: string; bookings: number } | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling,   setCancelling]   = useState(false);

    const SIZE = 10;

    // ─── Fetch trips ─────────────────────────────────────────────────────────────

    const fetchTrips = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const res = await tripAdminApi.list({
                page: p, size: SIZE,
                status: filterStatus, trainId: filterTrain || undefined,
                date: filterDate || undefined,
            });
            setTrips(res.data.trips ?? []);
            setTotal(res.data.total ?? 0);
        } finally { setLoading(false); }
    }, [filterStatus, filterTrain, filterDate, page]);

    useEffect(() => { fetchTrips(0); setPage(0); }, [filterStatus, filterTrain, filterDate]);

    useEffect(() => {
        trainAdminApi.list().then(r => setAllTrains(r.data));
    }, []);

    // ─── Wizard helpers ───────────────────────────────────────────────────────────

    function openWizard() {
        setStep(1); setWizErr("");
        setSelTrain(null); setTrainStatus(null);
        setStations([]); setOriginId(null); setDestId(null);
        setDepDate(""); setDepTime(""); setArrivalStr(""); setDuration(null);
        setCarriages([]); setPrices({});
        setShowWizard(true);
    }

    async function handleSelectTrain(trainId: number) {
        const t = allTrains.find(tr => tr.id === trainId) ?? null;
        setSelTrain(t);
        setTrainStatus(null);
        setOriginId(null); setDestId(null); setStations([]);
        setDepDate(""); setArrivalStr(""); setDuration(null);
        if (!t) return;

        const [stationsRes, statusRes] = await Promise.all([
            trainAdminApi.availableStations(trainId),
            trainAdminApi.tripStatus(trainId),
        ]);
        setStations(stationsRes.data);
        setTrainStatus(statusRes.data);
    }

    async function computeArrival(date: string, time: string, oId: number | null, dId: number | null) {
        if (!date || !time || !oId || !dId || !selTrain) { setArrivalStr(""); return; }
        try {
            const res = await trainAdminApi.scheduleDuration(selTrain.id, oId, dId);
            if (res.data.found && res.data.durationMinutes) {
                const dur = Number(res.data.durationMinutes);
                setDuration(dur);
                const depMs = new Date(`${date}T${time}:00`).getTime();
                const arrMs = depMs + dur * 60000;
                const arr = new Date(arrMs);
                setArrivalStr(
                    arr.toLocaleDateString("vi-VN") + " " +
                    arr.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                );
            } else {
                setDuration(null);
                setArrivalStr("Chưa có dữ liệu thời gian cho tuyến này");
            }
        } catch { setArrivalStr(""); }
    }

    async function step2Next() {
        setWizErr("");
        if (!depDate || !depTime) { setWizErr("Vui lòng chọn ngày và giờ khởi hành"); return; }
        if (!duration) { setWizErr("Không tìm thấy thời gian chạy cho tuyến này. Vui lòng kiểm tra dữ liệu train_schedule_times."); return; }
        const depMs = new Date(`${depDate}T${depTime}:00`).getTime() + (duration ?? 0) * 60000;
        if (depMs < Date.now()) { setWizErr("Thời gian đến phải sau hiện tại"); return; }

        const res = await trainAdminApi.carriages(selTrain!.id);
        setCarriages(res.data);
        const initPrices: PriceMap = {};
        for (const c of res.data as CarriageOption[]) {
            initPrices[c.id] = c.carriage_type === "sleeper"
                ? { lower: "", middle: "", upper: "" }
                : { seat: "" };
        }
        setPrices(initPrices);
        setStep(3);
    }

    function step3Next() {
        setWizErr("");
        for (const c of carriages) {
            const p = prices[c.id] ?? {};
            if (c.carriage_type === "sleeper") {
                if (!p.lower || !p.middle || !p.upper)
                    { setWizErr(`Toa ${c.carriage_number} (ghế nằm) chưa nhập đủ giá 3 tầng`); return; }
                if (Number(p.lower) <= 0 || Number(p.middle) <= 0 || Number(p.upper) <= 0)
                    { setWizErr(`Giá vé Toa ${c.carriage_number} phải lớn hơn 0`); return; }
            } else {
                if (!p.seat) { setWizErr(`Toa ${c.carriage_number} (ghế ngồi) chưa nhập giá`); return; }
                if (Number(p.seat) <= 0) { setWizErr(`Giá vé Toa ${c.carriage_number} phải lớn hơn 0`); return; }
            }
        }
        setStep(4);
    }

    async function handleConfirmCreate() {
        setWizErr("");
        const seatPrices: { carriageId: number; berthPosition: string; price: number }[] = [];
        for (const c of carriages) {
            const p = prices[c.id] ?? {};
            if (c.carriage_type === "sleeper") {
                seatPrices.push({ carriageId: c.id, berthPosition: "lower",  price: Number(p.lower)  });
                seatPrices.push({ carriageId: c.id, berthPosition: "middle", price: Number(p.middle) });
                seatPrices.push({ carriageId: c.id, berthPosition: "upper",  price: Number(p.upper)  });
            } else {
                seatPrices.push({ carriageId: c.id, berthPosition: "seat", price: Number(p.seat) });
            }
        }

        try {
            await tripAdminApi.create({
                trainId: selTrain!.id,
                originId, destinationId: destId,
                departureDate: depDate,
                departureTime: depTime,
                seatPrices,
            });
            setMsg("Lên kế hoạch chuyến tàu thành công!");
            setShowWizard(false);
            fetchTrips(0); setPage(0);
        } catch (e) {
            setWizErr(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi server") : "Lỗi");
        }
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────────

    async function openCancel(trip: TripItem) {
        const res = await tripAdminApi.cancelInfo(trip.id);
        setCancelInfo({
            tripId: trip.id,
            code: `${trip.train_code} ngày ${new Date(trip.departure_date).toLocaleDateString("vi-VN")}`,
            bookings: res.data.affectedOrders,
        });
        setCancelReason("");
    }

    async function handleCancel() {
        if (!cancelInfo) return;
        setCancelling(true);
        try {
            const res = await tripAdminApi.cancel(cancelInfo.tripId, { cancelReason });
            setMsg(res.data.message);
            setCancelInfo(null);
            fetchTrips(page);
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setCancelling(false); }
    }

    const totalPages = Math.ceil(total / SIZE);
    const originStation = stations.find(s => s.location_id === originId);
    const destStations  = stations.filter(s => s.stop_order > (originStation?.stop_order ?? -1));

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Page header */}
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Kế hoạch khởi hành</div>
                    <div className="admin-page-subtitle">Tổng: {total} chuyến</div>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={openWizard}>
                    Lên kế hoạch mới
                </button>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            {/* Filters */}
            <div className="admin-card">
                <div className="admin-toolbar">
                    <select className="admin-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="open">Đang mở</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                    <select className="admin-select"
                        value={filterTrain}
                        onChange={e => setFilterTrain(e.target.value)}>
                        <option value="">Tất cả tàu</option>
                        {allTrains.map(t => (
                            <option key={t.id} value={t.id}>[{t.train_code}] {t.train_name}</option>
                        ))}
                    </select>
                    <input type="date" className="admin-input"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)} />
                    <button className="admin-btn admin-btn-outline" onClick={() => {
                        setFilterStatus(""); setFilterTrain(""); setFilterDate("");
                    }}>Xóa lọc</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Chuyến</th>
                                <th>Tuyến</th>
                                <th>Giờ khởi hành</th>
                                <th>Giờ đến</th>
                                <th>Đã đặt</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="admin-loading">Đang tải...</td></tr>
                            ) : trips.length === 0 ? (
                                <tr><td colSpan={7} className="admin-empty">Không có dữ liệu</td></tr>
                            ) : trips.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{ fontWeight: 700, color: "#2F6FED" }}>{t.train_code}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{t.train_name}</div>
                                    </td>
                                    <td>{t.origin_name || "—"} → {t.destination_name || "—"}</td>
                                    <td style={{ fontSize: 12 }}>
                                        {t.departure_time
                                            ? new Date(t.departure_time).toLocaleString("vi-VN")
                                            : t.departure_date}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {t.arrival_time
                                            ? new Date(t.arrival_time).toLocaleString("vi-VN")
                                            : "—"}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{t.confirmed_bookings}</td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[t.status] ?? "badge-pending"}`}>
                                            {STATUS_LABEL[t.status] ?? t.status}
                                        </span>
                                    </td>
                                    <td>
                                        {t.status === "open" && (
                                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => openCancel(t)}>
                                                Hủy kế hoạch
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {trips.length} / {total} chuyến</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn"
                            disabled={page === 0}
                            onClick={() => { const p = page - 1; setPage(p); fetchTrips(p); }}>
                            Trước
                        </button>
                        <button className="admin-pagination-btn active">{page + 1} / {Math.max(totalPages, 1)}</button>
                        <button className="admin-pagination-btn"
                            disabled={page >= totalPages - 1}
                            onClick={() => { const p = page + 1; setPage(p); fetchTrips(p); }}>
                            Sau
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── WIZARD MODAL ────────────────────────────────────────────────── */}
            {showWizard && (
                <div className="admin-modal-overlay" onClick={() => setShowWizard(false)}>
                    <div className="admin-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Lên kế hoạch khởi hành mới</span>
                            <button className="admin-modal-close" onClick={() => setShowWizard(false)}>✕</button>
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #E5E7EB", paddingBottom: 12 }}>
                            {["Chọn tàu & tuyến", "Ngày & giờ", "Giá vé", "Xác nhận"].map((label, i) => (
                                <div key={i} style={{
                                    flex: 1, textAlign: "center", fontSize: 12, fontWeight: step === i + 1 ? 700 : 500,
                                    color: step === i + 1 ? "#2F6FED" : step > i + 1 ? "#16A34A" : "#9CA3AF",
                                    borderBottom: step === i + 1 ? "2px solid #2F6FED" : "2px solid transparent",
                                    paddingBottom: 6
                                }}>
                                    {step > i + 1 ? "✓ " : `${i + 1}. `}{label}
                                </div>
                            ))}
                        </div>

                        {wizErr && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{wizErr}</div>}

                        {/* ── Step 1: Train + Route ── */}
                        {step === 1 && (
                            <div>
                                <div className="admin-form-group">
                                    <label className="admin-form-label">Chọn tàu *</label>
                                    <select className="admin-form-select"
                                        value={selTrain?.id ?? ""}
                                        onChange={e => handleSelectTrain(Number(e.target.value))}>
                                        <option value="">-- Chọn tàu --</option>
                                        {allTrains.map(t => (
                                            <option key={t.id} value={t.id}
                                                disabled={t.has_active_trip || t.carriage_count < 4}>
                                                [{t.train_code}] {t.train_name}
                                                {t.has_active_trip ? " — Đang chạy" : ""}
                                                {t.carriage_count < 4 ? ` — Chỉ có ${t.carriage_count} toa (cần ≥ 4)` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Trip status info */}
                                {selTrain && trainStatus && (
                                    trainStatus.hasActiveTrip ? (
                                        <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>
                                            Tàu này đang có kế hoạch chưa hoàn thành. Vui lòng đợi chuyến hiện tại kết thúc hoặc hủy kế hoạch trước.
                                        </div>
                                    ) : (
                                        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
                                            <span>{selTrain.train_name} • {selTrain.carriage_count} toa • {stations.length} ga</span>
                                            <span style={{ color: "#6B7280", marginLeft: 12 }}>
                                                Có thể lên kế hoạch từ{" "}
                                                <strong>{new Date(trainStatus.earliestNewTripDate).toLocaleDateString("vi-VN")}</strong>
                                                {" "}đến{" "}
                                                <strong>{new Date(trainStatus.latestAllowedDate).toLocaleDateString("vi-VN")}</strong>
                                            </span>
                                        </div>
                                    )
                                )}

                                {stations.length > 0 && !trainStatus?.hasActiveTrip && (
                                    <div className="admin-grid-2">
                                        <div className="admin-form-group">
                                            <label className="admin-form-label">Ga đi *</label>
                                            <select className="admin-form-select"
                                                value={originId ?? ""}
                                                onChange={e => { setOriginId(Number(e.target.value)); setDestId(null); }}>
                                                <option value="">-- Chọn ga đi --</option>
                                                {stations.slice(0, -1).map(s => (
                                                    <option key={s.location_id} value={s.location_id}>{s.location_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="admin-form-label">Ga đến *</label>
                                            <select className="admin-form-select"
                                                value={destId ?? ""}
                                                onChange={e => setDestId(Number(e.target.value))}
                                                disabled={!originId}>
                                                <option value="">-- Chọn ga đến --</option>
                                                {destStations.map(s => (
                                                    <option key={s.location_id} value={s.location_id}>{s.location_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setShowWizard(false)}>Hủy</button>
                                    <button className="admin-btn admin-btn-primary"
                                        disabled={!selTrain || !originId || !destId || !!trainStatus?.hasActiveTrip}
                                        onClick={() => { setWizErr(""); setStep(2); }}>
                                        Tiếp theo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Date + Time ── */}
                        {step === 2 && (
                            <div>
                                <div className="admin-grid-2">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Ngày khởi hành *</label>
                                        <input type="date" className="admin-form-input"
                                            value={depDate}
                                            min={trainStatus?.earliestNewTripDate ?? new Date().toISOString().split("T")[0]}
                                            max={trainStatus?.latestAllowedDate}
                                            onChange={e => {
                                                setDepDate(e.target.value);
                                                computeArrival(e.target.value, depTime, originId, destId);
                                            }} />
                                        {trainStatus && (
                                            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                                                Từ {new Date(trainStatus.earliestNewTripDate).toLocaleDateString("vi-VN")}
                                                {" "}đến {new Date(trainStatus.latestAllowedDate).toLocaleDateString("vi-VN")}
                                            </div>
                                        )}
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Giờ khởi hành *</label>
                                        <input type="time" className="admin-form-input"
                                            value={depTime}
                                            onChange={e => {
                                                setDepTime(e.target.value);
                                                computeArrival(depDate, e.target.value, originId, destId);
                                            }} />
                                    </div>
                                </div>

                                {arrivalStr && (
                                    <div style={{ background: "#EFF6FF", padding: "10px 14px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                                        Giờ đến dự kiến: <strong>{arrivalStr}</strong>
                                        {duration && <span style={{ color: "#6B7280" }}> ({Math.floor(duration / 60)}h{duration % 60}m)</span>}
                                    </div>
                                )}

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(1)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary" onClick={step2Next}>Tiếp theo</button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Seat Prices ── */}
                        {step === 3 && (
                            <div>
                                <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                                    {carriages.map(c => (
                                        <div key={c.id} style={{
                                            border: "1px solid #E5E7EB", borderRadius: 8, padding: 14,
                                            marginBottom: 12, background: "#FAFAFA"
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                                                Toa {c.carriage_number} — {c.carriage_type === "sleeper" ? "Ghế nằm" : "Ghế ngồi"}
                                                {c.is_vip && <span style={{ marginLeft: 6, background: "#FFC107", color: "#7B4F00", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>VIP</span>}
                                                <span style={{ marginLeft: 8, color: "#6B7280", fontWeight: 400, fontSize: 12 }}>{c.seat_count} ghế</span>
                                            </div>

                                            {c.carriage_type === "sleeper" ? (
                                                <div className="admin-grid-3" style={{ gap: 8 }}>
                                                    {(["lower", "middle", "upper"] as const).map(tier => (
                                                        <div key={tier} className="admin-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="admin-form-label" style={{ fontSize: 11 }}>
                                                                {tier === "lower" ? "Tầng dưới" : tier === "middle" ? "Tầng giữa" : "Tầng trên"} (đ)
                                                            </label>
                                                            <input type="number" className="admin-form-input" style={{ fontSize: 13 }}
                                                                placeholder="0"
                                                                value={prices[c.id]?.[tier] ?? ""}
                                                                onChange={e => setPrices(prev => ({
                                                                    ...prev,
                                                                    [c.id]: { ...prev[c.id], [tier]: e.target.value }
                                                                }))} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="admin-form-group" style={{ marginBottom: 0, maxWidth: 200 }}>
                                                    <label className="admin-form-label" style={{ fontSize: 11 }}>Giá vé (đ)</label>
                                                    <input type="number" className="admin-form-input"
                                                        placeholder="0"
                                                        value={prices[c.id]?.seat ?? ""}
                                                        onChange={e => setPrices(prev => ({
                                                            ...prev,
                                                            [c.id]: { ...prev[c.id], seat: e.target.value }
                                                        }))} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(2)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary" onClick={step3Next}>Tiếp theo</button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 4: Confirm ── */}
                        {step === 4 && (
                            <div>
                                <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Tóm tắt kế hoạch</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, fontSize: 13 }}>
                                        <span style={{ color: "#6B7280" }}>Tàu:</span>
                                        <span style={{ fontWeight: 600 }}>{selTrain?.train_code} — {selTrain?.train_name}</span>
                                        <span style={{ color: "#6B7280" }}>Tuyến:</span>
                                        <span>{stations.find(s => s.location_id === originId)?.location_name} → {stations.find(s => s.location_id === destId)?.location_name}</span>
                                        <span style={{ color: "#6B7280" }}>Ngày khởi hành:</span>
                                        <span>{depDate}</span>
                                        <span style={{ color: "#6B7280" }}>Giờ khởi hành:</span>
                                        <span>{depTime}</span>
                                        <span style={{ color: "#6B7280" }}>Giờ đến:</span>
                                        <span>{arrivalStr}</span>
                                        <span style={{ color: "#6B7280" }}>Số toa:</span>
                                        <span>{carriages.length} toa • {carriages.reduce((s, c) => s + c.seat_count, 0)} ghế</span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Bảng giá vé:</div>
                                    {carriages.map(c => (
                                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, padding: "4px 0", borderBottom: "1px solid #F3F4F6" }}>
                                            <span>Toa {c.carriage_number} ({c.carriage_type === "sleeper" ? "Ghế nằm" : "Ghế ngồi"})</span>
                                            <span style={{ fontWeight: 600 }}>
                                                {c.carriage_type === "sleeper"
                                                    ? `${Number(prices[c.id]?.lower ?? 0).toLocaleString("vi-VN")}đ / ${Number(prices[c.id]?.middle ?? 0).toLocaleString("vi-VN")}đ / ${Number(prices[c.id]?.upper ?? 0).toLocaleString("vi-VN")}đ`
                                                    : `${Number(prices[c.id]?.seat ?? 0).toLocaleString("vi-VN")}đ`}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(3)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary" onClick={handleConfirmCreate}>
                                        Xác nhận lên kế hoạch
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── CANCEL DIALOG ────────────────────────────────────────────────── */}
            {cancelInfo && (
                <div className="admin-modal-overlay" onClick={() => setCancelInfo(null)}>
                    <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Hủy kế hoạch</span>
                            <button className="admin-modal-close" onClick={() => setCancelInfo(null)}>✕</button>
                        </div>

                        <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>
                            Hủy chuyến <strong>{cancelInfo.code}</strong> sẽ hoàn tiền cho{" "}
                            <strong>{cancelInfo.bookings}</strong> đơn hàng đã đặt.
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-form-label">Lý do hủy</label>
                            <textarea className="admin-form-input" rows={3}
                                placeholder="Nhập lý do hủy chuyến..."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                style={{ resize: "vertical" }} />
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setCancelInfo(null)}>Không hủy</button>
                            <button className="admin-btn admin-btn-danger"
                                onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? "Đang xử lý..." : "Xác nhận hủy chuyến"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
