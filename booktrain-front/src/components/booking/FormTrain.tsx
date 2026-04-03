import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import DatePicker from "./DatePicker";
import PassengerSelector from "./PassengerSelector";
import StationSelector from "./StationSelector";
import type { TrainPassengerCount } from "../../types/passenger";
import type { LocationDTO } from "../../types/location";
import { locationApi } from "../../api/location";

const initialPassengers: TrainPassengerCount = {
  adult: 1,
  child: 0,
  elderly: 0,
  student: 0,
  union: 0,
};

export default function FormTrain() {
  const [trainStations, setTrainStations] = useState<LocationDTO[]>([]);
  const [departure, setDeparture] = useState<LocationDTO | null>(null);
  const [destination, setDestination] = useState<LocationDTO | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [passengerCount, setPassengerCount] = useState<TrainPassengerCount>(initialPassengers);

  useEffect(() => {
    locationApi.getTrainStations().then((res) => setTrainStations(res.data)).catch(() => {});
  }, []);

  function handleSwap() {
    setDeparture(destination);
    setDestination(departure);
  }

  return (
    <div className="form-body form-body-vexere">
      <div className="search-card-row">
        <div className="search-col search-col-station">
          <StationSelector
            label="Nơi xuất phát"
            type="train"
            role="origin"
            value={departure}
            onChange={(item) => setDeparture(item as LocationDTO)}
            items={trainStations}
            iconColor="blue"
            compact
          />
        </div>
        <div className="search-col-swap">
          <button type="button" className="swap-btn-inline" onClick={handleSwap} aria-label="Đổi chiều">
            <ArrowRightLeft size={18} />
          </button>
        </div>
        <div className="search-col search-col-station">
          <StationSelector
            label="Nơi đến"
            type="train"
            role="destination"
            value={destination}
            onChange={(item) => setDestination(item as LocationDTO)}
            items={trainStations}
            iconColor="red"
            compact
          />
        </div>
        <div className="search-col-divider" aria-hidden />
        <div className="search-col search-col-date">
          <DatePicker value={departureDate} onChange={setDepartureDate} label="Ngày đi" compact />
        </div>
        <div className="search-col search-col-return">
          <span className="field-label-mini field-label-spacer"> </span>
          <button type="button" className="return-link-inline">
            + Thêm ngày về
          </button>
        </div>
        <div className="search-col search-col-submit">
          <span className="field-label-mini field-label-spacer"> </span>
          <button type="button" className="search-btn search-btn-row">
            Tìm kiếm
          </button>
        </div>
      </div>

      <PassengerSelector variant="train" count={passengerCount} onChange={setPassengerCount} />
    </div>
  );
}
