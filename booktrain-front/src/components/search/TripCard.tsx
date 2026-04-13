import type { TripResult } from "../../types/trip";
import "./tripCard.css";
import {useNavigate} from "react-router-dom";

interface TripCardProps {
    trip: TripResult;
}

export default function TripCard({ trip }: TripCardProps) {
    const navigate = useNavigate();
    const formatPrice = (price: number) =>
        price.toLocaleString("vi-VN") + "đ";

    return (
        <div className="trip-card">
            {/* Phần trái: giờ đi, tuyến, tên tàu */}
            <div className="trip-card-left">
                <div className="trip-times">
                    <div className="trip-time-block">
                        <span className="trip-hour">{trip.departureTime}</span>
                        <span className="trip-station">{trip.originName}</span>
                    </div>

                    <div className="trip-middle">
                        <span className="trip-duration-label">{trip.duration}</span>
                        <div className="trip-line-track">
                            <span className="track-dot" />
                            <span className="track-line" />
                            {trip.nextDay && (
                                <span className="next-day-badge">+1 ngày</span>
                            )}
                            <span className="track-line" />
                            <span className="track-dot" />
                        </div>
                    </div>

                    <div className="trip-time-block trip-time-block--right">
                        <span className="trip-hour">{trip.arrivalTime}</span>
                        <span className="trip-station">{trip.destinationName}</span>
                    </div>
                </div>

                {/* Tên tàu */}
                <div className="trip-train-info">
                    <span className="train-icon">🚂</span>
                    <span className="train-code">{trip.trainCode}</span>
                    {trip.trainName && (
                        <span className="train-name">{trip.trainName}</span>
                    )}
                </div>
            </div>

            {/* Phần phải: giá vé + nút đặt */}
            <div className="trip-card-right">
                <div className="trip-prices">
                    {trip.carriagePrices.map((cp) => (
                        <div key={cp.carriageType} className="price-item">
                            <span className="price-type">{cp.carriageTypeLabel}</span>
                            <span className="price-amount">
                                Từ {formatPrice(cp.minPrice)}
                            </span>
                            <span className="price-seats">
                                còn {cp.availableSeats} chỗ
                            </span>
                        </div>
                    ))}
                </div>
                <button className="btn-book-trip" onClick={()=> navigate('/trains/booking/${trip.id}')}>
                    Đặt vé
                    {trip.carriagePrices.length > 0 && (
                        <span className="btn-book-hint">Giá rẻ nhất</span>
                    )}
                </button>
            </div>
        </div>
    );
}