import { MapPin, Calendar, Search, Users, ArrowRightLeft } from "lucide-react"

export default function FormBus() {
  return (
    <div className="form-body">
      {/* Origin & Destination */}
      <div className="row-grid-2">
        <div className="field-block">
          <label>Nơi xuất phát</label>
          <div className="field-card">
            <MapPin size={20} className="icon-blue" />
            <div className="field-content">
              <div className="field-title">Vinh</div>
              <div className="field-sub">Nghệ An</div>
            </div>
          </div>
        </div>

        <div className="field-block">
          <label>Nơi đến</label>
          <div className="field-card">
            <MapPin size={20} className="icon-red" />
            <div className="field-content">
              <div className="field-title">Hà Nội</div>
            </div>
            <button type="button" className="swap-btn" aria-label="Đổi chiều">
              <ArrowRightLeft size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Date & Search */}
      <div className="row-grid-3">
        <div className="field-block">
          <label>Ngày đi</label>
          <div className="field-card">
            <Calendar size={20} className="icon-blue" />
            <div className="field-title">13, 09/12/2025</div>
          </div>
        </div>

        <div className="return-link-wrap">
          <button type="button" className="return-link">+ Thêm ngày về</button>
        </div>

        <button type="button" className="search-btn">
          <Search size={20} />
          <span>Tìm kiếm</span>
        </button>
      </div>

      {/* Passenger Row */}
      <div className="passenger-row-figma">
        <div className="passenger-total">
          <Users size={20} className="icon-muted" />
          <span>1 Hành khách</span>
        </div>
        <div className="passenger-detail">
          <span className="passenger-adult">👤 1 Người lớn</span>
          <span>👶 0 Trẻ em</span>
          <span>🎓 0 Sinh viên</span>
          <span>👴 0 Người cao tuổi</span>
        </div>
      </div>
    </div>
  )
}
