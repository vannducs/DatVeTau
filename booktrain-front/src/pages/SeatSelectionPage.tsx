import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/common/Header";
import { tripApi } from "../api/trip";
import type { SeatDTO } from "../types/seat";
import "./SeatSelection.css";

interface CarriageGroup {
    carriageNumber: number;
    carriageType: string;
    carriageId: number;
    seats: SeatDTO[];
}

const CARRIAGE_LABEL: Record<string, string> = {
    hard_seat:      "Ngồi cứng",
    soft_seat:      "Ngồi mềm",
    hard_sleeper:   "Giường khoang 6",
    soft_sleeper:   "Giường khoang 4",
    vip_ac_sleeper: "Giường VIP",
};

export default function SeatSelectionPage() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [carriages, setCarriages] = useState<CarriageGroup[]>([]);
    const [selectedCarriage, setSelectedCarriage] = useState<CarriageGroup | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<SeatDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) return;
        tripApi.getSeats(Number(tripId))
            .then(res => {
                const data: Record<string, SeatDTO[]> = res.data;
                const groups: CarriageGroup[] = Object.entries(data).map(([num, seats]) => ({
                    carriageNumber: Number(num),
                    carriageType: seats[0]?.carriageType || "",
                    carriageId: seats[0]?.carriageId || 0,
                    seats,
                }));
                groups.sort((a, b) => a.carriageNumber - b.carriageNumber);
                setCarriages(groups);
                setSelectedCarriage(groups[0] || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [tripId]);

    function handleSelectSeat(seat: SeatDTO) {
        if (seat.status === "booked") return;
        setSelectedSeats(prev => {
            const exists = prev.find(s => s.id === seat.id);
            if (exists) return prev.filter(s => s.id !== seat.id);
            return [...prev, seat];
        });
    }

    function isSeatSelected(seat: SeatDTO) {
        return selectedSeats.some(s => s.id === seat.id);
    }

    const totalPrice = selectedSeats.reduce((sum, s) => sum + s.ticketPrice, 0);

    function getSeatClass(seat: SeatDTO) {
        if (seat.status === "booked") return "ss-seat ss-seat--booked";
        if (isSeatSelected(seat)) return "ss-seat ss-seat--selected";
        return "ss-seat ss-seat--available";
    }

    function renderSeatCarriage(seats: SeatDTO[]) {
        const half = Math.ceil(seats.length / 2);
        const topRow = seats.slice(0, half);
        const bottomRow = seats.slice(half);

        return (
            <div className="ss-seat-map-wrap">
                <div className="ss-seat-map">
                    <div className="ss-seat-row">
                        {topRow.map(seat => (
                            <div key={seat.id} className={getSeatClass(seat)}
                                onClick={() => handleSelectSeat(seat)}>
                                <div className="ss-seat-icon">
                                    {seat.status === "booked" ? "✕" : seat.seatNumber}
                                </div>
                                {seat.status !== "booked" && (
                                    <div className="ss-seat-price">
                                        {Math.round(seat.ticketPrice / 1000)}K
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="ss-aisle"><span>H À N H &nbsp; L A N G</span></div>
                    <div className="ss-seat-row">
                        {bottomRow.map(seat => (
                            <div key={seat.id} className={getSeatClass(seat)}
                                onClick={() => handleSelectSeat(seat)}>
                                <div className="ss-seat-icon">
                                    {seat.status === "booked" ? "✕" : seat.seatNumber}
                                </div>
                                {seat.status !== "booked" && (
                                    <div className="ss-seat-price">
                                        {Math.round(seat.ticketPrice / 1000)}K
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    function renderSleeperCarriage(seats: SeatDTO[], isSoft: boolean) {
        const perCompartment = isSoft ? 4 : 6;
        const compartments: SeatDTO[][] = [];
        for (let i = 0; i < seats.length; i += perCompartment) {
            compartments.push(seats.slice(i, i + perCompartment));
        }

        const tiers = isSoft ? ["upper", "lower"] : ["upper", "middle", "lower"];
        const tierLabel: Record<string, string> = {
            lower: "Tầng: 1", middle: "Tầng: 2", upper: "Tầng: 3",
        };

        return (
            <div className="ss-sleeper-wrap">
                <div className="ss-sleeper-aisle-label">H À N H &nbsp; L A N G</div>
                <div className="ss-sleeper-grid">
                    <div className="ss-tier-labels">
                        {tiers.map(tier => (
                            <div key={tier} className="ss-tier-label">{tierLabel[tier]}</div>
                        ))}
                    </div>
                    <div className="ss-compartments">
                        {compartments.map((comp, idx) => (
                            <div key={idx} className="ss-compartment">
                                {tiers.map(tier => {
                                    const seat = comp.find(s => s.berthPosition === tier);
                                    if (!seat) return <div key={tier} className="ss-berth ss-berth--empty" />;
                                    return (
                                        <div key={tier}
                                            className={`ss-berth ${seat.status === "booked" ? "ss-berth--booked" : isSeatSelected(seat) ? "ss-berth--selected" : "ss-berth--available"}`}
                                            onClick={() => handleSelectSeat(seat)}>
                                            <span className="ss-berth-num">
                                                {seat.status === "booked" ? "✕" : seat.seatNumber}
                                            </span>
                                            {seat.status !== "booked" && (
                                                <span className="ss-berth-price">
                                                    {Math.round(seat.ticketPrice / 1000)}K
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="ss-compartment-footer">
                    <div className="ss-tier-label-spacer" />
                    <div className="ss-compartment-nums">
                        {compartments.map((_, idx) => (
                            <div key={idx} className="ss-compartment-num">{idx + 1}</div>
                        ))}
                    </div>
                </div>
                <div className="ss-khoang-row">
                    <div className="ss-tier-label-spacer" />
                    <span className="ss-khoang-text">KHOANG</span>
                </div>
            </div>
        );
    }

    if (loading) return (
        <>
            <Header />
            <div className="ss-loading">🔍 Đang tải sơ đồ ghế...</div>
        </>
    );

    const isSleeper = (type: string) =>
        ["soft_sleeper", "hard_sleeper", "vip_ac_sleeper"].includes(type);

    return (
        <>
            <Header />
            <div className="ss-page">
                {/* Chọn toa */}
                <div className="ss-carriage-bar">
                    <div className="ss-carriage-bar-inner">
                        {carriages.map(c => {
                            const avail = c.seats.filter(s => s.status === "available").length;
                            const minPrice = avail > 0
                                ? Math.min(...c.seats.filter(s => s.status === "available").map(s => s.ticketPrice))
                                : 0;
                            const isActive = selectedCarriage?.carriageNumber === c.carriageNumber;
                            return (
                                <button key={c.carriageNumber}
                                    className={`ss-cbtn ${isActive ? "ss-cbtn--active" : ""} ${avail === 0 ? "ss-cbtn--full" : ""}`}
                                    onClick={() => avail > 0 && setSelectedCarriage(c)}>
                                    <span className="ss-cbtn-num">{c.carriageNumber}</span>
                                    <div className="ss-cbtn-body">
                                        <span className="ss-cbtn-type">
                                            {CARRIAGE_LABEL[c.carriageType]}
                                        </span>
                                        <span className="ss-cbtn-info">
                                            {avail > 0
                                                ? `${avail} chỗ • Từ ${Math.round(minPrice / 1000)}K`
                                                : "Hết chỗ"}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sơ đồ ghế */}
                {selectedCarriage && (
                    <div className="ss-map-section">
                        <div className="ss-map-header">
                            <div className="ss-map-left">
                                <h3 className="ss-map-title">
                                    Toa {selectedCarriage.carriageNumber}:&nbsp;
                                    {CARRIAGE_LABEL[selectedCarriage.carriageType]}
                                </h3>
                                <p className="ss-map-hint">
                                    Giá hiển thị trên ghế là giá vé cho 1 người lớn.
                                </p>
                            </div>
                            <div className="ss-legend">
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--available" />
                                    Chỗ trống
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--selected" />
                                    Đang chọn
                                </span>
                                <span className="ss-legend-item">
                                    <span className="ss-legend-box ss-legend-box--booked" />
                                    Đã bán
                                </span>
                            </div>
                        </div>

                        <div className="ss-map-content">
                            {isSleeper(selectedCarriage.carriageType)
                                ? renderSleeperCarriage(
                                    selectedCarriage.seats,
                                    selectedCarriage.carriageType === "soft_sleeper" ||
                                    selectedCarriage.carriageType === "vip_ac_sleeper"
                                )
                                : renderSeatCarriage(selectedCarriage.seats)
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Footer cố định */}
            <div className="ss-footer">
                <div className="ss-footer-inner">
                    <div className="ss-footer-seats-wrap">
                        {selectedSeats.length === 0 ? (
                            <span className="ss-footer-placeholder">Bấm để chọn chỗ</span>
                        ) : (
                            selectedSeats.map(s => (
                                <span key={s.id} className="ss-footer-tag">
                                    Ghế {s.seatNumber}
                                    <button className="ss-footer-tag-remove"
                                        onClick={() => handleSelectSeat(s)}>✕</button>
                                </span>
                            ))
                        )}
                    </div>
                    <div className="ss-footer-total">
                        <span className="ss-footer-total-label">
                            Tổng cộng cho {Math.max(selectedSeats.length, 1)} người:
                        </span>
                        <span className="ss-footer-total-price">
                            {totalPrice.toLocaleString("vi-VN")}đ
                        </span>
                    </div>
                    <button className="ss-footer-continue"
                        disabled={selectedSeats.length === 0}
                        onClick={() => {
                            const seatIds = selectedSeats.map(s => s.id).join(",");
                            navigate(`/trains/passenger-info?tripId=${tripId}&seatIds=${seatIds}`);
                        }}>
                        Tiếp tục
                    </button>
                </div>
            </div>
        </>
    );
}