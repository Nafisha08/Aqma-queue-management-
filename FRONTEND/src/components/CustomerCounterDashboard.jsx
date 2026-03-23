import { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentSession } from '../services/session';
import '../styles/CustomerCounterDashboard.css';

// Set axios base URL
axios.defaults.baseURL = 'https://aqma-queue-management-1.onrender.com.com';

function CustomerCounterDashboard({ activeCounter = 1, userProfile }) {
  const [tokens, setTokens] = useState([]);
  const [counters, setCounters] = useState([]);
  const [activeTab, setActiveTab] = useState(`counter${activeCounter}`);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cabins, setCabins] = useState([]);
  const [assigningCabin, setAssigningCabin] = useState(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(null);

  // Dynamic counter configuration
  const getCounterConfig = (counterNumber) => {
    const configs = {
      1: {
        id: 1,
        name: userProfile?.counterName || `Counter ${counterNumber}`,
        description: 'General Services',
        icon: '🏪',
        services: ['Account Opening', 'Balance Inquiry', 'General Queries']
      },
      2: {
        id: 2,
        name: userProfile?.counterName || `Counter ${counterNumber}`,
        description: 'Cash Services',
        icon: '💰',
        services: ['Cash Deposit', 'Cash Withdrawal', 'Currency Exchange']
      },
      3: {
        id: 3,
        name: userProfile?.counterName || `Counter ${counterNumber}`,
        description: 'Loan Services',
        icon: '🏦',
        services: ['Loan Application', 'Loan Payment', 'Document Verification']
      }
    };
    return configs[counterNumber] || configs[1];
  };

  useEffect(() => {
    setActiveTab(`counter${activeCounter}`);
  }, [activeCounter]);

  useEffect(() => {
    fetchTokensAndCounters(true);
    fetchCabins();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTokensAndCounters(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTokensAndCounters = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { token } = getCurrentSession();
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const [activeResponse, historyResponse] = await Promise.all([
        axios.get('/api/tokens/active', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/tokens/history', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      let activeTokens = [];
      if (activeResponse.data?.success && activeResponse.data?.data) {
        activeTokens = activeResponse.data.data;
      } else if (Array.isArray(activeResponse.data)) {
        activeTokens = activeResponse.data;
      }

      let allTokens = [];
      if (historyResponse.data?.success && historyResponse.data?.data) {
        allTokens = historyResponse.data.data;
      } else if (Array.isArray(historyResponse.data)) {
        allTokens = historyResponse.data;
      }

      const combinedTokens = [...activeTokens];
      allTokens.forEach(token => {
        if (!combinedTokens.find(t => t._id === token._id || t.tokenId === token.tokenId)) {
          combinedTokens.push(token);
        }
      });

      setTokens(prevTokens => {
        const hasChanged = JSON.stringify(prevTokens) !== JSON.stringify(combinedTokens);
        return hasChanged ? combinedTokens : prevTokens;
      });

      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      if (isInitialLoad) {
        setError('Failed to fetch counter data. Please try again.');
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchCabins = async () => {
    try {
      const { token } = getCurrentSession();
      const response = await axios.get('/api/cabins', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.success && response.data?.data) {
        setCabins(response.data.data);
      } else if (Array.isArray(response.data)) {
        setCabins(response.data);
      }
    } catch (err) {
      console.error('Error fetching cabins:', err);
    }
  };

  const handleAssignCabin = async (tokenId, cabinId) => {
    setAssigningCabin(tokenId);
    try {
      const { token } = getCurrentSession();
      const response = await axios.patch(
        `/api/tokens/${tokenId}/assign-cabin`,
        { cabinId: cabinId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        await fetchTokensAndCounters(false);
        alert('✅ Cabin assigned successfully!');
        setShowAssignDropdown(null);
      }
    } catch (err) {
      console.error('Error assigning cabin:', err);
      alert('❌ Failed to assign cabin. Please try again.');
    } finally {
      setAssigningCabin(null);
    }
  };

  // ✅ FIXED: Updated filtering logic to properly match tokens by counterId
  const getCounterTokens = (counterId) => {
    return tokens.filter(token => {
      // Extract counterId from token (handle both populated and non-populated cases)
      const tokenCounterId = token.counterId?._id || token.counterId;
      const userCounterId = userProfile?.counterId;

      // Primary check: Match by counterId from backend
      if (tokenCounterId && userCounterId) {
        return tokenCounterId === userCounterId;
      }

      // Fallback: Check by counterNumber (for backward compatibility)
      if (token.counterNumber !== undefined) {
        return token.counterNumber === counterId || token.counterNumber === parseInt(counterId);
      }

      // Don't show tokens that don't match any criteria
      return false;
    });
  };

  const getActiveCounterTokens = () => {
    return getCounterTokens(activeCounter);
  };

  const getCompletedCounterTokens = () => {
    return getCounterTokens(activeCounter).filter(token =>
      token.status === 'Completed' || token.status === 'Cancelled'
    );
  };

  const getCounterStats = () => {
    const counterTokens = getActiveCounterTokens();
    const activeTokens = counterTokens.filter(token => token.status === 'Active');
    const completedTokens = counterTokens.filter(token => token.status === 'Completed');
    const cancelledTokens = counterTokens.filter(token => token.status === 'Cancelled');

    return {
      active: activeTokens.length,
      completed: completedTokens.length,
      cancelled: cancelledTokens.length,
      total: counterTokens.length
    };
  };

  const handleTokenClick = (token) => {
    setSelectedToken(token);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedToken(null);
  };

  const stats = getCounterStats();
  const activeTokens = getActiveCounterTokens().filter(token => token.status === 'Active');
  const completedTokens = getCompletedCounterTokens();

  if (error) {
    return (
      <div className="customer-counter-dashboard">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchTokensAndCounters(true)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-counter-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="counter-info">
            <div className="counter-icon-large">
              {getCounterConfig(activeCounter).icon}
            </div>
            <div>
              <h1>{getCounterConfig(activeCounter).name}</h1>
              <p>{getCounterConfig(activeCounter).description}</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="quick-stat">
              <span className="stat-number">{stats.active}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="quick-stat">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="counter-stats">
        <div className="stat-card active">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active Tokens</p>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <h3>{stats.cancelled}</h3>
            <p>Cancelled</p>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Tokens</p>
          </div>
        </div>
      </div>

      {/* Active Tokens */}
      <div className="tokens-section active-section">
        <h3>🔔 Active Tokens</h3>
        {activeTokens.length === 0 ? (
          <div className="no-tokens">
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>No active tokens at the moment</p>
              <small>All caught up! Waiting for new customers.</small>
            </div>
          </div>
        ) : (
          <div className="tokens-grid">
            {activeTokens.map((token) => (
              <div
                key={token._id || token.tokenId}
                className="token-box"
                onDoubleClick={() => handleTokenClick(token)}
                title="Double click to view details"
              >
                <div className="token-box-header">
                  <span className="box-label">TOKEN NO.</span>
                  <span className="priority-dot"></span>
                </div>
                <div className="token-box-number">
                  {token.dailyTokenId || token.tokenId}
                </div>
                <div className="token-box-footer">
                  {token.cabin || token.cabinId || token.cabinNo ? (
                    <span className="cabin-label">
                      🪑 Cabin {token.cabin || token.cabinId || token.cabinNo}
                    </span>
                  ) : (
                    <div className="cabin-assign-section">
                      {showAssignDropdown === token._id ? (
                        <div className="assign-dropdown-container" onClick={(e) => e.stopPropagation()}>
                          <select
                            className="cabin-select"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignCabin(token._id, e.target.value);
                              }
                            }}
                            disabled={assigningCabin === token._id}
                          >
                            <option value="">Select Cabin</option>
                            {cabins.map((cabin) => (
                              <option key={cabin._id || cabin.id} value={cabin._id || cabin.id}>
                                Cabin {cabin.cabinNumber || cabin.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="cancel-assign-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAssignDropdown(null);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          className="cabin-assign-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAssignDropdown(token._id);
                          }}
                        >
                          🪑 Cabin N/A
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedToken && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Token Details</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">🎫 Token Number:</span>
                <span className="detail-value">{selectedToken.dailyTokenId || selectedToken.tokenId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🏪 Counter:</span>
                <span className="detail-value">Counter {activeCounter}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🪑 Cabin Number:</span>
                <span className="detail-value">
                  {selectedToken.cabin || selectedToken.cabinId || selectedToken.cabinNo || 'Not Assigned'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">👤 Customer Name:</span>
                <span className="detail-value">{selectedToken.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📱 Mobile Number:</span>
                <span className="detail-value">{selectedToken.mobileNo}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🛒 Items:</span>
                <span className="detail-value">
                  {Array.isArray(selectedToken.item) ? selectedToken.item.join(', ') : selectedToken.item}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">💰 Amount:</span>
                <span className="detail-value">₹{selectedToken.amount}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">⏰ Created At:</span>
                <span className="detail-value">
                  {new Date(selectedToken.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">📊 Status:</span>
                <span className={`status-badge ${selectedToken.status.toLowerCase()}`}>
                  {selectedToken.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Tokens */}
      <div className="tokens-section completed-section">
        <h3>✅ Completed Today</h3>
        {completedTokens.length === 0 ? (
          <div className="no-tokens">
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No completed tokens today</p>
              <small>Start serving customers to see completed tokens here.</small>
            </div>
          </div>
        ) : (
          <div className="tokens-list">
            {completedTokens.slice(0, 10).map((token) => (
              <div key={token._id || token.tokenId} className="token-item completed">
                <div className="token-header">
                  <div className="token-number">
                    {token.dailyTokenId || token.tokenId}
                  </div>
                  <div className="completion-time">
                    <span className="time-badge">
                      {token.completedAt ? new Date(token.completedAt).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="token-info">
                  <div className="customer-details">
                    <p><strong>👤 Customer:</strong> {token.customerName}</p>
                    <p><strong>📱 Mobile:</strong> {token.mobileNo}</p>
                    <p><strong>🛒 Items:</strong> {Array.isArray(token.item) ? token.item.join(', ') : token.item}</p>
                    <p><strong>💰 Amount:</strong> ₹{token.amount}</p>
                    <p><strong>🪑 Cabin:</strong> {token.cabin || token.cabinNo || 'N/A'}</p>
                  </div>
                  <div className="token-meta">
                    <p><strong>⏰ Created:</strong> {new Date(token.createdAt).toLocaleTimeString()}</p>
                    <p><strong>🏪 Vendor:</strong> {token.vendorId?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className={`token-status ${token.status.toLowerCase()}`}>
                  {token.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerCounterDashboard;