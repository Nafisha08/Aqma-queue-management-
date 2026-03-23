import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeader } from '../services/auth'
import '../styles/TokenManagement.css'
import webSocketService from '../services/WebSocketService'

axios.defaults.baseURL = 'https://aqma-queue-management-1.onrender.com'

function ActiveTokensTable({ vendorId, counterId, userProfile, userRole }) {
  const [tokens, setTokens] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vendorId) {
      webSocketService.connect(vendorId, counterId)
      const handleNewToken = (payload) => {
        const token = payload?.token || payload
        if (!token) return
        if (token.status == 'Active') {
          const normalizedToken = normalizeTokenData(token)
          setTokens(prev => {
            const exists = prev.some(t => t.id === normalizedToken.id)
            return exists ? prev : [normalizedToken, ...prev]
          })
        }
      }
      const handleTokenUpdated = (payload) => {
        const token = payload?.token || payload
        if (!token) return
        const normalizedToken = normalizeTokenData(token)
        setTokens(prev => prev.map(t => (t.id === normalizedToken.id ? normalizedToken : t)))
      }
      const handleTokenCompleted = (payload) => {
        const token = payload?.token || payload
        if (!token?.id) return
        setTokens(prev => prev.filter(t => t.id !== token.id))
      }
      webSocketService.on('new_token', handleNewToken)
      webSocketService.on('token_updated', handleTokenUpdated)
      webSocketService.on('token_completed', handleTokenCompleted)
      return () => {
        webSocketService.off('new_token', handleNewToken)
        webSocketService.off('token_updated', handleTokenUpdated)
        webSocketService.off('token_completed', handleTokenCompleted)
      }
    }
  }, [vendorId, counterId])

  useEffect(() => {
    fetchTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, counterId])

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentToken' && e.newValue) {
        try {
          const newToken = JSON.parse(e.newValue)
          const normalizedToken = normalizeTokenData(newToken)
          setTokens(prev => {
            const exists = prev.some(t => t.id === normalizedToken.id)
            return exists ? prev : [normalizedToken, ...prev]
          })
        } catch (error) {
          console.error('Error parsing token:', error)
        }
      }
    }
    const handleCustomTokenEvent = (e) => {
      if (e.detail?.token) {
        const normalizedToken = normalizeTokenData(e.detail.token)
        setTokens(prev => {
          const exists = prev.some(t => t.id === normalizedToken.id)
          return exists ? prev : [normalizedToken, ...prev]
        })
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('newTokenGenerated', handleCustomTokenEvent)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('newTokenGenerated', handleCustomTokenEvent)
    }
  }, [])

  useEffect(() => {
    const checkForNewToken = () => {
      try {
        const currentToken = localStorage.getItem('currentToken')
        if (currentToken) {
          const tokenData = JSON.parse(currentToken)
          const normalizedToken = normalizeTokenData(tokenData)
          setTokens(prev => {
            const exists = prev.some(t => t.id === normalizedToken.id)
            if (!exists && normalizedToken.status !== 'completed') {
              return [normalizedToken, ...prev]
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Error checking localStorage:', error)
      }
    }
    checkForNewToken()
    const interval = setInterval(checkForNewToken, 2000)
    return () => clearInterval(interval)
  }, [])

  const normalizeTokenData = (token) => {
    if (!token) return null
    return {
      ...token,
      id: token._id || token.id || token.tokenId,
      tokenId: token.tokenId || token.id || token._id,
      dailyTokenId: token.dailyTokenId || '',
      counterNo: token.counterNumber || token.counterId || token.counterNo || '1',
      counterName: token.counterName || getCounterName(token.counterNumber || token.counterId || '1'),
      customerName: token.customerName || token.customer_name || 'N/A',
      mobileNo: token.mobileNo || token.mobile_no || token.phone || 'N/A',
      item: token.item || token.service || token.itemSelect || 'General Service',
      status: token.status || 'waiting',
      createdAt: token.createdAt || token.created_at || new Date().toISOString(),
      completedAt: token.completedAt || null
    }
  }

  const fetchTokens = async () => {
    setIsLoading(true)
    setError('')
    console.log('🔍 Fetching tokens for:', { role: userRole, counterId: userProfile?.counterId, cabinId: userProfile?.cabinId })
    try {
      const response = await axios.get('/api/tokens/active', { headers: { ...getAuthHeader() } })
      let tokensData = []
      if (response.data?.success && response.data?.tokens) tokensData = response.data.tokens
      else if (response.data && Array.isArray(response.data.data)) tokensData = response.data.data
      else if (Array.isArray(response.data)) tokensData = response.data

      const activeTokens = tokensData.filter(token => token.status !== 'completed' && token.status !== 'cancelled')
      const normalizedTokens = activeTokens.map(token => normalizeTokenData(token))
      console.log('✅ Active tokens:', normalizedTokens.length)
      setTokens(normalizedTokens)
      setError('')
    } catch (err) {
      console.error('❌ API Error:', err)
      try {
        const storedTokens = JSON.parse(localStorage.getItem('generatedTokens') || '[]')
        const activeTokens = storedTokens.filter(token => token.status === 'Active' || token.status === 'waiting').map(token => normalizeTokenData(token))
        setTokens(activeTokens)
        let errorMessage = 'Failed to fetch tokens from server'
        if (err.response?.status === 401) errorMessage = 'Authentication failed.'
        else if (err.response?.status === 403) errorMessage = 'Access denied.'
        else if (err.response?.data?.message) errorMessage = err.response.data.message
        setError(errorMessage + ' (Using offline data)')
      } catch (storageError) {
        setError('Failed to fetch tokens')
        setTokens([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const getCounterName = (counterNo) => {
    const counterMap = { '1': 'Counter 1', '2': 'Counter 2', '3': 'Counter 3', '4': 'Counter 4', '5': 'Counter 5' }
    return counterMap[String(counterNo)] || `Counter ${counterNo}`
  }

  const getServiceName = (service) => {
    if (!service) return 'General Service'
    return service.toString().replace('-', ' ').toUpperCase()
  }

  const getStatusDisplayName = (status) => {
    const statusMap = { 'waiting': 'Waiting', 'called': 'Called', 'serving': 'Serving', 'completed': 'Completed', 'Active': 'Waiting' }
    return statusMap[status] || status
  }

  const handleCompleteToken = async (token) => {
    try {
      await axios.put(`/api/tokens/${token.tokenId || token.id}`, { status: 'Completed' }, { headers: { ...getAuthHeader() } })
      setTokens(prev => prev.filter(t => t.id !== token.id))
    } catch (error) {
      setError('Failed to complete token')
    }
  }

  const handleCallToken = async (token) => {
    try {
      await axios.put(`/api/tokens/${token.tokenId || token.id}`, { status: 'Called' }, { headers: { ...getAuthHeader() } })
      const updatedToken = { ...token, status: 'Called', calledAt: new Date().toISOString() }
      setTokens(prev => prev.map(t => (t.id === token.id ? updatedToken : t)))
    } catch (error) {
      setError('Failed to call token')
    }
  }

  return (
    <div className="tokens-section">
      <div className="section-header">
        <h2 className="section-title">All Active Tokens</h2>
        <button className="refresh-btn" onClick={fetchTokens} disabled={isLoading}>{isLoading ? '⏳' : '🔄'} Refresh</button>
      </div>
      {error && <div className="error-message">⚠️ {error} <button className="retry-btn" onClick={fetchTokens}>Retry</button></div>}
      {isLoading ? (
        <div className="loading-container"><div className="loading-spinner"></div>Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="no-tokens"><div className="no-tokens-icon">🎫</div><h3>No Active Tokens</h3><p>No tokens currently active.</p></div>
      ) : (
        <div className="table-container">
          <table className="tokens-table">
            <thead><tr><th>Token ID</th><th>Customer</th><th>Service</th><th>Counter</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {tokens.map(token => (
                <tr key={token.id}>
                  <td><span className="token-badge">{token.dailyTokenId || token.tokenId}</span></td>
                  <td><strong>{token.customerName}</strong><div>{token.mobileNo}</div></td>
                  <td>{getServiceName(token.item)}</td>
                  <td>#{token.counterNo}</td>
                  <td><span className={`status-badge status-${token.status?.toLowerCase()}`}>{getStatusDisplayName(token.status)}</span></td>
                  <td>{formatDate(token.createdAt)}</td>
                  <td>
                    <button className="action-btn call-btn" onClick={() => handleCallToken(token)} disabled={token.status === 'called'}>📞 Call</button>
                    <button className="action-btn complete-btn" onClick={() => handleCompleteToken(token)}>✅ Complete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="tokens-summary">
        <div className="summary-item"><span>Total Active:</span><span>{tokens.length}</span></div>
        <div className="summary-item"><span>Waiting:</span><span>{tokens.filter(t => t.status === 'waiting' || t.status === 'Active').length}</span></div>
        <div className="summary-item"><span>Serving:</span><span>{tokens.filter(t => t.status === 'called' || t.status === 'serving').length}</span></div>
      </div>
    </div>
  )
}

export default ActiveTokensTable