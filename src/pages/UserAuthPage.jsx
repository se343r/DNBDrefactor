import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import './UserAuthPage.css';

export default function UserAuthPage() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('login'); // 'login' or 'register'
  
  // Input fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleModeToggle = (mode) => {
    setActiveMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
    // Reset inputs
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (activeMode === 'register') {
      if (!email.trim()) {
        setErrorMsg('Vui lòng điền địa chỉ email.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Mật khẩu phải chứa ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Xác nhận mật khẩu không khớp.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = activeMode === 'login' ? '/api/users/login' : '/api/users/register';
      const payload = activeMode === 'login' 
        ? { username: username.trim(), password }
        : { username: username.trim(), email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đã có lỗi xảy ra. Vui lòng thử lại!');
      }

      setSuccessMsg(activeMode === 'login' ? 'Đăng nhập thành công! Đang chuyển hướng...' : 'Đăng ký thành công! Đang đăng nhập...');
      
      if (activeMode === 'login') {
        // Save user session
        localStorage.setItem('dnbd_user', JSON.stringify(data.user));
        
        // Dispatch custom event to notify Header of storage update
        window.dispatchEvent(new Event('storage'));
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        // Automatically log in after register
        localStorage.setItem('dnbd_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('storage'));
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page" id="auth-page">
      <Header />

      <main className="auth-page__main">
        <div className="auth-page__inner">
          <button onClick={() => navigate(-1)} className="auth-back-btn" id="auth-back-btn">
            <ArrowLeft size={16} />
            <span>Trở về</span>
          </button>

          <div className="auth-card animate-fadeIn">
            {/* Header decoration */}
            <div className="auth-card__glow"></div>
            
            {/* Tabs */}
            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab-btn ${activeMode === 'login' ? 'auth-tab-btn--active' : ''}`}
                onClick={() => handleModeToggle('login')}
              >
                Đăng nhập
              </button>
              <button 
                type="button"
                className={`auth-tab-btn ${activeMode === 'register' ? 'auth-tab-btn--active' : ''}`}
                onClick={() => handleModeToggle('register')}
              >
                Đăng ký
              </button>
            </div>

            <h2 className="auth-title">
              {activeMode === 'login' ? 'Chào Mừng Trở Lại' : 'Tạo Tài Khoản Mới'}
            </h2>
            <p className="auth-subtitle">
              {activeMode === 'login' 
                ? 'Đăng nhập để trải nghiệm đầy đủ các tính năng của Bắc Đẩu.' 
                : 'Tham gia cùng chúng tôi để cùng khám phá và học hỏi lịch sử Việt Nam.'}
            </p>

            {successMsg && (
              <div className="alert alert--success animate-fadeIn">
                <CheckCircle size={18} />
                <div>{successMsg}</div>
              </div>
            )}

            {errorMsg && (
              <div className="alert alert--error animate-fadeIn">
                <AlertCircle size={18} />
                <div>{errorMsg}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Username Input */}
              <div className="form-group">
                <label htmlFor="auth-username">Tên đăng nhập <span className="required">*</span></label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    id="auth-username"
                    placeholder="Nhập tên tài khoản..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email Input (Register Only) */}
              {activeMode === 'register' && (
                <div className="form-group animate-fadeIn">
                  <label htmlFor="auth-email">Địa chỉ Email <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      id="auth-email"
                      placeholder="vidu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="form-group">
                <label htmlFor="auth-password">Mật khẩu <span className="required">*</span></label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="auth-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Confirm Password (Register Only) */}
              {activeMode === 'register' && (
                <div className="form-group animate-fadeIn">
                  <label htmlFor="auth-confirm-password">Xác nhận mật khẩu <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      id="auth-confirm-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="auth-submit-btn">
                <span>{isLoading ? 'Vui lòng chờ...' : activeMode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="auth-footer-text">
              {activeMode === 'login' ? (
                <p>
                  Chưa có tài khoản?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => handleModeToggle('register')}>
                    Đăng ký ngay
                  </button>
                </p>
              ) : (
                <p>
                  Đã có tài khoản rồi?{' '}
                  <button type="button" className="auth-link-btn" onClick={() => handleModeToggle('login')}>
                    Đăng nhập tại đây
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
