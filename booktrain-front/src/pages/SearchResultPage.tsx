import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tripApi } from "../api/trip";
import { locationApi } from "../api/location";
import type { TripResult } from "../types/trip";
import type { LocationDTO } from "../types/location";
import Header from "../components/common/Header";
import TripCard from "../components/search/TripCard";
import SearchBox from "../components/booking/SearchBox"; // 👈 thêm import
import "./searchResult.css";
import "../components/booking/searchSection.css";
import HomeFooter from "../components/home/HomeFooter"


export default function SearchResultPage() {
    const [params] = useSearchParams();

    const originId = Number(params.get("originId"));
    const destinationId = Number(params.get("destinationId"));
    const date = params.get("date") || "";

    const [trips, setTrips] = useState<TripResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [origin, setOrigin] = useState<LocationDTO | null>(null);
    const [destination, setDestination] = useState<LocationDTO | null>(null);
    const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "depart_asc" | "depart_desc">("price_asc");

    // Bộ lọc giờ đi
    const [filterHour, setFilterHour] = useState<string | null>(null);

    useEffect(() => {
        locationApi.getTrainStations().then(res => {
            const stations: LocationDTO[] = res.data;
            setOrigin(stations.find(s => s.id === originId) || null);
            setDestination(stations.find(s => s.id === destinationId) || null);
        });
    }, [originId, destinationId]);

    useEffect(() => {
        setLoading(true);
        tripApi.search(originId, destinationId, date)
            .then(res => setTrips(res.data))
            .catch(() => setTrips([]))
            .finally(() => setLoading(false));
    }, [originId, destinationId, date]);

    const formatDate = (d: string) => {
        if (!d) return "";
        const [y, m, day] = d.split("-");
        const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
        const thu = ["CN","T2","T3","T4","T5","T6","T7"][dateObj.getDay()];
        return `${thu}, ${day}/${m}`;
    };

    // Lọc theo giờ đi
    const filtered = trips.filter(trip => {
        if (!filterHour) return true;
        const hour = parseInt(trip.departureTime.split(":")[0]);
        if (filterHour === "sang_som")  return hour >= 0  && hour < 6;
        if (filterHour === "buoi_sang") return hour >= 6  && hour < 12;
        if (filterHour === "buoi_chieu") return hour >= 12 && hour < 18;
        if (filterHour === "buoi_toi") return hour >= 18 && hour <= 23;
        return true;
    });

    // Sắp xếp
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === "price_asc") {
            return (a.carriagePrices[0]?.minPrice || 0) - (b.carriagePrices[0]?.minPrice || 0);
        }
        if (sortBy === "price_desc") {
            return (b.carriagePrices[0]?.minPrice || 0) - (a.carriagePrices[0]?.minPrice || 0);
        }
        if (sortBy === "depart_asc") return a.departureTime.localeCompare(b.departureTime);
        if (sortBy === "depart_desc") return b.departureTime.localeCompare(a.departureTime);
        return 0;
    });

    return (
        <>
            <Header />

            {/* Search box tái sử dụng */}
            <div className="search-result-searchbox">
                <SearchBox
                    defaultTab="train"
                    initialOrigin={origin}           
                    initialDestination={destination}
                    initialDate={date}
                />
            </div>
            {/* Thông tin tuyến + ngày */}
            <div className="search-result-info-bar">
                <span className="search-route-text">
                    {origin?.name || `Ga #${originId}`}
                    <span className="route-arrow"> → </span>
                    {destination?.name || `Ga #${destinationId}`}
                </span>
                <span className="search-date-badge">{formatDate(date)}</span>
            </div>

            <div className="search-result-page">
                <div className="search-result-body">

                    {/* Bộ lọc bên trái */}
                    <aside className="search-filter">
                        <h3 className="filter-title">Bộ lọc</h3>

                        <div className="filter-section">
                            <h4 className="filter-section-title">Giờ đi</h4>
                            <div className="filter-hour-grid">
                                {[
                                    { key: "sang_som",    label: "Sáng sớm",   sub: "00:00 - 06:00" },
                                    { key: "buoi_sang",   label: "Buổi sáng",  sub: "06:01 - 12:00" },
                                    { key: "buoi_chieu",  label: "Buổi chiều", sub: "12:01 - 18:00" },
                                    { key: "buoi_toi",    label: "Buổi tối",   sub: "18:01 - 23:59" },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        className={`filter-hour-btn ${filterHour === f.key ? "filter-hour-btn--active" : ""}`}
                                        onClick={() => setFilterHour(filterHour === f.key ? null : f.key)}
                                    >
                                        <span className="filter-hour-label">{f.label}</span>
                                        <span className="filter-hour-sub">{f.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Danh sách chuyến bên phải */}
                    <div className="search-result-main">

                        {/* Sort bar */}
                        <div className="sort-bar">
                            <span className="sort-label">Sắp xếp</span>
                            {[
                                { key: "price_asc",   label: "Giá thấp nhất" },
                                { key: "price_desc",  label: "Giá cao nhất" },
                                { key: "depart_asc",  label: "Giờ đi sớm nhất" },
                                { key: "depart_desc", label: "Giờ đi muộn nhất" },
                            ].map(s => (
                                <button
                                    key={s.key}
                                    className={`sort-btn ${sortBy === s.key ? "sort-btn--active" : ""}`}
                                    onClick={() => setSortBy(s.key as typeof sortBy)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Kết quả */}
                        {loading ? (
                            <div className="result-status">🔍 Đang tìm kiếm chuyến tàu...</div>
                        ) : sorted.length === 0 ? (
                            <div className="result-status">
                                 Không tìm thấy chuyến tàu nào!
                            </div>
                        ) : (
                            <>
                                <div className="result-count">
                                    Tìm thấy <strong>{sorted.length}</strong> chuyến tàu
                                </div>
                                <div className="trip-list">
                                    {sorted.map(trip => (
                                        <TripCard key={trip.id} trip={trip} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <HomeFooter/>
        </>
    );
}