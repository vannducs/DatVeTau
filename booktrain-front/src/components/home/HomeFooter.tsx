import "./HomeFooter.css"

const footerLinks = {
  "Về Vexere": [
    "Giới thiệu Vexere",
    "Tin tức",
    "Tuyển dụng",
    "Blog",
  ],
  "Hỗ trợ": [
    "Trung tâm hỗ trợ",
    "Liên hệ",
    "Câu hỏi thường gặp",
    "Chính sách bảo mật",
  ],
  "Dành cho đối tác": [
    "Mở bán vé trên Vexere",
    "Phần mềm quản lý nhà xe",
    "Phần mềm quản lý hàng hoá",
    "Đăng ký treo banner",
  ],
  "Bến xe": [
    "Bến xe Miền Đông",
    "Bến xe Gia Lâm",
    "Bến xe Nước Ngầm",
    "Bến xe Mỹ Đình",
  ],
}

const socialLinks = [
  { name: "Facebook", icon: "📘" },
  { name: "YouTube", icon: "📺" },
  { name: "Instagram", icon: "📷" },
]

export default function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">DatVeXe</div>
            <p className="footer-brand-desc">
              Nền tảng đặt vé xe khách, tàu hỏa hàng đầu Việt Nam. Kết nối hành khách với hơn 2000+ nhà xe chất lượng cao trên toàn quốc.
            </p>
            <div className="footer-social">
              {socialLinks.map((s) => (
                <button key={s.name} className="social-btn" aria-label={s.name}>
                  <span>{s.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-links">
              <h3>{category}</h3>
              <ul>
                {links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© 2026 DatVeXe. Tất cả quyền được bảo lưu.</p>
          <p>Địa chỉ: Tầng 10, Tòa nhà Vexere Tower, 70 Bạch Đằng, Quận 3, TP.HCM</p>
          <p>Hotline: 1900 1234 | Email: support@datvexe.com</p>
        </div>
      </div>
    </footer>
  )
}
