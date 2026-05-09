import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trainAdminApi } from "../api/adminApi";
import axios from "axios";

interface SeatDetail { id: number; seat_number: string; berth_position: string; }
interface CarriageDetail {
    id: number;
    carriage_number: number;
    carriage_type: string;
    is_vip: boolean;
    amenities: string;
    seats_per_compartment: number;
    seats: SeatDetail[];
}
interface TrainData {
    id: number;
    train_code: string;
    train_name: string;
    train_type: string;
    carriages: CarriageDetail[];
}

interface TripStatus {
    hasActiveTrip: boolean;
    earliestNewTripDate: string;
    latestAllowedDate: string;
}

const TYPE_LABEL: Record<string, string> = {
    seat: "Ghế ngồi",
    sleeper: "Ghế nằm",
};

export default function TrainDetailPage() {
    const { trainId } = useParams<{ trainId: string }>();
    const navigate = useNavigate();
    const [train,       setTrain]       = useState<TrainData | null>(null);
    const [tripStatus,  setTripStatus]  = useState<TripStatus | null>(null);
    const [loading,     setLoading]     = useState(true);
    const [selIdx,      setSelIdx]      = useState(0);
    const [msg,         setMsg]         = useState("");
    const [errors,      setErrors]      = useState<string[]>([]);
    const [busy,        setBusy]        = useState(false);

    const [carriageEdits, setCarriageEdits] = useState<Record<number, { isVip: boolean; amenities: string }>>({});
    const [typeConfirm, setTypeConfirm] = useState<{ carriageId: number; newType: string } | null>(null);

    async function fetchTrain() {
        try {
            const [trainRes, statusRes] = await Promise.all([
                trainAdminApi.detail(Number(trainId)),
                trainAdminApi.tripStatus(Number(trainId)),
            ]);
            setTrain(trainRes.data);
            setTripStatus(statusRes.data);
            const edits: Record<number, { isVip: boolean; amenities: string }> = {};
            for (const c of trainRes.data.carriages) {
                edits[c.id] = { isVip: !!c.is_vip, amenities: c.amenities ?? "" };
            }
            setCarriageEdits(edits);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchTrain(); }, [trainId]);

    const carriage = train?.carriages[selIdx] ?? null;
    const locked = tripStatus?.hasActiveTrip === true;

    // ─── Carriage actions ────────────────────────────────────────────────────────

    async function addCarriage() {
        if (!train || locked) return;
        if (train.carriages.length >= 8) { alert("Tàu đã có tối đa 8 toa"); return; }
        setBusy(true);
        try {
            await trainAdminApi.addCarriage(train.id, { carriageType: "seat" });
            await fetchTrain();
            setSelIdx(train.carriages.length);
            setMsg("Đã thêm toa mới");
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function deleteCarriage(carriageId: number, num: number) {
        if (locked) return;
        if (!confirm(`Xóa Toa ${num}? Toàn bộ ghế trong toa sẽ bị xóa.`)) return;
        setBusy(true);
        try {
            await trainAdminApi.deleteCarriage(carriageId);
            await fetchTrain();
            setSelIdx(0);
            setMsg("Đã xóa toa");
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function saveCarriageProps(carriageId: number) {
        if (locked) return;
        const edit = carriageEdits[carriageId];
        if (!edit) return;
        setBusy(true);
        try {
            await trainAdminApi.updateCarriage(carriageId, {
                isVip: edit.isVip,
                amenities: edit.amenities,
            });
            setMsg("Đã lưu thuộc tính toa");
            await fetchTrain();
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    async function changeCarriageType(carriageId: number, newType: string) {
        if (locked) return;
        setBusy(true);
        try {
            await trainAdminApi.updateCarriage(carriageId, { carriageType: newType });
            setMsg("Đã đổi loại toa, ghế cũ đã bị xóa");
            await fetchTrain();
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally {
            setBusy(false);
            setTypeConfirm(null);
        }
    }

    // ─── Seat actions ────────────────────────────────────────────────────────────

    async function addSeat() {
        if (!carriage || locked) return;
        const isSleeper = carriage.carriage_type === "sleeper";
        if (isSleeper) {
            const compartmentNum = Math.floor(carriage.seats.length / 3) + 1;
            const tierLabels = [
                { pos: "lower",  label: `${compartmentNum.toString().padStart(2, "0")}-L` },
                { pos: "middle", label: `${compartmentNum.toString().padStart(2, "0")}-M` },
                { pos: "upper",  label: `${compartmentNum.toString().padStart(2, "0")}-U` },
            ];
            if (carriage.seats.length >= 18) { alert("Toa nằm tối đa 6 khoang (18 ghế)"); return; }
            setBusy(true);
            try {
                for (const t of tierLabels) {
                    await trainAdminApi.addSeat(carriage.id, { seatNumber: t.label, berthPosition: t.pos });
                }
                setMsg("Đã thêm khoang");
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        } else {
            if (carriage.seats.length >= 32) { alert("Toa ngồi tối đa 32 ghế"); return; }
            const nextNum = (carriage.seats.length + 1).toString().padStart(2, "0");
            setBusy(true);
            try {
                await trainAdminApi.addSeat(carriage.id, { seatNumber: nextNum, berthPosition: "seat" });
                setMsg("Đã thêm ghế");
                await fetchTrain();
            } catch (e) {
                alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
            } finally { setBusy(false); }
        }
    }

    async function deleteLastSeat() {
        if (!carriage || locked) return;
        const isSleeper = carriage.carriage_type === "sleeper";
        const toDelete = isSleeper
            ? carriage.seats.slice(-3)
            : [carriage.seats[carriage.seats.length - 1]];

        const label = isSleeper ? "khoang cuối cùng (3 ghế)" : "ghế cuối";
        if (!confirm(`Xóa ${label}?`)) return;

        setBusy(true);
        try {
            for (const s of toDelete) {
                await trainAdminApi.deleteSeat(s.id);
            }
            setMsg(isSleeper ? "Đã xóa khoang" : "Đã xóa ghế");
            await fetchTrain();
        } catch (e) {
            alert(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi") : "Lỗi");
        } finally { setBusy(false); }
    }

    // ─── Validate ────────────────────────────────────────────────────────────────

    async function handleValidate() {
        if (!train) return;
        const res = await trainAdminApi.validate(train.id);
        setErrors(res.data.errors);
        if (res.data.valid) setMsg("Tàu hợp lệ — có thể lên kế hoạch chuyến");
    }

    // ─── Render ──────────────────────────────────────────────────────────────────

    if (loading) return <div className="admin-loading">Đang tải thông tin đoàn tàu...</div>;
    if (!train)  return <div className="admin-empty">Không tìm thấy đoàn tàu</div>;

    const isSleeper = carriage?.carriage_type === "sleeper";
    const compartments: SeatDetail[][] = [];
    if (carriage && isSleeper) {
        for (let i = 0; i < carriage.seats.length; i += 3) {
            compartments.push(carriage.seats.slice(i, i + 3));
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={() => navigate("/admin/trains")}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>arrow_back</span>
                            Danh sách tàu
                        </button>
                        <div className="admin-page-title">{train.train_code} — {train.train_name}</div>
                    </div>
                    <div className="admin-page-subtitle">{train.carriages.length} toa • {train.train_type}</div>
                </div>
                <button className="admin-btn admin-btn-outline" onClick={handleValidate}>
                    <span className="material-icons-round" style={{ fontSize: 16 }}>verified</span>
                    Kiểm tra hợp lệ
                </button>
            </div>

            {/* Banner tàu đang chạy */}
            {locked && (
                <div style={{
                    background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8,
                    padding: "12px 16px", marginBottom: 16,
                    display: "flex", alignItems: "center", gap: 10
                }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: "#D97706" }}>warning</span>
                    <span style={{ fontWeight: 600, color: "#92400E" }}>
                        Tàu đang có kế hoạch khởi hành. Không thể chỉnh sửa toa tàu và ghế.
                    </span>
                </div>
            )}

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}
            {errors.length > 0 && (
                <div className="admin-alert admin-alert-error">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Tàu chưa hợp lệ:</div>
                    {errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
            )}

            {/* Sơ đồ đoàn tàu */}
            <div className="admin-card" style={{ overflow: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: "max-content", padding: "4px 0" }}>
                    <div style={{
                        width: 56, height: 56, background: "#1E2A3B", borderRadius: "8px 4px 4px 8px",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0
                    }}>
                        <span className="material-icons-round" style={{ fontSize: 28 }}>directions_railway</span>
                    </div>

                    {train.carriages.map((c, idx) => (
                        <button key={c.id}
                            onClick={() => setSelIdx(idx)}
                            style={{
                                width: 72, height: 56,
                                border: selIdx === idx ? "2.5px solid #2F6FED" : "1.5px solid #E5E7EB",
                                borderRadius: 6,
                                background: selIdx === idx ? "#EFF6FF" : "#fff",
                                cursor: "pointer", display: "flex", flexDirection: "column",
                                alignItems: "center", justifyContent: "center", gap: 2, flexShrink: 0, padding: 0,
                            }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: selIdx === idx ? "#2F6FED" : "#374151" }}>
                                Toa {c.carriage_number}
                            </span>
                            <span style={{ fontSize: 9, color: "#6B7280" }}>{TYPE_LABEL[c.carriage_type]}</span>
                            {c.is_vip && (
                                <span style={{ fontSize: 9, background: "#FFC107", color: "#7B4F00", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>VIP</span>
                            )}
                        </button>
                    ))}

                    <div style={{
                        width: 40, height: 56, background: "#374151", borderRadius: "4px 8px 8px 4px", flexShrink: 0
                    }} />

                    {train.carriages.length < 8 && (
                        <button className="admin-btn admin-btn-outline admin-btn-sm"
                            onClick={addCarriage}
                            disabled={busy || locked}
                            style={{ marginLeft: 12, flexShrink: 0 }}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                            Thêm toa
                        </button>
                    )}
                </div>
            </div>

            {/* Chi tiết toa đang chọn */}
            {carriage && (
                <div className="admin-card">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>
                                Toa {carriage.carriage_number} — {TYPE_LABEL[carriage.carriage_type]}
                            </span>
                            <span style={{ fontSize: 12, color: "#6B7280" }}>{carriage.seats.length} ghế</span>
                        </div>
                        <button className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => deleteCarriage(carriage.id, carriage.carriage_number)}
                            disabled={busy || locked}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>delete</span>
                            Xóa toa
                        </button>
                    </div>

                    {/* Loại toa + VIP */}
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-form-label">Loại toa</label>
                            <select className="admin-form-select"
                                value={carriage.carriage_type}
                                disabled={locked}
                                onChange={e => {
                                    if (!locked && e.target.value !== carriage.carriage_type) {
                                        setTypeConfirm({ carriageId: carriage.id, newType: e.target.value });
                                    }
                                }}>
                                <option value="seat">Ghế ngồi</option>
                                <option value="sleeper">Ghế nằm</option>
                            </select>
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: locked ? "not-allowed" : "pointer", marginBottom: 2 }}>
                            <input type="checkbox"
                                disabled={locked}
                                checked={carriageEdits[carriage.id]?.isVip ?? false}
                                onChange={e => !locked && setCarriageEdits(prev => ({
                                    ...prev,
                                    [carriage.id]: { ...prev[carriage.id], isVip: e.target.checked }
                                }))} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>Toa VIP</span>
                        </label>

                        {carriageEdits[carriage.id]?.isVip && (
                            <div className="admin-form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                                <label className="admin-form-label">Tiện ích</label>
                                <input className="admin-form-input"
                                    placeholder="VD: Điều hòa, TV, ổ cắm điện..."
                                    readOnly={locked}
                                    value={carriageEdits[carriage.id]?.amenities ?? ""}
                                    onChange={e => !locked && setCarriageEdits(prev => ({
                                        ...prev,
                                        [carriage.id]: { ...prev[carriage.id], amenities: e.target.value }
                                    }))} />
                            </div>
                        )}

                        <button className="admin-btn admin-btn-primary admin-btn-sm"
                            onClick={() => saveCarriageProps(carriage.id)}
                            disabled={busy || locked}>
                            <span className="material-icons-round" style={{ fontSize: 14 }}>save</span>
                            Lưu toa
                        </button>
                    </div>

                    {/* Sơ đồ ghế */}
                    {!isSleeper ? (
                        <div>
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                                Sơ đồ ghế ngồi (tối đa 32 ghế)
                            </div>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 48px) 24px repeat(2, 48px)",
                                gap: 4, maxWidth: 240
                            }}>
                                {Array.from({ length: Math.max(Math.ceil(carriage.seats.length / 4), 1) }).map((_, row) => {
                                    const rowSeats = carriage.seats.slice(row * 4, row * 4 + 4);
                                    return (
                                        <>
                                            {[0, 1].map(col => {
                                                const seat = rowSeats[col];
                                                return seat ? (
                                                    <div key={seat.id} style={{
                                                        width: 48, height: 36, background: "#DBEAFE",
                                                        border: "1px solid #93C5FD", borderRadius: 4,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 11, fontWeight: 600, color: "#1E40AF"
                                                    }}>{seat.seat_number}</div>
                                                ) : <div key={`e-${row}-${col}`} style={{ width: 48, height: 36 }} />;
                                            })}
                                            <div key={`aisle-${row}`} style={{ width: 24, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <div style={{ width: 1, height: "100%", background: "#E5E7EB" }} />
                                            </div>
                                            {[2, 3].map(col => {
                                                const seat = rowSeats[col];
                                                return seat ? (
                                                    <div key={seat.id} style={{
                                                        width: 48, height: 36, background: "#DBEAFE",
                                                        border: "1px solid #93C5FD", borderRadius: 4,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 11, fontWeight: 600, color: "#1E40AF"
                                                    }}>{seat.seat_number}</div>
                                                ) : <div key={`e-${row}-${col}`} style={{ width: 48, height: 36 }} />;
                                            })}
                                        </>
                                    );
                                })}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={addSeat} disabled={busy || locked || carriage.seats.length >= 32}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                                    Thêm ghế
                                </button>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={deleteLastSeat} disabled={busy || locked || carriage.seats.length === 0}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>remove</span>
                                    Xóa ghế cuối
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                                Sơ đồ khoang nằm (tối đa 6 khoang • {compartments.length} khoang hiện có)
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {compartments.map((comp, idx) => (
                                    <div key={idx} style={{
                                        border: "1.5px solid #D1D5DB", borderRadius: 6, padding: 8,
                                        minWidth: 80, background: "#F9FAFB"
                                    }}>
                                        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                                            Khoang {idx + 1}
                                        </div>
                                        {["upper", "middle", "lower"].map(tier => {
                                            const seat = comp.find(s => s.berth_position === tier);
                                            return (
                                                <div key={tier} style={{
                                                    height: 28, background: seat ? "#E0F2FE" : "#F3F4F6",
                                                    border: seat ? "1px solid #7DD3FC" : "1px dashed #D1D5DB",
                                                    borderRadius: 4, marginBottom: 4, display: "flex",
                                                    alignItems: "center", justifyContent: "center", fontSize: 10,
                                                    fontWeight: 600, color: seat ? "#0369A1" : "#9CA3AF"
                                                }}>
                                                    {seat ? seat.seat_number : `${tier} (trống)`}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                                {compartments.length === 0 && (
                                    <div style={{ color: "#9CA3AF", fontSize: 13 }}>Chưa có khoang nào. Bấm "Thêm khoang" để bắt đầu.</div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={addSeat} disabled={busy || locked || compartments.length >= 6}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                                    Thêm khoang
                                </button>
                                <button className="admin-btn admin-btn-outline admin-btn-sm"
                                    onClick={deleteLastSeat} disabled={busy || locked || compartments.length === 0}>
                                    <span className="material-icons-round" style={{ fontSize: 14 }}>remove</span>
                                    Xóa khoang cuối
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Confirm đổi loại toa */}
            {typeConfirm && (
                <div className="admin-modal-overlay" onClick={() => setTypeConfirm(null)}>
                    <div className="admin-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">Đổi loại toa</span>
                            <button className="admin-modal-close" onClick={() => setTypeConfirm(null)}>
                                <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
                            </button>
                        </div>
                        <div className="admin-alert admin-alert-error" style={{ margin: "0 0 16px" }}>
                            Đổi loại toa sẽ <strong>XÓA TOÀN BỘ ghế</strong> hiện tại trong toa này. Bạn phải thêm lại ghế/khoang mới sau khi đổi.
                        </div>
                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setTypeConfirm(null)}>Hủy</button>
                            <button className="admin-btn admin-btn-danger"
                                onClick={() => changeCarriageType(typeConfirm.carriageId, typeConfirm.newType)}
                                disabled={busy}>
                                Xác nhận đổi loại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
