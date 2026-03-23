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

// Private Route Component to protect authenticated routes
const PrivateRoute = ({ children, isLoggedIn }) => {
  return isLoggedIn ? children : <Navigate to="/" replace />
}

// Configure axios base URL only. Headers will be set per-request.
// axios.defaults.baseURL = 'http://localhost:8000'
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

  // Check for existing token on app load and validate it
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
          console.log('Making request to:', axios.defaults.baseURL + '/api/auth/validate-token')

          // Call API to validate token with shorter timeout
          const response = await axios.post('/api/auth/validate-token', {}, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000 // 3 second timeout
          })

          console.log('Token validation successful:', response.data)

          // If valid, set user info and logged in state
          setUsername(user.username)
          setUserRole(user.role)
          setVendorId(user.vendorId)
          setIsLoggedIn(true)
          console.log('User authenticated, redirecting to dashboard')
        } else {
          console.log('No token or user data found, user not authenticated')
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.log('Token validation failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          isNetworkError: !error.response,
          code: error.code
        })

        // Token invalid, expired, or network error - clear storage and set logged out
        clearCurrentSession()
        setIsLoggedIn(false)
        console.log('Token cleared due to validation failure, user logged out')

        // Show error message only if it's not a network error
        if (!error.code?.includes('NETWORK') && !error.code?.includes('ECONNREFUSED') && error.response) {
          console.log('Backend responded with error, showing error message')
        } else {
          console.log('Network error or server not reachable, proceeding to login page')
        }
      } finally {
        console.log('=== TOKEN VALIDATION END ===')
        setLoading(false)
      }
    }

    // Add a fallback timeout to ensure loading never gets stuck
    const fallbackTimeout = setTimeout(() => {
      console.log('Fallback timeout reached, stopping loading')
      setLoading(false)
      setIsLoggedIn(false)
    }, 5000) // 5 second fallback

    validateToken().finally(() => {
      clearTimeout(fallbackTimeout)
    })

    // Cleanup timeout on unmount
    return () => {
      clearTimeout(fallbackTimeout)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    console.log('=== FRONTEND LOGIN ATTEMPT ===')
    console.log('Frontend: Making login request...')
    console.log('API URL:', axios.defaults.baseURL + '/api/auth/login')
    console.log('Request data:', { username, password })

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      })

      console.log('Frontend: Response received:', response.data)
      console.log('Frontend: Response status:', response.status)

      // Validate response structure
      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid response structure from server')
      }

      // ✅ Backend NEW response format with userType, cabin, and counter info
      setSuccess(response.data.message)
      setIsLoggedIn(true)
      setUserRole(response.data.user.role)

      // Set vendorId if user is a vendor  
      if (response.data.user.role === 'vendor' && response.data.user.vendorId) {
        setVendorId(response.data.user.vendorId)
      }

      // ✅ CRITICAL: Store complete user object with cabin/counter info
      setCurrentSession(response.data.user.role, response.data.token, response.data.user)

      console.log('Frontend: Login successful, session stored')
      console.log('Frontend: User data stored:', response.data.user)

    } catch (error) {
      console.error('Frontend: Login error:', error)
      console.error('Frontend: Error response:', error.response)
      console.error('Frontend: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })

      // Enhanced error handling
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please try again later.')
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Request timeout. Server took too long to respond. Please try again.')
      } else if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          `Server error (${error.response.status})`
        setError(errorMessage)
      } else {
        // Network or other error
        setError('Login failed. Please check your connection and try again.')
      }
    }
  }

  // Logout function
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
      // Don't show error to user, just proceed with logout
    } finally {
      // Clear local storage and state regardless of API call result
      clearCurrentSession()
      setIsLoggedIn(false)
      setUsername('')
      setPassword('')
      setUserRole('')
      setVendorId(null)
    }
  }

  // Enhanced loading screen
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container" style={{
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

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Login Route - redirect to dashboard if already logged in */}
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

                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}
                </div>
              </div>
            )
          } />

          {/* Protected Dashboard Route */}
          <Route path="/dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              {userRole === 'superadmin' ? (
                <SuperAdminDashboard
                  username={username}
                  onLogout={handleLogout}
                />
              ) : userRole === 'vendor' ? (
                <VendorDashboard
                  username={username}
                  vendorId={vendorId}
                  onLogout={handleLogout}
                />
              ) : userRole === 'user' ? (
                <CustomerDashboard
                  username={username}
                  onLogout={handleLogout}
                />
              ) : (
                <div className="dashboard">
                  <h1>Welcome to the {userRole.toUpperCase()} Dashboard</h1>
                  <p>You have successfully logged in as {username}!</p>
                  <button
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </PrivateRoute>
          } />

          {/* ✅ Cabin Dashboard Route - NEW */}
          <Route path="/cabin-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <CabinDashboard
                activeCabin={getCurrentSession().user?.cabinNumber || 1}
                userProfile={getCurrentSession().user}
              />
            </PrivateRoute>
          } />

          {/* ✅ Counter Dashboard Route - NEW */}
          <Route path="/customer-counter" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <CustomerCounterDashboard
                activeCounter={getCurrentSession().user?.counterNumber || 1}
                userProfile={getCurrentSession().user}
              />
            </PrivateRoute>
          } />

          {/* ✅ Vendor Dashboard Route - EXPLICIT */}
          <Route path="/vendor-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <VendorDashboard
                username={username}
                vendorId={vendorId}
                onLogout={handleLogout}
              />
            </PrivateRoute>
          } />

          {/* ✅ Admin Dashboard Route - EXPLICIT */}
          <Route path="/admin-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <SuperAdminDashboard
                username={username}
                onLogout={handleLogout}
              />
            </PrivateRoute>
          } />

          {/* ✅ Receptionist Dashboard Route - NEW */}
          <Route path="/receptionist-dashboard" element={
            <PrivateRoute isLoggedIn={isLoggedIn}>
              <div className="dashboard">
                <h1>Receptionist Dashboard</h1>
                <p>Welcome {username}!</p>
                <button className="logout-button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </PrivateRoute>
          } />

          {/* Other protected routes */}
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