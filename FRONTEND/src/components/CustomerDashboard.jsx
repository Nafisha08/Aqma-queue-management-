import { useState, useEffect } from 'react'
import '../styles/Dashboard.css'
import '../styles/TokenManagement.css'
import '../styles/CustomerCounterDashboard.css'
import '../styles/ItemSelection.css'
import axios from 'axios'
import ActiveTokensTable from './ActiveTokensTable'
import TokenHistory from './TokenHistory'
import CustomerCounterDashboard from './CustomerCounterDashboard'
import CabinDashboard from './CabinDashboard'
import CashReport from './CashReport'
import UserProfile from './UserProfile'
import { getCurrentSession } from '../services/session'
import { validatePhone, validateAmount } from '../utils/validation'

function CustomerDashboard({ username, onLogout }) {
  const [activeSection, setActiveSection] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [currentToken, setCurrentToken] = useState(null)
  const vendorId = 1
  const [activeCounter, setActiveCounter] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const handleSectionChange = (section) => {
    setActiveSection(section)
    closeMobileMenu()
  }

  let userRole = userProfile?.role || userProfile?.userType || null

  if (userRole === 'user' && userProfile) {
    if (userProfile.counterName && userProfile.counterId) {
      userRole = 'counter'
    } else if (userProfile.cabinName && userProfile.cabinId) {
      userRole = 'cabin'
    }
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { token } = getCurrentSession()
        if (!token) {
          console.error('No authentication token found')
          setIsLoadingProfile(false)
          return
        }

        const response = await axios.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data.success && response.data.user) {
          const user = response.data.user
          setUserProfile(user)
          const counterNumber = parseInt(user.counterName?.match(/(\d+)/)?.[1]) || null
          setActiveCounter(counterNumber)

          let detectedRole = user.role
          if (user.role === 'user') {
            if (user.counterName && user.counterId) {
              detectedRole = 'counter'
            } else if (user.cabinName && user.cabinId) {
              detectedRole = 'cabin'
            }
          }

          if (detectedRole === 'cabin') {
            setActiveSection('cabin')
          } else if (detectedRole === 'counter') {
            setActiveSection('counter')
          } else {
            setActiveSection('cash')
          }

          console.log('✅ User profile loaded:', {
            counter: user.counterName,
            counterNumber: counterNumber,
            cabin: user.cabinName,
            originalRole: user.role,
            detectedRole: detectedRole,
            defaultSection: detectedRole === 'cabin' ? 'cabin' : detectedRole === 'counter' ? 'counter' : 'cash'
          })
        }
      } catch (error) {
        console.error('❌ Error fetching user profile:', error)
        setActiveSection('cash')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [])

  if (isLoadingProfile) {
    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div className="loading-spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading user profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-nav-overlay active" 
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Hamburger Menu Button */}
      <button className="hamburger-menu" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="dashboard-header">
          <div>
            <h2>CUSTOMER</h2>
            <p>{username}</p>
            {userProfile && (
              <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px' }}>
                <div style={{ color: '#0369a1', fontWeight: '600' }}>
                  📍 {userProfile.counterName || userProfile.cabinName || 'No Assignment'}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="dashboard-nav">
          {userRole === 'cabin' && (
            <button
              className={`nav-button ${activeSection === 'cabin' ? 'active' : ''}`}
              onClick={() => handleSectionChange('cabin')}
            >
              <span>🏠</span> Cabin Dashboard
            </button>
          )}

          {userRole === 'counter' && (
            <button
              className={`nav-button ${activeSection === 'counter' ? 'active' : ''}`}
              onClick={() => handleSectionChange('counter')}
            >
              <span>🏪</span> Counter Dashboard
            </button>
          )}

          {userRole === 'counter' && (
            <button
              className={`nav-button ${activeSection === 'token' ? 'active' : ''}`}
              onClick={() => handleSectionChange('token')}
            >
              <span>🎫</span> Token System
            </button>
          )}

          {userRole === 'counter' && (
            <button
              className={`nav-button ${activeSection === 'history' ? 'active' : ''}`}
              onClick={() => handleSectionChange('history')}
            >
              <span>📜</span> Token History
            </button>
          )}

          <button
            className={`nav-button ${activeSection === 'active' ? 'active' : ''}`}
            onClick={() => handleSectionChange('active')}
          >
            <span>✅</span> Active Tokens
          </button>

          {userRole !== 'cabin' && (
            <button
              className={`nav-button ${activeSection === 'cash' ? 'active' : ''}`}
              onClick={() => handleSectionChange('cash')}
            >
              <span>💰</span> Cash Report
            </button>
          )}

          <button
            className={`nav-button ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => handleSectionChange('profile')}
          >
            <span>👤</span> User Profile
          </button>

          {!userRole && (
            <div style={{ padding: '12px', backgroundColor: '#fee', borderRadius: '6px', marginTop: '8px', fontSize: '12px', color: '#c00' }}>
              ⚠️ No role detected! Check backend response.
            </div>
          )}
        </nav>

        <button className="logout-button" onClick={onLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeSection === 'cabin' && (
          <CabinDashboard activeCabin={1} userProfile={userProfile} />
        )}

        {activeSection === 'counter' && (
          <CustomerCounterDashboard activeCounter={activeCounter} userProfile={userProfile} />
        )}

        {activeSection === 'token' && (
          <div className="token-form-section">
            <UserTokenForm
              vendorId={vendorId}
              counterId={activeCounter}
              userProfile={userProfile}
              onTokenGenerated={(token) => {
                setCurrentToken(token);
                setShowPopup(true);
              }}
            />
          </div>
        )}

        {activeSection === 'history' && (
          <div className="token-history-section">
            <TokenHistory vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'active' && (
          <div className="active-tokens-section">
            <ActiveTokensTable
              vendorId={vendorId}
              counterId={activeCounter}
              userProfile={userProfile}
              userRole={userRole}
            />
          </div>
        )}

        {activeSection === 'cash' && (
          <div className="cash-report-section">
            <CashReport vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="user-profile-section">
            <UserProfile username={username} />
          </div>
        )}

        {showPopup && currentToken && (
          <div className="token-popup">
            <div className="popup-content">
              <h2>🎉 Token Generated Successfully!</h2>
              <div className="token-display">
                <div className="token-id">{currentToken.dailyTokenId || currentToken.tokenId}</div>
                <div className="token-status active">ACTIVE</div>
              </div>
              <div className="token-details">
                <p><strong>Customer:</strong><span>{currentToken.customerName}</span></p>
                <p><strong>Mobile:</strong><span>{currentToken.mobileNo}</span></p>
                <p><strong>Counter:</strong><span>{currentToken.counterName || currentToken.counterNumber}</span></p>
                <p><strong>Items:</strong><span>{Array.isArray(currentToken.item) ? currentToken.item.join(', ') : currentToken.item}</span></p>
                <p><strong>Payment:</strong><span>{currentToken.paymentMode}</span></p>
                <p><strong>Amount:</strong><span>₹{currentToken.amount}</span></p>
                {currentToken.cabin && <p><strong>Cabin:</strong><span>{currentToken.cabin.replace('-', ' ')}</span></p>}
                <p><strong>Status:</strong><span>{currentToken.status?.toUpperCase()}</span></p>
              </div>
              <button onClick={() => setShowPopup(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UserTokenForm({ vendorId, counterId, userProfile, onTokenGenerated }) {
  const [formData, setFormData] = useState({
    customerName: '',
    mobileNo: '',
    counterNumber: counterId || 1,
    selectedItems: [],
    paymentMode: '',
    amount: '',
    cabin: userProfile?.cabinName || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [errors, setErrors] = useState({ mobileNo: '', amount: '' })
  const [baseCollectionStats, setBaseCollectionStats] = useState({
    counterName: '',
    counterNumber: '',
    totalCollection: '0.00',
    cashCollection: '0.00',
    onlineCollection: '0.00',
    completedTokens: 0
  })
  const [collectionStats, setCollectionStats] = useState({
    counterName: '',
    counterNumber: '',
    totalCollection: '0.00',
    cashCollection: '0.00',
    onlineCollection: '0.00',
    completedTokens: 0
  })
  const [userCounter, setUserCounter] = useState(null)
  const [availableItems, setAvailableItems] = useState([])
  const [selectedCounterId, setSelectedCounterId] = useState(null)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [availableCabins, setAvailableCabins] = useState([])

  useEffect(() => {
    if (userProfile && userProfile.cabinName) {
      setFormData(prev => ({ ...prev, cabin: userProfile.cabinName }))
    }
  }, [userProfile])

  useEffect(() => {
    let isMounted = true
    const fetchAllData = async () => {
      setIsDataLoading(true)
      try {
        const { token } = getCurrentSession()
        if (!token) {
          if (isMounted) {
            setError('Session not found. Please login again.')
            setIsDataLoading(false)
          }
          return
        }

        if (userProfile && userProfile.counterId && userProfile.counterName) {
          const counterNumber = parseInt(userProfile.counterName.match(/(\d+)/)?.[1]) || 1
          setUserCounter({
            id: userProfile.counterId,
            name: userProfile.counterName,
            counterNumber: counterNumber
          })
          setSelectedCounterId(userProfile.counterId)
          setFormData(prev => ({ ...prev, counterNumber: counterNumber }))
        }

        const [cabinsRes, itemsRes, statsRes] = await Promise.all([
          axios.get('/api/cabins', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/items', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/tokens/collection-stats', { headers: { Authorization: `Bearer ${token}` } })
        ])

        if (!isMounted) return

        if (cabinsRes.data.success && cabinsRes.data.cabins) {
          const cabins = cabinsRes.data.cabins
            .filter(cabin => cabin.isActive)
            .map(cabin => ({ value: cabin.name, label: cabin.name }))
          setAvailableCabins(cabins)
        }

        if (itemsRes.data.success && itemsRes.data.items) {
          setAvailableItems(itemsRes.data.items)
        }

        if (statsRes.data.success && statsRes.data.data) {
          setCollectionStats(statsRes.data.data)
          setBaseCollectionStats(statsRes.data.data)
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to load data: ' + (error.response?.data?.message || error.message))
        }
      } finally {
        if (isMounted) setIsDataLoading(false)
      }
    }
    fetchAllData()
    return () => { isMounted = false }
  }, [userProfile])

  useEffect(() => {
    if (formData.paymentMode && formData.amount) {
      const amount = parseFloat(formData.amount) || 0
      const baseTotal = parseFloat(baseCollectionStats.totalCollection) || 0
      const baseCash = parseFloat(baseCollectionStats.cashCollection) || 0
      const baseOnline = parseFloat(baseCollectionStats.onlineCollection) || 0
      let newTotal = baseTotal, newCash = baseCash, newOnline = baseOnline

      if (formData.paymentMode === 'cash') {
        newTotal += amount
        newCash += amount
      } else if (formData.paymentMode === 'card' || formData.paymentMode === 'upi') {
        newTotal += amount
        newOnline += amount
      }

      setCollectionStats({
        ...baseCollectionStats,
        totalCollection: newTotal.toFixed(2),
        cashCollection: newCash.toFixed(2),
        onlineCollection: newOnline.toFixed(2)
      })
    } else {
      setCollectionStats(baseCollectionStats)
    }
  }, [formData.paymentMode, formData.amount, baseCollectionStats])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === 'mobileNo') setErrors(prev => ({ ...prev, mobileNo: validatePhone(value) }))
    if (name === 'amount') setErrors(prev => ({ ...prev, amount: validateAmount(value) }))
  }

  const handleNumericKeyPress = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (e.ctrlKey || e.metaKey) {
      if (['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) return
    }
    if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key)) e.preventDefault()
  }

  const handleNumericPaste = (e) => {
    e.preventDefault()
    const numericOnly = e.clipboardData.getData('text').replace(/\D/g, '')
    const target = e.target
    const newValue = target.value.substring(0, target.selectionStart) + numericOnly + target.value.substring(target.selectionEnd)
    setFormData(prev => ({ ...prev, mobileNo: newValue }))
    setErrors(prev => ({ ...prev, mobileNo: validatePhone(newValue) }))
  }

  const handleItemQuantityChange = (itemId, quantity) => {
    const item = availableItems.find(i => i.id === itemId)
    if (!item) return

    setFormData(prev => {
      const existingItemIndex = prev.selectedItems.findIndex(si => si.itemId === itemId)
      let newSelectedItems

      if (quantity > 0) {
        const itemData = { itemId: item.id, name: item.name, price: 0, quantity: quantity }
        if (existingItemIndex >= 0) {
          newSelectedItems = [...prev.selectedItems]
          newSelectedItems[existingItemIndex] = itemData
        } else {
          newSelectedItems = [...prev.selectedItems, itemData]
        }
      } else {
        newSelectedItems = prev.selectedItems.filter(si => si.itemId !== itemId)
      }

      return { ...prev, selectedItems: newSelectedItems }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!Array.isArray(formData.selectedItems) || formData.selectedItems.length === 0) {
      setError('Please select at least one item.')
      return
    }

    const phoneError = validatePhone(formData.mobileNo)
    if (phoneError) {
      setErrors(prev => ({ ...prev, mobileNo: phoneError }))
      return
    }

    const amountError = validateAmount(formData.amount)
    if (amountError) {
      setErrors(prev => ({ ...prev, amount: amountError }))
      return
    }

    if (!formData.cabin) {
      setError('Please select a cabin.')
      return
    }

    if (!selectedCounterId || !userCounter) {
      setError('Please select a counter for token generation.')
      return
    }

    setIsLoading(true)

    try {
      const { token } = getCurrentSession()
      if (!token) throw new Error('Authentication token not found. Please login again.')

      const counterNumber = parseInt(userCounter.counterNumber) || 1
      const itemNames = formData.selectedItems.map(si => `${si.name} (x${si.quantity})`)

      const requestData = {
        customerName: formData.customerName.trim(),
        mobileNo: formData.mobileNo.trim(),
        counterNumber: counterNumber,
        item: itemNames,
        paymentMode: formData.paymentMode,
        amount: parseFloat(formData.amount),
        cabin: formData.cabin
      }

      const response = await axios.post('/api/tokens', requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const newToken = response.data.token
      setSuccess('Token generated successfully!')
      if (onTokenGenerated) onTokenGenerated(newToken)

      setFormData({
        customerName: '',
        mobileNo: '',
        counterNumber: userCounter.counterNumber,
        selectedItems: [],
        paymentMode: '',
        amount: '',
        cabin: ''
      })

      const statsRes = await axios.get('/api/tokens/collection-stats', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (statsRes.data.success && statsRes.data.data) {
        setCollectionStats(statsRes.data.data)
        setBaseCollectionStats(statsRes.data.data)
      }

      setIsLoading(false)
    } catch (error) {
      let errorMessage = 'Failed to generate token. Please try again.'
      if (error.response?.status === 400) errorMessage = error.response.data?.message || 'Invalid request data.'
      else if (error.response?.status === 401) errorMessage = 'Authentication failed. Please login again.'
      else if (error.response?.data?.message) errorMessage = error.response.data.message
      else if (error.message) errorMessage = error.message

      setError(errorMessage)
      setIsLoading(false)
    }
  }

  if (isDataLoading) {
    return (
      <div className="user-token-form">
        <div className="loading-message" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading-spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-token-form">
      <div className="token-form-header">
        <div className="header-left">
          <div className="counter-badge">
            <div className="counter-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </div>
            <div className="counter-details">
              <span className="counter-label">Counter</span>
              <span className="counter-number">{userCounter?.name || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="collection-cards">
            <div className="collection-card total">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <span className="card-label">Total Collection</span>
                <span className="card-value">₹{collectionStats.totalCollection}</span>
              </div>
            </div>
            <div className="collection-card cash">
              <div className="card-icon">💵</div>
              <div className="card-content">
                <span className="card-label">Cash</span>
                <span className="card-value">₹{collectionStats.cashCollection}</span>
              </div>
            </div>
            <div className="collection-card online">
              <div className="card-icon">📱</div>
              <div className="card-content">
                <span className="card-label">Online</span>
                <span className="card-value">₹{collectionStats.onlineCollection}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Generate New Token</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customerName">Customer Name *</label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleInputChange}
            placeholder="Enter customer name"
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="mobileNo">Mobile No *</label>
          <input
            type="tel"
            id="mobileNo"
            name="mobileNo"
            value={formData.mobileNo}
            onChange={handleInputChange}
            onKeyDown={handleNumericKeyPress}
            onPaste={handleNumericPaste}
            placeholder="Enter 10-digit mobile number"
            required
            disabled={isLoading}
            maxLength="15"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            className={errors.mobileNo ? 'error' : ''}
          />
          {errors.mobileNo && <span className="error-text">{errors.mobileNo}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cabin">Cabin *</label>
          <select
            id="cabin"
            name="cabin"
            value={formData.cabin}
            onChange={handleInputChange}
            disabled={isLoading || availableCabins.length === 0}
            required
          >
            <option value="">Select cabin</option>
            {availableCabins.map((cabin) => (
              <option key={cabin.value} value={cabin.value}>{cabin.label}</option>
            ))}
          </select>
          {availableCabins.length === 0 && (
            <small style={{
              display: 'block',
              marginTop: '6px',
              color: '#dc3545',
              fontWeight: '500'
            }}>
              ⚠️ No cabins available.
            </small>
          )}
        </div>

        <div className="form-group">
          <label>Assigned Counter *</label>
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #ced4da',
            backgroundColor: '#f8f9fa',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {userCounter ? userCounter.name : 'No counter assigned'}
          </div>
        </div>

        <div className="form-group">
          <label>Service/Items *</label>
          <div className="item-selection-container">
            <div className="item-list">
              <h4>Available Items</h4>
              {availableItems.length === 0 ? (
                <p>No items available</p>
              ) : (
                availableItems.map((item) => {
                  const selectedItem = formData.selectedItems.find(si => si.itemId === item.id)
                  const quantity = selectedItem ? selectedItem.quantity : 0
                  return (
                    <div key={item.id} className="item-row">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                      </div>
                      <div className="quantity-controls">
                        <button
                          type="button"
                          className="quantity-btn"
                          onClick={() => handleItemQuantityChange(item.id, Math.max(0, quantity - 1))}
                          disabled={quantity === 0}
                        >
                          -
                        </button>
                        <span className="quantity-display">{quantity}</span>
                        <button
                          type="button"
                          className="quantity-btn"
                          onClick={() => handleItemQuantityChange(item.id, quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="selected-items-summary">
              <h4>Selected Items</h4>
              {formData.selectedItems.length === 0 ? (
                <p>No items selected</p>
              ) : (
                <div className="selected-items-list">
                  {formData.selectedItems.map((selectedItem) => (
                    <div key={selectedItem.itemId} className="selected-item">
                      <span>{selectedItem.name} x{selectedItem.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="paymentMode">Payment Mode *</label>
          <select
            id="paymentMode"
            name="paymentMode"
            value={formData.paymentMode}
            onChange={handleInputChange}
            required
            disabled={isLoading}
          >
            <option value="">Select Payment Mode</option>
            <option value="cash">Cash</option>
            <option value="card">Credit Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount (₹) *</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="Enter amount"
            min="0.01"
            step="0.01"
            required
            disabled={isLoading}
            className={errors.amount ? 'error' : ''}
          />
          {errors.amount && <span className="error-text">{errors.amount}</span>}
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading || !selectedCounterId || availableCabins.length === 0}
        >
          {isLoading ? 'Generating Token...' : 'Generate Token'}
        </button>
        {!selectedCounterId && <small style={{ display: 'block', textAlign: 'center', color: '#ef4444', marginTop: '8px' }}>⚠️ Please select a counter.</small>}
      </form>
    </div>
  )
}

export default CustomerDashboard