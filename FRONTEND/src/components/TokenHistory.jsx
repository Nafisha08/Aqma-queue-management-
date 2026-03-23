import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../services/auth';
import webSocketService from '../services/WebSocketService';

function TokenHistory({ vendorId }) {
  const [tokenHistory, setTokenHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Cabin-related states
  const [selectedCabin, setSelectedCabin] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState('history'); // 'history' or 'distribution'
  const [distributionData, setDistributionData] = useState(null);
  const [cabins, setCabins] = useState([]); // Dynamic cabins list

  // Tokens to remove from history
  const tokensToRemove = [];

  // Fetch cabins on component mount
  useEffect(() => {
    async function fetchCabins() {
      try {
        console.log('🏢 Fetching cabins...');
        const response = await axios.get('/api/cabins', {
          headers: {
            ...getAuthHeader()
          }
        });

        if (response.data.success) {
          setCabins(response.data.cabins);
          console.log('✅ Cabins loaded:', response.data.cabins.map(c => c.name));
        }
      } catch (err) {
        console.error('❌ Error fetching cabins:', err);
        // Fallback to default cabins if API fails
        setCabins([
          { _id: 'default-1', name: 'Cabin-1' },
          { _id: 'default-2', name: 'Cabin-2' },
          { _id: 'default-3', name: 'Cabin-3' }
        ]);
      }
    }

    fetchCabins();
  }, []);

  useEffect(() => {
    async function fetchTokenHistory() {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching token history...');
        console.log('Vendor ID:', vendorId);

        // Get user profile to determine cabin filtering
        const userResponse = await axios.get('/api/users/profile', {
          headers: {
            ...getAuthHeader()
          }
        });

        const userProfile = userResponse.data?.user;
        console.log('User profile:', userProfile);

        // Build query parameters for filtering
        const queryParams = new URLSearchParams();

        // If user has a vendorId, show all cabins from that vendor
        // Don't filter by specific cabin - show all cabins from user's vendor
        if (userProfile?.vendorId) {
          queryParams.append('vendorId', userProfile.vendorId);
          console.log('Filtering by user vendor:', userProfile.vendorId);
        }

        // If vendor, only show their tokens
        if (vendorId) {
          queryParams.append('vendorId', vendorId);
        }

        const response = await axios.get(`/api/tokens/history?${queryParams.toString()}`, {
          headers: {
            ...getAuthHeader()
          }
        });

        console.log('📡 Token history response:', response);

        let tokens = [];
        if (response.data && response.data.success && response.data.tokens) {
          tokens = response.data.tokens;
        } else if (Array.isArray(response.data)) {
          tokens = response.data;
        } else if (response.data && response.data.data) {
          tokens = response.data.data;
        }

        console.log('📋 Processed tokens:', tokens.length);
        console.log('📋 Sample token structure:', tokens[0]);

        // Normalize token data with cabin field
        const normalizedTokens = tokens.map(token => ({
          ...token,
          id: token._id || token.id || token.tokenId,
          tokenId: token.tokenId || token.id || token._id,
          counterName: token.counterName || token.counterNumber || '-',
          cabin: token.cabin
        }));

        // Filter out tokens to remove
        const filteredTokens = normalizedTokens.filter(token =>
          !tokensToRemove.includes(token.dailyTokenId || token.tokenId || token.id)
        );

        const list = Array.isArray(filteredTokens)
          ? [...filteredTokens].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];

        console.log('✅ Token history loaded successfully:', list.length, 'tokens');
        console.log('✅ Sample normalized token:', list[0]);
        setTokenHistory(list);
      } catch (err) {
        console.error('❌ Error fetching token history:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });

        let errorMessage = 'Failed to fetch token history';
        if (err.response?.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view token history.';
        } else if (err.response?.status === 404) {
          errorMessage = 'Token history endpoint not found.';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchTokenHistory();
  }, [vendorId]);

  // NEW: Fetch distribution data
  useEffect(() => {
    async function fetchDistributionData() {
      if (view !== 'distribution') return;

      try {
        const response = await axios.get(`/api/tokens/distribution?date=${selectedDate}`, {
          headers: {
            ...getAuthHeader()
          }
        });

        setDistributionData(response.data);
      } catch (err) {
        console.error('❌ Error fetching distribution data:', err);
        // Fallback to generating from current data
        generateDistributionFromHistory();
      }
    }

    fetchDistributionData();
  }, [view, selectedDate, vendorId]);

  // Generate distribution data from current history (fallback)
  function generateDistributionFromHistory() {
    // Get unique counters from token history
    const uniqueCounters = [...new Set(tokenHistory.map(token => token.counterName || token.counterNumber || '1'))];

    // Initialize counters dynamically
    const counters = {};
    const summary = {};

    // Initialize all cabin arrays for each counter
    uniqueCounters.forEach(counter => {
      counters[`counter${counter}`] = {};
      cabins.forEach(cabin => {
        counters[`counter${counter}`][cabin.name] = [];
        summary[cabin.name] = 0;
      });
    });

    tokenHistory.forEach(token => {
      const tokenNum = token.dailyTokenId || token.tokenId || token.id;
      const cabin = token.cabin || 'Cabin-1';
      const counter = token.counterName || token.counterNumber || '1';

      if (counters[`counter${counter}`] && counters[`counter${counter}`][cabin]) {
        counters[`counter${counter}`][cabin].push(tokenNum);
      }
    });

    // Calculate summary
    cabins.forEach(cabin => {
      summary[cabin.name] = uniqueCounters.reduce((sum, counter) => {
        return sum + (counters[`counter${counter}`][cabin.name]?.length || 0);
      }, 0);
    });

    setDistributionData({
      ...counters,
      summary
    });
  }

  useEffect(() => {
    if (!vendorId) return;

    webSocketService.connect(vendorId, null);

    const handleCompleted = (payload) => {
      const token = payload?.token || payload;
      if (!token) return;
      // Skip if token is in remove list
      if (tokensToRemove.includes(token.dailyTokenId || token.tokenId || token.id)) return;
      setTokenHistory(prev => {
        const exists = prev.some(t => t.id === token.id);
        const updated = exists ? prev.map(t => (t.id === token.id ? { ...token, cabin: token.cabin || t.cabin || 'Cabin-1' } : t)) : [{ ...token, cabin: token.cabin || 'Cabin-1' }, ...prev];
        return [...updated].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
    };

    const handleUpdated = (payload) => {
      const token = payload?.token || payload;
      if (!token) return;
      // Skip if token is in remove list
      if (tokensToRemove.includes(token.dailyTokenId || token.tokenId || token.id)) return;
      setTokenHistory(prev => {
        const exists = prev.some(t => t.id === token.id);
        const updated = exists ? prev.map(t => (t.id === token.id ? { ...token, cabin: token.cabin || t.cabin || 'Cabin-1' } : t)) : [{ ...token, cabin: token.cabin || 'Cabin-1' }, ...prev];
        return [...updated].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
    };

    const handleDeleted = (payload) => {
      const token = payload?.token || payload;
      if (!token?.id) return;
      setTokenHistory(prev => prev.filter(t => t.id !== token.id));
    };

    webSocketService.on('token_completed', handleCompleted);
    webSocketService.on('token_updated', handleUpdated);
    webSocketService.on('token_deleted', handleDeleted);

    return () => {
      webSocketService.off('token_completed', handleCompleted);
      webSocketService.off('token_updated', handleUpdated);
      webSocketService.off('token_deleted', handleDeleted);
    };
  }, [vendorId]);

  function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString();
  }

  function calculateDuration(createdAt, completedAt) {
    if (!createdAt || !completedAt) return '-';
    const start = new Date(createdAt);
    const end = new Date(completedAt);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins + ' minutes';
  }

  async function handleDelete(tokenId) {
    try {
      console.log('🗑️ Attempting to delete token with ID:', tokenId);

      await axios.delete(`/api/tokens/${tokenId}`, {
        headers: {
          ...getAuthHeader()
        }
      });

      console.log('✅ Token deleted successfully:', tokenId);

      setTokenHistory(prev => prev.filter(t => t.id !== tokenId));
      webSocketService.send('token_deleted', { token: { id: tokenId } });

      const response = await axios.get('/api/tokens/history', {
        headers: {
          ...getAuthHeader()
        }
      });

      let tokens = [];
      if (response.data && response.data.success && response.data.tokens) {
        tokens = response.data.tokens;
      } else if (Array.isArray(response.data)) {
        tokens = response.data;
      }

      const normalizedTokens = tokens.map(token => ({
        ...token,
        id: token._id || token.id || token.tokenId,
        tokenId: token.tokenId || token.id || token._id,
        counterName: token.counterName || token.counterNumber || '-',
        cabin: token.cabin || 'Cabin-1'
      }));

      const list = Array.isArray(normalizedTokens)
        ? [...normalizedTokens].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];

      setTokenHistory(list);
    } catch (err) {
      console.error('❌ Error deleting token:', err);
      setError('Failed to delete token');
    }
  }

  async function handleCancel(tokenId) {
    try {
      console.log('🚫 Attempting to cancel token with ID:', tokenId);

      await axios.put(`/api/tokens/${tokenId}/cancel`, {}, {
        headers: {
          ...getAuthHeader()
        }
      });

      console.log('✅ Token cancelled successfully:', tokenId);

      setTokenHistory(prev => prev.map(t =>
        (t.tokenId === tokenId || t.id === tokenId)
          ? { ...t, status: 'Cancelled' }
          : t
      ));

      const response = await axios.get('/api/tokens/history', {
        headers: {
          ...getAuthHeader()
        }
      });

      let tokens = [];
      if (response.data && response.data.success && response.data.tokens) {
        tokens = response.data.tokens;
      } else if (Array.isArray(response.data)) {
        tokens = response.data;
      }

      const normalizedTokens = tokens.map(token => ({
        ...token,
        id: token._id || token.id || token.tokenId,
        tokenId: token.tokenId || token.id || token._id,
        counterName: token.counterName || token.counterNumber || '-',
        cabin: token.cabin || 'Cabin-1'
      }));

      const list = Array.isArray(normalizedTokens)
        ? [...normalizedTokens].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];

      setTokenHistory(list);
    } catch (err) {
      console.error('❌ Error cancelling token:', err);
      setError('Failed to cancel token');
    }
  }

  // NEW: Get cabin color class
  const getCabinColorClass = (cabin) => {
    // Create a simple hash for dynamic cabin colors
    const colors = ['cabin-1', 'cabin-2', 'cabin-3', 'cabin-4', 'cabin-5'];
    const hash = cabin.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // NEW: Filter tokens by cabin
  const filteredTokens = tokenHistory.filter(token => {
    if (selectedCabin === 'all') return true;
    return token.cabin === selectedCabin;
  });

  // NEW: Calculate cabin summary dynamically
  const cabinSummary = cabins.reduce((summary, cabin) => {
    summary[cabin.name] = tokenHistory.filter(t => t.cabin === cabin.name).length;
    return summary;
  }, {});

  return (
    <div className="token-history-table">
      {/* NEW: View Toggle and Heading */}
      <div className="history-header">
        <h2>Token History</h2>
        <div className="view-toggle">
          <button
            className={view === 'history' ? 'active' : ''}
            onClick={() => setView('history')}
          >
            History View
          </button>
          <button
            className={view === 'distribution' ? 'active' : ''}
            onClick={() => setView('distribution')}
          >
            Distribution View
          </button>
        </div>
      </div>

      {loading && <p>Loading token history...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && view === 'history' && (
        <>
          {/* NEW: Filters Section */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Cabin Filter:</label>
              <select value={selectedCabin} onChange={(e) => setSelectedCabin(e.target.value)}>
                <option value="all">All Cabins</option>
                {cabins.map(cabin => (
                  <option key={cabin._id} value={cabin.name}>{cabin.name}</option>
                ))}
              </select>
            </div>
            {/* <div className="filter-group">
              <label>Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div> */}
            {/* <button className="export-button">Export</button> */}
          </div>

          {/* NEW: Summary Cards */}
          <div className="cabin-summary">
            {cabins.map(cabin => (
              <div key={cabin._id} className={`summary-card ${getCabinColorClass(cabin.name)}`}>
                <h3>{cabin.name}</h3>
                <p className="count">{cabinSummary[cabin.name] || 0} tokens</p>
              </div>
            ))}
          </div>

          {tokenHistory.length === 0 && <p>No token history found.</p>}
          {filteredTokens.length > 0 && (
            <table>
              <thead>
                <tr><th>Token No</th><th>Status</th><th>Counter</th><th>Cabin</th><th>Created At</th><th>Completed At</th><th>Duration</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredTokens.map((token) => {
                  const getStatusClass = (status) => {
                    switch (status) {
                      case 'Active': return 'status-active';
                      case 'Completed': return 'status-completed';
                      case 'Cancelled': return 'status-cancelled';
                      default: return 'status-active';
                    }
                  };

                  const getStatusColor = (status) => {
                    switch (status) {
                      case 'Active': return '#4CAF50';
                      case 'Completed': return '#9E9E9E';
                      case 'Cancelled': return '#ffff00';
                      default: return '#4CAF50';
                    }
                  };

                  return (
                    <tr key={token.id}><td><span className="token-badge">{token.dailyTokenId || token.tokenId || token.id}</span></td><td><div className={`status-bar ${getStatusClass(token.status)}`} style={{ backgroundColor: getStatusColor(token.status) }}>{token.status || 'Active'}</div></td><td>{token.counterName || token.counterNumber || '-'}</td><td><span className={`cabin-badge ${getCabinColorClass(token.cabin)}`}>{token.cabin || 'Cabin-1'}</span></td><td>{formatDateTime(token.createdAt)}</td><td>{formatDateTime(token.completedAt)}</td><td>{calculateDuration(token.createdAt, token.completedAt)}</td><td>{token.status === 'Completed' && <button className="cancel-button" onClick={() => handleCancel(token._id || token.id)}>Cancel</button>}</td></tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* NEW: Distribution View */}
      {!loading && !error && view === 'distribution' && distributionData && (
        <div className="distribution-view">
          <h3>Cabin Distribution - Date: {selectedDate}</h3>

          <div className="distribution-grid">
            {Object.entries(distributionData).filter(([key]) => key.startsWith('counter')).map(([counterKey, counterData]) => {
              const counterName = counterKey.replace('counter', 'Counter-');
              return (
                <div key={counterKey} className="counter-section">
                  <h4>{counterName}</h4>
                  <table>
                    <thead>
                      <tr><th>Counter Name</th><th>Cabin</th><th>Token</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(counterData || {}).map(([cabin, tokens]) =>
                        tokens.map((token, idx) => (
                          <tr key={`${counterKey}-${cabin}-${idx}`}><td>{counterName}</td><td className={getCabinColorClass(cabin)}>{cabin}</td><td><strong>{token}</strong></td></tr>
                        ))
                      )}
                      <tr className="total-row"><td colSpan="2"><strong>Total Token</strong></td><td><strong>{Object.values(counterData || {}).reduce((sum, arr) => sum + arr.length, 0)}</strong></td></tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Overall Summary */}
          <div className="overall-summary">
            <h4>Overall Summary</h4>
            <div className="cabin-summary">
              {cabins.map(cabin => (
                <div key={cabin._id} className={`summary-card ${getCabinColorClass(cabin.name)}`}>
                  <h3>{cabin.name}</h3>
                  <p className="count">{distributionData.summary?.[cabin.name] || 0} tokens</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TokenHistory;