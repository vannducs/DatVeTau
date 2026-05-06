import { useEffect, useState } from "react";
import { tripAdminApi, locationAdminApi } from "../api/adminApi";
import axios from "axios";

interface Trip {
    id: number;
    train_code: string;
    train_name: string;
    origin_name: string;
    destination_name: string;
    departure_time: string;
    arrival_time: string;
    status: string;
}

interface Location { id: number; name: string; }
interface Train    { id: number; train_code: string; train_name: string; }

interface TripForm {
    trainId: string;
    originId: string;
    destinationId: string;
    departureTime: string;
    arrivalTime: string;
    status: string;
}

const EMPTY_FORM: TripForm = {
    trainId: "", originId: "", destinationId: "",
    departureTime: "", arrivalTime: "", status: "open",
};

const STATUS_BADGE: Record<string, string> = {
    open: "badge-active", closed: "badge-pending", cancelled: "badge-cancelled",
};

export default function TripsPage() {
    const [trips,     setTrips]     = useState<Trip[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [trains,    setTrains]    = useState<Train[]>([]);
    const [total,     setTotal]     = useState(0);
    const [page,      setPage]      = useState(0);
    const [search,    setSearch]    = useState("");
    const [loading,   setLoading]   = useState(true);
    const [modal,     setModal]     = useState<"add" | "edit" | null>(null);
    const [editId,    setEditId]    = useState<number | null>(null);
    const [form,      setForm]      = useState<TripForm>(EMPTY_FORM);
    const [msg,       setMsg]       = useState("");
    const [error,     setError]     = useState("");
    const SIZE = 10;

    async function fetchTrips(p = page, s = search) {
        setLoading(true);
        try {
            const res = await tripAdminApi.list({ page: p, size: SIZE, search: s });
            setTrips(res.data.trips);
            setTotal(res.data.total);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchTrips(0, ""); }, []);
    useEffect(() => {
        locationAdminApi.list("").then(r => setLocations(r.data));
        axios.get("http://localhost:8080/api/admin/trips/trains", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then(r => setTrains(r.data));
    }, []);

    function handleSearch() {
        setPage(0);
        fetchTrips(0, search);
    }

    function openAdd() {
        setForm(EMPTY_FORM);
        setEditId(null);
        setModal("add");
        setError("");
    }

    async function openEdit(id: number) {
        const res = await tripAdminApi.detail(id);
        const d = res.data;
        setForm({
            trainId:       d.train_id?.toString() ?? "",
            originId:      d.origin_id?.toString() ?? "",
            destinationId: d.destination_id?.toString() ?? "",
            departureTime: d.departure_time?.slice(0, 16) ?? "",
            arrivalTime:   d.arrival_time?.slice(0, 16) ?? "",
            status:        d.status ?? "open",
        });
        setEditId(id);
        setModal("edit");
        setError("");
    }

    async function handleSave() {
        setError("");
        const body = {
            trainId:       Number(form.trainId),
            originId:      Number(form.originId),
            destinationId: Number(form.destinationId),
            departureTime: form.departureTime,
            arrivalTime:   form.arrivalTime,
            status:        form.status,
        };
        try {
            if (modal === "add") {
                await tripAdminApi.create(body);
                setMsg("Tạo chuyến tàu thành công");
            } else if (editId !== null) {
                await tripAdminApi.update(editId, body);
                setMsg("Cập nhật thành công");
            }
            setModal(null);
            fetchTrips(page, search);
        } catch (e) {
            setError(axios.isAxiosError(e) ? (e.response?.data?.message ?? "Lỗi server") : "Lỗi");
        }
    }

    async function handleDelete(id: number, code: string) {
        if (!confirm(`Huỷ chuyến "${code}"?`)) return;
        await tripAdminApi.delete(id);
        setMsg("Đã huỷ chuyến tàu");
        fetchTrips(page, search);
    }

    const totalPages = Math.ceil(total / SIZE);

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <div className="admin-page-title">Quản lý chuyến tàu</div>
                    <div className="admin-page-subtitle">Tổng: {total} chuyến</div>
                </div>
                <button className="admin-btn admin-btn-primary" onClick={openAdd}>
                    + Thêm chuyến tàu
                </button>
            </div>

            {msg && <div className="admin-alert admin-alert-success">{msg}</div>}

            <div className="admin-card">
                <div className="admin-toolbar">
                    <input
                        className="admin-search"
                        placeholder="Tìm theo mã tàu, ga đi, ga đến..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                    />
                    <button className="admin-btn admin-btn-outline" onClick={handleSearch}>Tìm</button>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tàu</th>
                                <th>Ga đi → Ga đến</th>
                                <th>Giờ đi</th>
                                <th>Giờ đến</th>
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
                                    <td style={{ color: "#9CA3AF" }}>#{t.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>{t.train_code}</div>
                                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{t.train_name}</div>
                                    </td>
                                    <td>{t.origin_name} → {t.destination_name}</td>
                                    <td style={{ fontSize: 12 }}>
                                        {new Date(t.departure_time).toLocaleString("vi-VN")}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {new Date(t.arrival_time).toLocaleString("vi-VN")}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${STATUS_BADGE[t.status] ?? "badge-pending"}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button className="admin-btn admin-btn-outline admin-btn-sm"
                                                onClick={() => openEdit(t.id)}>Sửa</button>
                                            <button className="admin-btn admin-btn-danger admin-btn-sm"
                                                onClick={() => handleDelete(t.id, t.train_code)}>Huỷ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="admin-pagination">
                    <span>Hiển thị {trips.length} / {total} chuyến</span>
                    <div className="admin-pagination-btns">
                        <button className="admin-pagination-btn" disabled={page === 0}
                            onClick={() => { setPage(p => p - 1); fetchTrips(page - 1, search); }}>
                            ← Trước
                        </button>
                        <button className="admin-pagination-btn active">{page + 1}</button>
                        <button className="admin-pagination-btn" disabled={page >= totalPages - 1}
                            onClick={() => { setPage(p => p + 1); fetchTrips(page + 1, search); }}>
                            Sau →
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal thêm/sửa */}
            {modal && (
                <div className="admin-modal-overlay" onClick={() => setModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <span className="admin-modal-title">
                                {modal === "add" ? "Thêm chuyến tàu" : "Chỉnh sửa chuyến tàu"}
                            </span>
                            <button className="admin-modal-close" onClick={() => setModal(null)}>×</button>
                        </div>

                        {error && <div className="admin-alert admin-alert-error">{error}</div>}

                        <div className="admin-form-group">
                            <label className="admin-form-label">Tàu hỏa</label>
                            <select className="admin-form-select"
                                value={form.trainId}
                                onChange={e => setForm(f => ({ ...f, trainId: e.target.value }))}>
                                <option value="">-- Chọn tàu --</option>
                                {trains.map(t => (
                                    <option key={t.id} value={t.id}>
                                        [{t.train_code}] {t.train_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-grid-2">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Ga đi</label>
                                <select className="admin-form-select"
                                    value={form.originId}
                                    onChange={e => setForm(f => ({ ...f, originId: e.target.value }))}>
                                    <option value="">-- Chọn ga --</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Ga đến</label>
                                <select className="admin-form-select"
                                    value={form.destinationId}
                                    onChange={e => setForm(f => ({ ...f, destinationId: e.target.value }))}>
                                    <option value="">-- Chọn ga --</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="admin-grid-2">
                            <div className="admin-form-group">
                                <label className="admin-form-label">Giờ đi</label>
                                <input className="admin-form-input" type="datetime-local"
                                    value={form.departureTime}
                                    onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
                            </div>
                            <div className="admin-form-group">
                                <label className="admin-form-label">Giờ đến</label>
                                <input className="admin-form-input" type="datetime-local"
                                    value={form.arrivalTime}
                                    onChange={e => setForm(f => ({ ...f, arrivalTime: e.target.value }))} />
                            </div>
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-form-label">Trạng thái</label>
                            <select className="admin-form-select"
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="admin-modal-actions">
                            <button className="admin-btn admin-btn-outline" onClick={() => setModal(null)}>Huỷ</button>
                            <button className="admin-btn admin-btn-primary" onClick={handleSave}>
                                {modal === "add" ? "Tạo chuyến" : "Lưu thay đổi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
