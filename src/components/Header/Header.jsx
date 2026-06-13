import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import './Header.css';

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = () => {
      const stored = localStorage.getItem('dnbd_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    checkUser();

    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dnbd_user');
    setUser(null);
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const navItems = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Danh mục', to: '/danh-muc' },
    { label: 'Nhập nội dung', to: '/nhap-noi-dung' },
  ];

  return (
    <header className="header" id="main-header">
      <div className="header__inner">
        <Link to="/" className="header__logo" id="logo">
          ✨ <span className="logo-main">Bắc Đẩu</span>
        </Link>

        <nav className={`header__nav ${mobileMenuOpen ? 'header__nav--open' : ''}`} id="main-nav">
          {navItems.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className={`header__nav-link ${location.pathname === item.to ? 'header__nav-link--active' : ''}`}
              id={`nav-link-${i}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header__actions">
          {user ? (
            <div className="header__user-menu">
              <span className="header__user-name">Chào, {user.username}</span>
              <button onClick={handleLogout} className="header__logout-btn" id="logout-btn">
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/auth" className="header__login-btn" id="login-btn">
              Đăng nhập
            </Link>
          )}

          <button
            className={`header__hamburger ${mobileMenuOpen ? 'header__hamburger--open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="hamburger-btn"
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}
