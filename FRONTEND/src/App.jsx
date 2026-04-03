import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import axios from 'axios'
import { setCurrentSession, getCurrentSession, clearCurrentSession } from './services/session'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import UserDashboard from './components/UserDashboard'
import VendorDashboard from './components/VendorDashboard'
import CustomerDashboard from './components/CustomerDashboard'
import CabinDashboard from './components/CabinDashboard'
import CustomerCounterDashboard from './components/CustomerCounterDashboard'
import VendorProfile from './components/VendorProfile'
import TokenForm from './components/TokenForm'
import TokenDisplay from './components/TokenDisplay'
import TokenManagement from './components/TokenManagement'
import TokenSuccess from './components/TokenSuccess'
import { Eye, EyeOff } from 'lucide-react'

const PrivateRoute = ({ children, isLoggedIn }) => {
  return isLoggedIn ? children : <Navigate to="/" replace />
}

axios.defaults.baseURL = import.meta.env.VITE_API_URL

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [vendorId, setVendorId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const validateToken = async () => {
      console.log('=== TOKEN VALIDATION START ===')
      try {
        const { token, user } = getCurrentSession()
        console.log('Token validation check:', {
          hasToken: !!token,
          hasUserData: !!user,
          tokenPreview: token ? token.substring(0, 20) + '...' : null
        })
        if (token && user) {
          console.log('Validating token with backend...')
          const response = await axios.post('/api/auth/validate-token', {}, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000
          })
          console.log('Token validation successful:', response.data)
          setUsername(user.username)
          setUserRole(user.role)
          setVendorId(user.vendorId)
          setIsLoggedIn(true)
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.log('Token validation failed:', error.message)
        clearCurrentSession()
        setIsLoggedIn(false)
      } finally {
        console.log('=== TOKEN VALIDATION END ===')
        setLoading(false)
      }
    }

    const fallbackTimeout = setTimeout(() => {
      setLoading(false)
      setIsLoggedIn(false)
    }, 5000)

    validateToken().finally(() => {
      clearTimeout(fallbackTimeout)
    })

    return () => {
      clearTimeout(fallbackTimeout)
    }
  }, [])

  // ✅ Demo credentials fill function
  const fillDemo = (user, pass) => {
    setUsername(user)
    setPassword(pass)
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
        timeout: 10000
      })

      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response structure from server')
      }

      setSuccess(response.data.message)
      setIsLoggedIn(true)
      setUserRole(response.data.user.role)

      if (response.data.user.role === 'vendor' && response.data.user.vendorId) {
        setVendorId(response.data.user.vendorId)
      }

      setCurrentSession(response.data.user.role, response.data.token, response.data.user)

    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please try again later.')
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Request timeout. Server took too long to respond. Please try again.')
      } else if (error.response) {
        const errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          `Server error (${error.response.status})`
        setError(errorMessage)
      } else {
        setError('Login failed. Please check your connection and try again.')
      }
    }
  }

  const handleLogout = async () => {
    try {
      const { token } = getCurrentSession()
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearCurrentSession()
      setIsLoggedIn(false)
      setUsername('')
      setPassword('')
      setUserRole('')
      setVendorId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#f5f5f5'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0d7beaff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <h2 style={{ margin: '0 0 0.5rem', color: '#333' }}>Loading...</h2>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
              Checking authentication status
            </p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Demo roles data
  const demoRoles = [
    { label: 'Vendor', user: '0000000001', pass: '12345', color: '#185FA5', bg: '#E6F1FB', border: '#B5D4F4', topBorder: '#378ADD' },
    { label: 'Counter', user: '0000000002', pass: '12345', color: '#0F6E56', bg: '#E1F5EE', border: '#9FE1CB', topBorder: '#1D9E75' },
    { label: 'Cabin', user: '0000000003', pass: '12345', color: '#534AB7', bg: '#EEEDFE', border: '#CECBF6', topBorder: '#7F77DD' },
  ]

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={
            isLoggedIn ? <Navigate to="/dashboard" replace /> : (
              <div className="login-container">
                <h1>Queue Management System</h1>

                <div className="login-box">
                  <h2>Login to System</h2>

                  <form onSubmit={handleLogin}>
                    <div className="input-group">
                      <input
                        type="text"
                        placeholder="User Name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '12px',
                            paddingRight: '40px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
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
                    </div>

                    <button type="submit" className="login-button">
                      SIGN IN
                    </button>
                  </form>

                  {/* ✅ Demo Credentials Section */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                    <p style={{
                      textAlign: 'center',
                      fontSize: '18px',
                      color: 'black',
                      margin: '0 0 4px',
                      letterSpacing: '0.3px'
                    }}>
                      Demo login 
                    </p>
                    <p style={{
                      textAlign: 'center',
                      fontSize: '15px',
                      color: 'black',
                      margin: '0 0 12px',
                    }}>
                      Password for all users: <strong style={{ color: '#888' }}>12345</strong>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {demoRoles.map(({ label, user, pass, color, bg, border, topBorder }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => fillDemo(user, pass)}
                          style={{
                            padding: '10px 6px',
                            background: bg,
                            color: color,
                            border: `1px solid ${border}`,
                            borderTop: `3px solid ${topBorder}`,
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'opacity 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <span style={{ fontSize: '13px' }}>{label}</span>
                          <span style={{ fontSize: '10px', color: color, opacity: 0.7, fontFamily: 'monospace' }}>
                            {user}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* ✅ End Demo Section */}


                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}
                </div>
              </div>
            )
          } />

          <Route path="/dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              {userRole === 'superadmin' ? (
                <SuperAdminDashboard username={username} onLogout={handleLogout} />
              ) : userRole === 'vendor' ? (
                <VendorDashboard username={username} vendorId={vendorId} onLogout={handleLogout} />
              ) : userRole === 'user' ? (
                <CustomerDashboard username={username} onLogout={handleLogout} />
              ) : (
                <div className="dashboard">
                  <h1>Welcome to the {userRole.toUpperCase()} Dashboard</h1>
                  <p>You have successfully logged in as {username}!</p>
                  <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </PrivateRoute>
          } />

          <Route path="/cabin-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <CabinDashboard
                activeCabin={getCurrentSession().user?.cabinNumber || 1}
                userProfile={getCurrentSession().user}
              />
            </PrivateRoute>
          } />

          <Route path="/customer-counter" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <CustomerCounterDashboard
                activeCounter={getCurrentSession().user?.counterNumber || 1}
                userProfile={getCurrentSession().user}
              />
            </PrivateRoute>
          } />

          <Route path="/vendor-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <VendorDashboard username={username} vendorId={vendorId} onLogout={handleLogout} />
            </PrivateRoute>
          } />

          <Route path="/admin-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <SuperAdminDashboard username={username} onLogout={handleLogout} />
            </PrivateRoute>
          } />

          <Route path="/receptionist-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <div className="dashboard">
                <h1>Receptionist Dashboard</h1>
                <p>Welcome {username}!</p>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
              </div>
            </PrivateRoute>
          } />

          <Route path="/token-form" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TokenForm />
            </PrivateRoute>
          } />
          <Route path="/token-display/:tokenId" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TokenDisplay />
            </PrivateRoute>
          } />
          <Route path="/token-success/:tokenId" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TokenSuccess />
            </PrivateRoute>
          } />
          <Route path="/token-management" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <TokenManagement />
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App