import { MapPin, Calendar, Search, Users, ArrowRightLeft, ChevronDown } from "lucide-react"

export default function FormFlight() {
  return (
    <div className="form-body">
      <div className="row-locations">
        <div className="field-block">
          <label>Nơi xuất phát</label>
          <div className="field-card">
            <MapPin size={18} className="icon-blue" />
            <div className="field-content">
              <div className="field-title">TP. Hồ Chí Minh</div>
              <div className="field-sub">SGN</div>
            </div>
            <ChevronDown size={16} className="icon-chevron" />
          </div>
        </div>

        <div className="field-block">
          <label>Nơi đến</label>
          <div className="field-card">
            <MapPin size={18} className="icon-red" />
            <div className="field-content">
              <div className="field-title">Hà Nội</div>
              <div className="field-sub">HAN</div>
            </div>
            <button type="button" className="swap-btn" aria-label="Đổi chiều">
              <ArrowRightLeft size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="row-flight-second">
        <div className="field-block field-block-date">
          <label>Ngày đi</label>
          <div className="field-card">
            <Calendar size={18} className="icon-blue" />
            <div className="field-title field-title-inline">13/12/2025</div>
          </div>
        </div>

        <div className="field-block field-block-date">
          <label>Ngày về</label>
          <div className="field-card field-card-placeholder">
            <Calendar size={18} className="icon-placeholder" />
            <div className="field-title field-title-inline field-placeholder">Khứ hồi</div>
          </div>
        </div>

        <div className="field-block field-block-date">
          <label>Hành khách</label>
          <div className="field-card">
            <Users size={18} className="icon-blue" />
            <div className="field-title field-title-inline">1 Hành khách</div>
          </div>
        </div>

        <div className="field-block field-block-date">
          <label>Hạng vé</label>
          <div className="field-card">
            <div className="field-title field-title-inline">Phổ thông</div>
            <ChevronDown size={16} className="icon-chevron" />
          </div>
        </div>

        <button type="button" className="search-btn">
          <Search size={18} />
          <span>Tìm kiếm</span>
        </button>
      </div>
    </div>
  )
}
