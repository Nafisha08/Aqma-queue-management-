import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TokenManagement.css';
import { login } from '../services/auth';
import { setCurrentSession } from '../services/session';
import { Eye, EyeOff } from 'lucide-react';

const UserLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStatus, setLoginStatus] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const navigate = useNavigate();

  // Voice notification using Web Speech API
  const speakNotification = (message) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  // Show popup notification with slide animation
  const showPopup = (message) => {
    setPopupMessage(message);
    setPopupVisible(true);
    setTimeout(() => {
      setPopupVisible(false);
    }, 3500);
  };

  // ✅ FIXED: Complete handleLogin with userType-based routing
  const handleLogin = async (e) => {
    e.preventDefault();

    // Simple validation
    if (!username || !password) {
      setLoginStatus('error');
      showPopup('Please enter username and password');
      speakNotification('Please enter username and password');
      return;
    }

    setLoginStatus(null);
    try {
      console.log('🔐 Login attempt for:', username);

      const data = await login(username, password);

      console.log('✅ Login response:', data);
      console.log('📋 User data:', data.user);

      setCurrentSession(data.user.role, data.token, data.user);
      setLoginStatus('success');
      showPopup(`Welcome ${username}, login successful`);
      speakNotification(`Welcome ${username}, you have logged in successfully`);

      // ✅ CRITICAL: Route based on userType FIRST, then role
      const user = data.user;

      console.log('🔍 Routing logic started');
      console.log('📊 User details:', {
        username: user.username,
        role: user.role,
        userType: user.userType,
        cabinId: user.cabinId,
        cabinName: user.cabinName,
        cabinNumber: user.cabinNumber,
        counterId: user.counterId,
        counterName: user.counterName,
        counterNumber: user.counterNumber
      });

      // Small delay for better UX (let popup show briefly)
      setTimeout(() => {
        // Priority 1: Check userType for cabin/counter users
        if (user.userType && Array.isArray(user.userType)) {
          console.log('🎯 UserType detected:', user.userType);

          // ✅ CRITICAL FIX: Check if user is cabin type
          if (user.userType.includes('cabin') && user.cabinId) {
            console.log('🏠 User is CABIN type');
            console.log('🏠 Cabin Details:', {
              id: user.cabinId,
              name: user.cabinName,
              number: user.cabinNumber
            });
            console.log('🏠 Redirecting to: /cabin-dashboard');
            navigate('/cabin-dashboard');
            return;
          }
          // ✅ CRITICAL FIX: Check if user is counter type
          else if (user.userType.includes('counter') && user.counterId) {
            console.log('🏪 User is COUNTER type');
            console.log('🏪 Counter Details:', {
              id: user.counterId,
              name: user.counterName,
              number: user.counterNumber
            });
            console.log('🏪 Redirecting to: /customer-counter');
            navigate('/customer-counter');
            return;
          }
        }

        // Fallback: Check by cabinId/counterId if userType missing
        if (user.cabinId && !user.counterId) {
          console.log('🏠 Cabin ID found - Redirecting to: /cabin-dashboard');
          navigate('/cabin-dashboard');
          return;
        } else if (user.counterId && !user.cabinId) {
          console.log('🏪 Counter ID found - Redirecting to: /customer-counter');
          navigate('/customer-counter');
          return;
        }

        // Priority 2: Role-based routing for admin/vendor
        console.log('📊 Routing based on role:', user.role);

        if (user.role === 'vendor') {
          console.log('🏢 Vendor role - Redirecting to: /vendor-dashboard');
          navigate('/vendor-dashboard');
        } else if (user.role === 'admin' || user.role === 'superadmin') {
          console.log('👨‍💼 Admin role - Redirecting to: /admin-dashboard');
          navigate('/admin-dashboard');
        } else if (user.role === 'receptionist') {
          console.log('📋 Receptionist role - Redirecting to: /receptionist-dashboard');
          navigate('/receptionist-dashboard');
        } else {
          // Default fallback
          console.log('📊 Default routing - User Dashboard');
          navigate('/dashboard');
        }
      }, 1000); // 1 second delay for UX

    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', error.response?.data);

      setLoginStatus('error');
      showPopup('Invalid username or password');
      speakNotification('Invalid username or password');
    }
  };

  // Floating particles background component
  useEffect(() => {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    // Clear existing particles
    particlesContainer.innerHTML = '';

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 4 + 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 4) + 's';
      particlesContainer.appendChild(particle);
    }
  }, []);

  return (
    <>
      <div className="particles" id="particles"></div>

      <div className="container">
        <div className="success-card" style={{ maxWidth: '400px' }}>
          <h1 className="success-title" style={{ marginBottom: '30px' }}>
            User Login
          </h1>

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <label htmlFor="username" style={{ fontWeight: '600', color: '#333' }}>
              Username / Phone Number:
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username or phone"
              style={{
                width: '100%',
                padding: '10px',
                margin: '8px 0 20px 0',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '1em',
              }}
              autoComplete="username"
            />

            <label htmlFor="password" style={{ fontWeight: '600', color: '#333' }}>
              Password:
            </label>
            <div style={{ position: 'relative', margin: '8px 0 20px 0' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px',
                  paddingRight: '40px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '1em',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              className="new-token-btn"
              style={{ width: '100%', textAlign: 'center' }}
            >
              Login
            </button>
          </form>

          {loginStatus === 'success' && (
            <div
              style={{
                marginTop: '20px',
                color: '#4CAF50',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              ✅ Login successful! Redirecting...
            </div>
          )}
          {loginStatus === 'error' && (
            <div
              style={{
                marginTop: '20px',
                color: '#f44336',
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              ❌ Login failed. Please try again.
            </div>
          )}
        </div>

        {/* Debug info in development mode */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            maxWidth: '400px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <strong>🐛 Debug Info:</strong>
            <div>• Check browser console (F12) for routing logs</div>
            <div>• Cabin users → /cabin-dashboard</div>
            <div>• Counter users → /customer-counter</div>
          </div>
        )}
      </div>

      {/* Popup Notification */}
      <div
        className={`popup-notification ${popupVisible ? 'show' : ''} ${!popupVisible ? 'fade-out' : ''
          }`}
        style={{ right: popupVisible ? '30px' : '-400px' }}
      >
        <div className="popup-header">Login Notification</div>
        <div className="popup-content">{popupMessage}</div>
      </div>
    </>
  );
};

export default UserLogin;