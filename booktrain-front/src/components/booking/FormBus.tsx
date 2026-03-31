import { MapPin, Calendar, Search, Users, ArrowRightLeft, ChevronDown } from "lucide-react"

export default function FormBus() {
  return (
    <div className="form-body">
      <div className="row-locations">
        <div className="field-block">
          <label>Nơi xuất phát</label>
          <div className="field-card">
            <MapPin size={18} className="icon-blue" />
            <div className="field-content">
              <div className="field-title">Vinh</div>
              <div className="field-sub">Nghệ An</div>
            </div>
            <ChevronDown size={16} className="icon-chevron" />
          </div>
        </div>

        <div className="field-block">
          <label>Nơi đến</label>
          <div className="field-card">
            <MapPin size={18} className="icon-red" />
            <div className="field-content">
              <div className="field-title">Đà Nẵng</div>
            </div>
            <ChevronDown size={16} className="icon-chevron" />
          </div>
        </div>
      </div>

      <div className="row-date-search">
        <div className="field-block field-block-date">
          <label>Ngày đi</label>
          <div className="field-card">
            <Calendar size={18} className="icon-blue" />
            <div className="field-title field-title-inline">Thứ 6, 13/12/2025</div>
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

      <div className="passenger-row">
        <div className="passenger-total">
          <Users size={18} className="icon-muted" />
          <span>1 Hành khách</span>
        </div>
        <div className="passenger-detail">
          <span className="highlight">👤 1 Người lớn</span>
          <span>👶 0 Trẻ em</span>
        </div>
      </div>
    </div>
  )
}
