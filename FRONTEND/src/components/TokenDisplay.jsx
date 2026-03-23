

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/TokenDisplay.css'

function TokenDisplay() {
  const { tokenId } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    if (tokenId) {
      fetchTokenDetails()
    } else {
      // If no tokenId in URL, show mock token for demo
      setToken({
        id: `T${Date.now().toString().slice(-6)}`,
        customerName: 'Demo Customer',
        mobileNo: '9876543210',
        counterId: '1',
        item: 'Account Opening',
        paymentMode: 'Cash',
        status: 'active',
        type: 'green',
        estimatedWaitTime: Math.floor(Math.random() * 15) + 5,
        createdAt: new Date().toISOString()
      })
    }
  }, [tokenId])

  const fetchTokenDetails = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Enhanced mock API response
      const mockToken = {
        id: tokenId,
        customerName: 'Rahul sharma',
        mobileNo: '9876543210',
        counterId: '1',
        item: 'Account Opening',
        paymentMode: 'Cash',
        status: 'active',
        type: 'green',
        estimatedWaitTime: Math.floor(Math.random() * 15) + 5,
        queuePosition: Math.floor(Math.random() * 5) + 1,
        createdAt: new Date().toISOString()
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      setToken(mockToken)

      // Play success sound
      playNotificationSound()

      /* Real API call would be:
      const response = await axios.get(`/api/tokens/${tokenId}`)
      setToken(response.data)
      */
    } catch (error) {
      console.error('Error fetching token:', error)
      setError('Token not found or expired. Please check your token ID.')
    } finally {
      setIsLoading(false)
    }
  }

  const playNotificationSound = () => {
    try {
      const audio = new Audio()
      audio.src = 'https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'
      audio.volume = 0.5
      audio.play().catch(() => { }) // Handle audio errors silently
    } catch (error) {
      console.log('Audio not supported')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleNewToken = () => {
    navigate('/token-form')
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const handleRefreshToken = () => {
    if (tokenId) {
      fetchTokenDetails()
    }
  }

  const FloatingParticles = () => (
    <div className="particles-container">
      {[...Array(15)].map((_, index) => (
        <div
          key={index}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${4 + Math.random() * 6}s`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: Math.random() * 0.6 + 0.4,
            transform: `scale(${Math.random() * 0.8 + 0.5})`
          }}
        />
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="token-display-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>🔄 Loading Token Details...</h3>
          <p>Please wait while we fetch your token information</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <style jsx>{`
          .loading-container {
            text-align: center;
            padding: 3rem;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 2rem auto;
          }

          .loading-spinner {
            width: 60px;
            height: 60px;
            border: 6px solid #f3f3f3;
            border-top: 6px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          .loading-dots {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 1rem;
          }

          .loading-dots span {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: bounce 1.4s ease-in-out infinite both;
          }

          .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
          .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  if (error && !token) {
    return (
      <div className="token-display-page">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>Token Not Found</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleNewToken} className="primary-btn">
              ➕ Generate New Token
            </button>
            <button onClick={handleBackToDashboard} className="secondary-btn">
              🏠 Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="token-display-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>No Token Data</h2>
          <p>Unable to display token information</p>
          <div className="error-actions">
            <button onClick={handleNewToken} className="primary-btn">
              ➕ Generate New Token
            </button>
            <button onClick={handleBackToDashboard} className="secondary-btn">
              🏠 Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="token-display-page">
      <FloatingParticles />

      {/* Header with current time */}
      <div className="page-header">
        <div className="header-content">
          <h1>🎫 Token Display</h1>
          <div className="current-time">
            <span className="time-label">Current Time:</span>
            <span className="time-value">
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="token-display-container">
        <div className="success-header">
          <div className="success-animation">
            <div className="checkmark">✓</div>
          </div>
          <h1 className="success-title">Token Generated Successfully!</h1>
          <p className="success-subtitle">Your token is now active and ready to use</p>
        </div>

        <div className="token-card">
          <div className="token-card-header">
            <div className="token-type-indicator">
              <div className={`token-dot ${token.status}`}></div>
              <span className="token-type-text">
                {token.status === 'active' ? '🟢 ACTIVE TOKEN' : '🔴 INACTIVE TOKEN'}
              </span>
            </div>
            <button onClick={handleRefreshToken} className="refresh-btn" title="Refresh Token Status">
              🔄 Refresh
            </button>
          </div>

          <div className="token-main-display">
            <div className="token-id-section">
              <span className="token-label">TOKEN ID</span>
              <h2 className="token-number">{token.id}</h2>
            </div>

            <div className={`token-status-badge ${token.status}`}>
              {token.status === 'active' ? (
                <span>🟢 ACTIVE</span>
              ) : (
                <span>🔴 INACTIVE</span>
              )}
            </div>
          </div>

          {/* Queue Information */}
          {token.status === 'active' && (
            <div className="queue-info">
              <div className="queue-item">
                <span className="queue-label">Queue Position:</span>
                <span className="queue-value">#{token.queuePosition || 'N/A'}</span>
              </div>
              <div className="queue-item">
                <span className="queue-label">Estimated Wait:</span>
                <span className="queue-value">{token.estimatedWaitTime || 'N/A'} min</span>
              </div>
            </div>
          )}

          <div className="counter-notification">
            <div className="counter-icon">📍</div>
            <div className="counter-text">
              <h3>Please proceed to Counter {token.counterId}</h3>
              <p>Wait for your token number to be announced</p>
              {token.status === 'active' && (
                <div className="waiting-tip">
                  <small>💡 Tip: Stay within hearing range of the announcement system</small>
                </div>
              )}
            </div>
          </div>

          <div className="token-details-section">
            <h4 className="details-title">📋 Token Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">👤 Customer Name</span>
                <span className="detail-value">{token.customerName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">📱 Mobile Number</span>
                <span className="detail-value">{token.mobileNo}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🔧 Service</span>
                <span className="detail-value">{token.item}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">💳 Payment Mode</span>
                <span className="detail-value">{token.paymentMode}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">⏰ Generated At</span>
                <span className="detail-value">
                  {new Date(token.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="instructions-section">
            <h4 className="instructions-title">📌 Important Instructions</h4>
            <ul className="instructions-list">
              <li>🔊 Keep this token visible and ready to show</li>
              <li>👂 Listen carefully for your token number announcement</li>
              <li>🏢 Proceed to Counter {token.counterId} when called</li>
              <li>📍 Do not leave the waiting area without permission</li>
              <li>❓ Contact staff if you have any questions or concerns</li>
              <li>⏰ Token will expire 30 minutes after being called</li>
            </ul>
          </div>
        </div>

        <div className="status-guide">
          <h4 className="guide-title">📊 Token Status Guide</h4>
          <div className="status-items">
            <div className="status-item">
              <div className="status-indicator active">🟢</div>
              <div className="status-text">
                <strong>Active Token</strong>
                <p>Your token is live and visible to counter staff</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-indicator calling">🟡</div>
              <div className="status-text">
                <strong>Being Called</strong>
                <p>Your token is currently being announced</p>
              </div>
            </div>
            <div className="status-item">
              <div className="status-indicator inactive">🔴</div>
              <div className="status-text">
                <strong>Inactive Token</strong>
                <p>Service completed or token expired</p>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={handlePrint} className="print-btn">
            <span className="btn-icon">🖨️</span>
            Print Token
          </button>
          <button onClick={handleNewToken} className="new-token-btn">
            <span className="btn-icon">➕</span>
            New Token
          </button>
          <button onClick={handleBackToDashboard} className="dashboard-btn">
            <span className="btn-icon">🏠</span>
            Dashboard
          </button>
          <button onClick={handleRefreshToken} className="refresh-token-btn">
            <span className="btn-icon">🔄</span>
            Refresh Status
          </button>
        </div>

        {/* Footer with helpful information */}
        <div className="token-footer">
          <p><strong>Need Help?</strong> Contact support at 📞 1800-XXX-XXXX</p>
          <p><small>Token ID: {token.id} | Generated at: {new Date(token.createdAt).toLocaleString()}</small></p>
        </div>
      </div>

      <style jsx>{`
        .page-header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 1rem 2rem;
          margin-bottom: 1rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .current-time {
          display: flex;
          flex-direction: column;
          text-align: right;
        }

        .time-label {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .time-value {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .refresh-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .refresh-btn:hover {
          background: #218838;
          transform: translateY(-1px);
        }

        .queue-info {
          display: flex;
          justify-content: space-around;
          background: linear-gradient(135deg, #e3f2fd, #bbdefb);
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .queue-item {
          text-align: center;
        }

        .queue-label {
          display: block;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.3rem;
        }

        .queue-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: #1976d2;
        }

        .waiting-tip {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 193, 7, 0.1);
          border-radius: 6px;
          border-left: 3px solid #ffc107;
        }

        .token-footer {
          text-align: center;
          margin-top: 2rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-top: 3px solid #667eea;
        }

        .refresh-token-btn {
          background: #17a2b8;
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .refresh-token-btn:hover {
          background: #138496;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .queue-info {
            flex-direction: column;
            gap: 1rem;
          }

          .action-buttons {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default TokenDisplay