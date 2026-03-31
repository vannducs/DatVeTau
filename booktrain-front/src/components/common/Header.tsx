import "./header.css"
import { Phone, Languages } from 'lucide-react';

export default function Header(){
    return (
        <header className="header">
            <div className="header-banner">
                <p>Cam kết hoàn 150% nếu nhà xe không cung cấp dịch vụ vận chuyển (*)</p>
            </div>

            <div className="header-container">
                <div className="header-left">
                    <div className="logo">DatVeXe</div>
                </div>

                <nav className="header-nav">
                    <a href="#">Đơn hàng của tôi</a>
                    <a href="#">Mở bán vé trên DatVeXe</a>
                    <a href="#">Trở thành đối tác</a>
                </nav>

                <div className="header-right">
                    <button className="btn-icon" aria-label="Ngôn ngữ">
                        <Languages className="icon" />
                    </button>
                    <button className="btn-hotline">
                        <Phone className="icon-phone" />
                        <span className="btn-text">Hotline 24/7</span>
                    </button>
                    <button className="btn-login">Đăng nhập</button>
                </div>
            </div>
        </header>
    )
}
