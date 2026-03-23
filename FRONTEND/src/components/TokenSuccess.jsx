import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/TokenSuccess.css'

function TokenSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const token = location.state?.token

  console.log('TokenSuccess rendered, token:', token) // Debug log

  // Handle token validation and redirection
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!token) {
        console.log('No token found, redirecting to form') // Debug log
        navigate('/token-form', { replace: true })
      } else {
        console.log('Token found, showing success page') // Debug log
        setIsLoading(false)
      }
    }, 100) // Small delay to ensure proper rendering

    return () => clearTimeout(timer)
  }, [token, navigate])

  const handleNewToken = () => {
    console.log('Generate new token clicked') // Debug log
    // Clear any existing state and navigate to form
    navigate('/token-form', {
      replace: true,
      state: null
    })
  }

  const handlePrintToken = () => {
    console.log('Print token clicked') // Debug log
    try {
      window.print()
    } catch (error) {
      console.error('Print failed:', error)
      alert('Print functionality not available')
    }
  }

  const handleBackToDashboard = () => {
    console.log('Back to dashboard clicked') // Debug log
    navigate('/dashboard', { replace: true })
  }

  const FloatingParticles = () => (
    <div className="particles-container">
      {[...Array(20)].map((_, index) => (
        <div
          key={index}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${3 + Math.random() * 7}s`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: Math.random() * 0.7 + 0.3
          }}
        />
      ))}
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="token-success-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Loading Token Details...</h2>
        </div>
      </div>
    )
  }

  // No token state (this should rarely be seen due to useEffect redirect)
  if (!token) {
    return (
      <div className="token-success-page">
        <div className="error-container">
          <h2>❌ No Token Data Found</h2>
          <p>Please generate a new token</p>
          <button
            className="new-token-btn"
            onClick={() => navigate('/token-form', { replace: true })}
          >
            🎫 Generate Token
          </button>
        </div>
      </div>
    )
  }

  // Format service name for display
  const getServiceDisplayName = (service) => {
    const serviceMap = {
      'account-opening': 'New Account Opening',
      'cash-deposit': 'Cash Deposit',
      'cash-withdrawal': 'Cash Withdrawal',
      'balance-inquiry': 'Balance Inquiry',
      'loan-application': 'Loan Application',
      'document-verification': 'Document Verification',
      'complaint': 'Complaint/Query Resolution',
      'cheque-book': 'Cheque Book Request',
      'card-services': 'Card Services',
      'other': 'Other Services'
    }
    return serviceMap[service] || service
  }

  // Format payment mode for display
  const getPaymentDisplayName = (payment) => {
    const paymentMap = {
      'cash': 'Cash Payment',
      'card': 'Debit/Credit Card',
      'upi': 'UPI Payment',
      'wallet': 'Digital Wallet',
      'cheque': 'Cheque Payment',
      'netbanking': 'Net Banking'
    }
    return paymentMap[payment] || payment
  }

  return (
    <div className="token-success-page">
      <FloatingParticles />

      <div className="token-success-container">
        <div className="success-header">
          <div className="success-icon">🎉</div>
          <h1 className="success-title">Token Generated Successfully!</h1>
          <p className="success-subtitle">Your token has been created and is now active</p>
        </div>

        <div className="token-display">
          <div className="token-id-wrapper">
            <span className="token-label">Token ID</span>
            <h2 className="token-id">{token.id}</h2>
            <div className="token-status active">ACTIVE</div>
          </div>
        </div>

        <div className="counter-info">
          <h3>Please proceed to Counter {token.counterNo}</h3>
          <p>Wait for your token to be called</p>
        </div>

        <div className="token-details">
          <div className="detail-row">
            <span className="detail-label">Customer Name:</span>
            <span className="detail-value">{token.customerName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Mobile Number:</span>
            <span className="detail-value">{token.mobileNo}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Service:</span>
            <span className="detail-value">{getServiceDisplayName(token.item)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment Mode:</span>
            <span className="detail-value">{getPaymentDisplayName(token.paymentMode)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Generated At:</span>
            <span className="detail-value">
              {new Date(token.createdAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>

        <div className="status-legend">
          <div className="legend-item">
            <div className="status-indicator active"></div>
            <span>Active - Your token is visible to counter staff</span>
          </div>
          <div className="legend-item">
            <div className="status-indicator completed"></div>
            <span>Completed - Service finished, token inactive</span>
          </div>
        </div>

        <div className="instructions-card">
          <h3>🔔 Important Instructions</h3>
          <ul>
            <li>Keep this token number safe and note it down</li>
            <li>Listen for announcements calling your token number</li>
            <li>Proceed to Counter {token.counterNo} when your token is called</li>
            <li>Have all required documents and ID ready</li>
            <li>If you miss your turn, inform the counter staff immediately</li>
            <li>This token is valid only for today's session</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button
            className="new-token-btn"
            onClick={handleNewToken}
            type="button"
          >
            🎫 Generate New Token
          </button>
          <button
            className="print-btn"
            onClick={handlePrintToken}
            type="button"
          >
            🖨️ Print Token
          </button>
          <button
            className="dashboard-btn"
            onClick={handleBackToDashboard}
            type="button"
          >
            🏠 Back to Dashboard
          </button>
        </div>

        <div className="footer-note">
          <p>🕒 Token generated at: {new Date(token.createdAt).toLocaleString('en-IN')}</p>
          <p>📧 Thank you for using our digital token system!</p>
          <p className="token-id-note">📝 Your Token ID: <strong>{token.id}</strong></p>
        </div>
      </div>
    </div>
  )
}

export default TokenSuccess