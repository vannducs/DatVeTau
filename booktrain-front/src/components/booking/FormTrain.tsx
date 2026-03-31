import { MapPin, Calendar, Search, ArrowRightLeft } from "lucide-react"
import PassengerSelector from "./PassengerSelector"

export default function FormTrain() {
  return (
    <div className="form-body">
      <div className="row-locations">
        <div className="field-block">
          <label>Nơi xuất phát</label>
          <div className="field-card">
            <MapPin size={18} className="icon-blue" />
            <div className="field-content">
              <div className="field-title">Vinh</div>
              <div className="field-sub">Ga Vinh</div>
            </div>
          </div>
        </div>

        <div className="field-block">
          <label>Nơi đến</label>
          <div className="field-card">
            <MapPin size={18} className="icon-red" />
            <div className="field-content">
              <div className="field-title">Đà Nẵng</div>
              <div className="field-sub">Ga Đà Nẵng</div>
            </div>
            <button type="button" className="swap-btn" aria-label="Đổi chiều">
              <ArrowRightLeft size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="row-date-search">
        <div className="field-block field-block-date">
          <label>Ngày đi</label>
          <div className="field-card">
            <Calendar size={18} className="icon-blue" />
            <div className="field-title field-title-inline">13, 09/12/2025</div>
          </div>
        </div>

        <div className="return-link-wrap">
          <button type="button" className="return-link">+ Thêm ngày về</button>
        </div>

        <button type="button" className="search-btn">
          <Search size={18} />
          <span>Tìm kiếm</span>
        </button>
      </div>

      <PassengerSelector />
    </div>
  )
}
