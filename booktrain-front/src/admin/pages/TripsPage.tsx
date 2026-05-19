import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { tripAdminApi, trainAdminApi } from "../api/adminApi";
import { stationApi } from "../../api/station";
import type { LocationDTO } from "../../types/location";
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

// ─── Admin Station Dropdown (grouped by province, searchable) ─────────────────

function AdminStationDropdown({
    label, placeholder, locations, value, onChange,
}: {
    label: string;
    placeholder: string;
    locations: LocationDTO[];
    value: number | null;
    onChange: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false); setSearch("");
            }
        }
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const filtered = useMemo(() => {
        if (!search) return locations;
        const kw = search.toLowerCase();
        return locations.filter(l =>
            l.name.toLowerCase().includes(kw) ||
            (l.provinceName ?? "").toLowerCase().includes(kw)
        );
    }, [locations, search]);

    const grouped = useMemo(() => {
        const map: Record<string, LocationDTO[]> = {};
        for (const loc of filtered) {
            const prov = loc.provinceName ?? "Khác";
            if (!map[prov]) map[prov] = [];
            map[prov].push(loc);
        }
        return map;
    }, [filtered]);

    const selected = locations.find(l => l.id === value);

    return (
        <div className="admin-form-group" ref={ref} style={{ position: "relative" }}>
            <label className="admin-form-label">{label}</label>
            <div
                className="admin-form-select"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => setOpen(v => !v)}
            >
                <span style={{ color: selected ? "#1F2937" : "#9CA3AF" }}>
                    {selected ? selected.name : placeholder}
                </span>
                <span style={{ fontSize: 10 }}>▼</span>
            </div>

            {open && (
                <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                    background: "#fff", border: "1px solid #D1D5DB", borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 280, overflow: "hidden",
                    display: "flex", flexDirection: "column",
                }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
                        <input
                            autoFocus
                            type="text"
                            placeholder="🔍 Tìm ga tàu..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: "100%", border: "1px solid #E5E7EB", borderRadius: 6,
                                padding: "6px 10px", fontSize: 13, outline: "none", boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 220 }}>
                        {Object.entries(grouped).map(([prov, locs]) => (
                            <div key={prov}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, color: "#6B7280",
                                    textTransform: "uppercase", padding: "6px 12px",
                                    background: "#F9FAFB", borderBottom: "1px solid #F3F4F6",
                                }}>
                                    {prov}
                                </div>
                                {locs.map(loc => (
                                    <div
                                        key={loc.id}
                                        onClick={e => { e.stopPropagation(); onChange(loc.id); setOpen(false); setSearch(""); }}
                                        style={{
                                            padding: "8px 12px", cursor: "pointer", fontSize: 13,
                                            background: loc.id === value ? "#EFF6FF" : "transparent",
                                            fontWeight: loc.id === value ? 700 : 400,
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#F0F4FF")}
                                        onMouseLeave={e => (e.currentTarget.style.background = loc.id === value ? "#EFF6FF" : "transparent")}
                                    >
                                        <div style={{ fontWeight: 600 }}>{loc.name.startsWith("Ga ") ? loc.name.slice(3) : loc.name}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{loc.name}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: 16, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                                Không tìm thấy ga nào
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

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
    const [allLocations, setAllLocations] = useState<LocationDTO[]>([]);

    // Wizard state
    const [showWizard, setShowWizard] = useState(false);
    const [step,       setStep]       = useState<1 | 2 | 3 | 4 | 5>(1);
    const [wizErr,     setWizErr]     = useState("");

    // Step 1: Chọn tàu
    const [selTrain,     setSelTrain]     = useState<TrainOption | null>(null);
    const [trainStatus,  setTrainStatus]  = useState<TripStatus | null>(null);
    const [stations,     setStations]     = useState<Station[]>([]);
    const [originId,     setOriginId]     = useState<number | null>(null);
    const [destId,       setDestId]       = useState<number | null>(null);

    // Step 2: Đi đến (originId, destId nằm ở Step 1 state)

    // Step 3: Ngày & giờ
    const [depDate,      setDepDate]      = useState("");
    const [depTime,      setDepTime]      = useState("");
    const [arrivalStr,   setArrivalStr]   = useState("");
    const [duration,     setDuration]     = useState<number | null>(null);

    // Step 4: Giá vé
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
        stationApi.getAll().then(r => {
            const mapped: LocationDTO[] = r.data.map(s => ({
                id: s.id,
                name: s.name,
                locationType: "train_station",
                provinceName: s.city,
                provinceId: null,
                address: null,
                iataCode: null,
            }));
            setAllLocations(mapped);
        }).catch(() => {});
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

    /** Tính giờ đến từ duration (phút) */
    function updateArrivalFromDuration(date: string, time: string, dur: number) {
        if (!date || !time || dur <= 0) { setArrivalStr(""); return; }
        const depMs = new Date(`${date}T${time}:00`).getTime();
        const arr = new Date(depMs + dur * 60000);
        setArrivalStr(
            arr.toLocaleDateString("vi-VN") + " " +
            arr.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        );
    }

    /** Tự động tìm duration từ DB, nếu không có thì để admin nhập thủ công */
    async function computeArrival(date: string, time: string, oId: number | null, dId: number | null) {
        if (!oId || !dId || !selTrain) { return; }
        try {
            const res = await trainAdminApi.scheduleDuration(selTrain.id, oId, dId);
            if (res.data.found && res.data.durationMinutes) {
                const dur = Number(res.data.durationMinutes);
                setDuration(dur);
                if (date && time) updateArrivalFromDuration(date, time, dur);
            } else {
                // Không tìm thấy → giữ duration null → admin nhập thủ công
                setDuration(null);
                setArrivalStr("");
            }
        } catch { /* giữ nguyên */ }
    }

    /** Khi admin nhập duration thủ công */
    function handleManualDuration(hours: string, minutes: string) {
        const h = parseInt(hours) || 0;
        const m = parseInt(minutes) || 0;
        const totalMin = h * 60 + m;
        if (totalMin > 0) {
            setDuration(totalMin);
            updateArrivalFromDuration(depDate, depTime, totalMin);
        } else {
            setDuration(null);
            setArrivalStr("");
        }
    }

    async function step3Next() {
        setWizErr("");
        if (!depDate || !depTime) { setWizErr("Vui lòng chọn ngày và giờ khởi hành"); return; }
        if (!duration || duration <= 0) {
            setWizErr("Vui lòng nhập thời gian di chuyển dự kiến");
            return;
        }
        const depMs = new Date(`${depDate}T${depTime}:00`).getTime() + duration * 60000;
        if (depMs < Date.now()) { setWizErr("Thời gian đến phải sau hiện tại"); return; }

        const res = await trainAdminApi.carriages(selTrain!.id);
        setCarriages(res.data);
        const initPrices: PriceMap = {};
        for (const c of res.data as CarriageOption[]) {
            initPrices[c.id] = c.carriage_type === "sleeper_3"
                ? { lower: "", middle: "", upper: "" }
                : c.carriage_type === "sleeper_2"
                    ? { lower: "", upper: "" }
                    : { seat: "" };
        }
        setPrices(initPrices);
        setStep(4);
    }

    function step4Next() {
        setWizErr("");
        for (const c of carriages) {
            const p = prices[c.id] ?? {};
            if (c.carriage_type === "sleeper_3") {
                if (!p.lower || !p.middle || !p.upper)
                    { setWizErr(`Toa ${c.carriage_number} (nằm khoang 6) chưa nhập đủ giá 3 tầng`); return; }
                if (Number(p.lower) <= 0 || Number(p.middle) <= 0 || Number(p.upper) <= 0)
                    { setWizErr(`Giá vé Toa ${c.carriage_number} phải lớn hơn 0`); return; }
            } else if (c.carriage_type === "sleeper_2") {
                if (!p.lower || !p.upper)
                    { setWizErr(`Toa ${c.carriage_number} (nằm khoang 4) chưa nhập đủ giá 2 tầng`); return; }
                if (Number(p.lower) <= 0 || Number(p.upper) <= 0)
                    { setWizErr(`Giá vé Toa ${c.carriage_number} phải lớn hơn 0`); return; }
            } else {
                if (!p.seat) { setWizErr(`Toa ${c.carriage_number} (ghế ngồi) chưa nhập giá`); return; }
                if (Number(p.seat) <= 0) { setWizErr(`Giá vé Toa ${c.carriage_number} phải lớn hơn 0`); return; }
            }
        }
        setStep(5);
    }

    /** Áp dụng giá của 1 toa cho tất cả toa cùng loại */
    function applyPriceToSameType(sourceCarriageId: number) {
        const source = carriages.find(c => c.id === sourceCarriageId);
        if (!source) return;
        const sourcePrice = prices[sourceCarriageId];
        if (!sourcePrice) return;
        setPrices(prev => {
            const next = { ...prev };
            for (const c of carriages) {
                if (c.carriage_type === source.carriage_type && c.id !== sourceCarriageId) {
                    next[c.id] = { ...sourcePrice };
                }
            }
            return next;
        });
    }

    async function handleConfirmCreate() {
        setWizErr("");
        // Build segmentPrices deduplicated by (carriageType, berthPosition)
        type SegPrice = { fromStationId: number; toStationId: number; carriageType: string; berthPosition: string; price: number };
        const segmentPrices: SegPrice[] = [];
        const typesSeen = new Set<string>();
        for (const c of carriages) {
            if (typesSeen.has(c.carriage_type)) continue;
            typesSeen.add(c.carriage_type);
            const p = prices[c.id] ?? {};
            if (c.carriage_type === "sleeper_3") {
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "lower",  price: Number(p.lower) });
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "middle", price: Number(p.middle) });
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "upper",  price: Number(p.upper) });
            } else if (c.carriage_type === "sleeper_2") {
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "lower",  price: Number(p.lower) });
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "upper",  price: Number(p.upper) });
            } else {
                segmentPrices.push({ fromStationId: originId!, toStationId: destId!, carriageType: c.carriage_type, berthPosition: "seat", price: Number(p.seat) });
            }
        }

        // Combine date + time into ISO datetime with Vietnam timezone (+07:00)
        const departureDatetime = `${depDate}T${depTime}:00+07:00`;

        try {
            await tripAdminApi.create({
                trainId: selTrain!.id,
                fromStationId: originId,
                toStationId: destId,
                departureDatetime,
                segmentPrices,
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
                                    <td style={{ color: "#1F2937" }}>{(t.origin_name && t.destination_name)
                                        ? `${t.origin_name} → ${t.destination_name}`
                                        : (() => {
                                            // "Tàu Thống Nhất SE1 - Hà Nội - Sài Gòn" → "Hà Nội → Sài Gòn"
                                            const parts = (t.train_name || "").split(/\s*[-—–→]\s*/);
                                            return parts.length >= 3
                                                ? parts.slice(-2).join(" → ")
                                                : parts[parts.length - 1] || "—";
                                        })()}
                                    </td>
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
                            {["Chọn tàu", "Đi đến", "Ngày & giờ", "Giá vé", "Xác nhận"].map((label, i) => (
                                <div key={i} style={{
                                    flex: 1, textAlign: "center", fontSize: 12, fontWeight: step === i + 1 ? 700 : 500,
                                    color: step === i + 1 ? "#2F6FED" : step > i + 1 ? "#16A34A" : "#9CA3AF",
                                    borderBottom: step === i + 1 ? "2px solid #2F6FED" : "2px solid transparent",
                                    paddingBottom: 6, cursor: step > i + 1 ? "pointer" : "default",
                                }}
                                onClick={() => { if (step > i + 1) setStep((i + 1) as 1|2|3|4|5); }}>
                                    {step > i + 1 ? "✓ " : `${i + 1}. `}{label}
                                </div>
                            ))}
                        </div>

                        {wizErr && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{wizErr}</div>}

                        {/* ── Step 1: Train ── */}
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

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setShowWizard(false)}>Hủy</button>
                                    <button className="admin-btn admin-btn-primary"
                                        disabled={!selTrain || !!trainStatus?.hasActiveTrip}
                                        onClick={() => { setWizErr(""); setStep(2); }}>
                                        Tiếp theo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Đi đến (Origin/Destination) ── */}
                        {step === 2 && (
                            <div>
                                <div style={{ background: "#EFF6FF", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                                    Tàu: <strong>{selTrain?.train_code} — {selTrain?.train_name}</strong>
                                </div>

                                <div className="admin-grid-2">
                                    <AdminStationDropdown
                                        label="Ga xuất phát *"
                                        placeholder="Chọn ga đi"
                                        locations={allLocations.filter(l => l.id !== destId)}
                                        value={originId}
                                        onChange={id => { setOriginId(id); setDestId(null); }}
                                    />
                                    <AdminStationDropdown
                                        label="Ga kết thúc *"
                                        placeholder="Chọn ga đến"
                                        locations={allLocations.filter(l => l.id !== originId)}
                                        value={destId}
                                        onChange={setDestId}
                                    />
                                </div>

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(1)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary"
                                        disabled={!originId || !destId}
                                        onClick={() => {
                                            setWizErr("");
                                            setStep(3);
                                            computeArrival(depDate, depTime, originId, destId);
                                        }}>
                                        Tiếp theo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Date + Time ── */}
                        {step === 3 && (
                            <div>
                                <div style={{ background: "#EFF6FF", padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                                    Tàu: <strong>{selTrain?.train_code}</strong>
                                    <span style={{ margin: "0 8px", color: "#6B7280" }}>•</span>
                                    <strong>{allLocations.find(l => l.id === originId)?.name}</strong>
                                    <span style={{ margin: "0 6px" }}>→</span>
                                    <strong>{allLocations.find(l => l.id === destId)?.name}</strong>
                                </div>

                                <div className="admin-grid-2">
                                    <div className="admin-form-group">
                                        <label className="admin-form-label">Ngày khởi hành *</label>
                                        <input type="date" className="admin-form-input"
                                            value={depDate}
                                            min={trainStatus?.earliestNewTripDate ?? new Date().toISOString().split("T")[0]}
                                            max={trainStatus?.latestAllowedDate}
                                            onChange={e => {
                                                setDepDate(e.target.value);
                                                if (duration) updateArrivalFromDuration(e.target.value, depTime, duration);
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
                                                if (duration) updateArrivalFromDuration(depDate, e.target.value, duration);
                                            }} />
                                    </div>
                                </div>

                                {/* Thời gian di chuyển — auto-fill hoặc nhập thủ công */}
                                <div className="admin-form-group" style={{ marginTop: 4 }}>
                                    <label className="admin-form-label">Thời gian di chuyển dự kiến *</label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <input type="number" className="admin-form-input" min="0"
                                            style={{ width: 80 }}
                                            placeholder="Giờ"
                                            value={duration ? Math.floor(duration / 60) : ""}
                                            onChange={e => handleManualDuration(e.target.value, String((duration ?? 0) % 60))} />
                                        <span style={{ fontSize: 13, color: "#6B7280" }}>giờ</span>
                                        <input type="number" className="admin-form-input" min="0" max="59"
                                            style={{ width: 80 }}
                                            placeholder="Phút"
                                            value={duration ? (duration % 60) : ""}
                                            onChange={e => handleManualDuration(String(Math.floor((duration ?? 0) / 60)), e.target.value)} />
                                        <span style={{ fontSize: 13, color: "#6B7280" }}>phút</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                                        {duration
                                            ? `Tổng: ${Math.floor(duration / 60)} giờ ${duration % 60} phút`
                                            : "Nhập thời gian di chuyển dự kiến (tự động điền nếu có dữ liệu)"}
                                    </div>
                                </div>

                                {arrivalStr && duration && (
                                    <div style={{
                                        background: "#F0FDF4", border: "1px solid #BBF7D0",
                                        padding: "10px 14px", borderRadius: 6, marginBottom: 12, fontSize: 13,
                                        color: "#166534",
                                    }}>
                                        ✓ Giờ đến dự kiến: <strong>{arrivalStr}</strong>
                                        <span style={{ color: "#6B7280", marginLeft: 8 }}>({Math.floor(duration / 60)}h{duration % 60}m)</span>
                                    </div>
                                )}

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(2)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary" onClick={step3Next}>Tiếp theo</button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 4: Seat Prices ── */}
                        {step === 4 && (
                            <div>
                                <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                                    {carriages.map(c => (
                                        <div key={c.id} style={{
                                            border: "1px solid #E5E7EB", borderRadius: 8, padding: 14,
                                            marginBottom: 12, background: "#FAFAFA"
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                                                Toa {c.carriage_number} — {c.carriage_type === "sleeper_3" ? "Nằm khoang 6" : c.carriage_type === "sleeper_2" ? "Nằm khoang 4" : "Ghế ngồi"}
                                                {c.is_vip && <span style={{ marginLeft: 6, background: "#FFC107", color: "#7B4F00", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>VIP</span>}
                                                <span style={{ marginLeft: 8, color: "#6B7280", fontWeight: 400, fontSize: 12 }}>{c.seat_count} ghế</span>
                                            </div>

                                            {c.carriage_type === "sleeper_3" ? (
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
                                            ) : c.carriage_type === "sleeper_2" ? (
                                                <div className="admin-grid-2" style={{ gap: 8 }}>
                                                    {(["lower", "upper"] as const).map(tier => (
                                                        <div key={tier} className="admin-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="admin-form-label" style={{ fontSize: 11 }}>
                                                                {tier === "lower" ? "Tầng dưới" : "Tầng trên"} (đ)
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

                                            {carriages.filter(cc => cc.carriage_type === c.carriage_type).length > 1 && (
                                                <button type="button"
                                                    style={{
                                                        marginTop: 8, padding: "4px 10px", fontSize: 11,
                                                        background: "#EFF6FF", color: "#2F6FED", border: "1px solid #BFDBFE",
                                                        borderRadius: 4, cursor: "pointer", fontWeight: 600,
                                                    }}
                                                    onClick={() => applyPriceToSameType(c.id)}>
                                                    ↳ Áp dụng giá này cho tất cả toa {c.carriage_type !== "seat" ? "nằm" : "ngồi"} cùng loại
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(3)}>Quay lại</button>
                                    <button className="admin-btn admin-btn-primary" onClick={step4Next}>Tiếp theo</button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 5: Confirm ── */}
                        {step === 5 && (
                            <div>
                                <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 10 }}>Tóm tắt kế hoạch</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 6, fontSize: 13 }}>
                                        <span style={{ color: "#6B7280" }}>Tàu:</span>
                                        <span style={{ fontWeight: 600 }}>{selTrain?.train_code} — {selTrain?.train_name}</span>
                                        <span style={{ color: "#6B7280" }}>Tuyến:</span>
                                        <span>{allLocations.find(l => l.id === originId)?.name} → {allLocations.find(l => l.id === destId)?.name}</span>
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
                                            <span>Toa {c.carriage_number} ({c.carriage_type === "sleeper_3" ? "Nằm khoang 6" : c.carriage_type === "sleeper_2" ? "Nằm khoang 4" : "Ghế ngồi"})</span>
                                            <span style={{ fontWeight: 600 }}>
                                                {c.carriage_type === "sleeper_3"
                                                    ? `${Number(prices[c.id]?.lower ?? 0).toLocaleString("vi-VN")}đ / ${Number(prices[c.id]?.middle ?? 0).toLocaleString("vi-VN")}đ / ${Number(prices[c.id]?.upper ?? 0).toLocaleString("vi-VN")}đ`
                                                    : c.carriage_type === "sleeper_2"
                                                        ? `${Number(prices[c.id]?.lower ?? 0).toLocaleString("vi-VN")}đ / ${Number(prices[c.id]?.upper ?? 0).toLocaleString("vi-VN")}đ`
                                                        : `${Number(prices[c.id]?.seat ?? 0).toLocaleString("vi-VN")}đ`}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="admin-modal-actions">
                                    <button className="admin-btn admin-btn-outline" onClick={() => setStep(4)}>Quay lại</button>
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
