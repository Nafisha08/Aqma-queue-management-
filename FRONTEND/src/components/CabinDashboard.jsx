import { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentSession } from '../services/session';
import '../styles/CustomerCounterDashboard.css';

axios.defaults.baseURL = 'https://aqma-queue-management-1.onrender.com';

function CabinDashboard({ activeCabin = 1, userProfile }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [completedItems, setCompletedItems] = useState({});
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const cabinNumber = userProfile?.cabinNumber || activeCabin;
  const cabinId = userProfile?.cabinId;
  const cabinName = userProfile?.cabinName || `Cabin ${cabinNumber}`;

  console.log('🏠 CabinDashboard initialized:', { activeCabin, cabinNumber, cabinId, cabinName, userProfile });

  const getCabinConfig = (cabinNum) => {
    const configs = {
      1: { id: 1, name: cabinName, description: 'General Services', icon: '🏪', services: ['Account Opening', 'Balance Inquiry', 'General Queries'] },
      2: { id: 2, name: cabinName, description: 'Cash Services', icon: '💰', services: ['Cash Deposit', 'Cash Withdrawal', 'Currency Exchange'] },
      3: { id: 3, name: cabinName, description: 'Loan Services', icon: '🏦', services: ['Loan Application', 'Loan Payment', 'Document Verification'] }
    };
    return configs[cabinNum] || { id: cabinNum, name: cabinName, description: 'Service Center', icon: '🏠', services: ['Customer Service'] };
  };

  useEffect(() => { fetchTokens(true); }, [cabinId]);
  useEffect(() => {
    const interval = setInterval(() => { fetchTokens(false); }, 10000);
    return () => clearInterval(interval);
  }, [cabinId]);

  const fetchTokens = async (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);

    try {
      const { token } = getCurrentSession();
      if (!token) throw new Error('Authentication token not found. Please login again.');

      console.log('📡 Fetching tokens for cabin:', { cabinId, cabinNumber });

      const [activeResponse, historyResponse] = await Promise.all([
        axios.get('/api/tokens/active', { headers: { Authorization: `Bearer ${token}` }, params: { cabinId } }),
        axios.get('/api/tokens/history', { headers: { Authorization: `Bearer ${token}` }, params: { cabinId } })
      ]);

      let activeTokens = [];
      if (activeResponse.data?.success && activeResponse.data?.data) activeTokens = activeResponse.data.data;
      else if (Array.isArray(activeResponse.data)) activeTokens = activeResponse.data;

      let historyTokens = [];
      if (historyResponse.data?.success && historyResponse.data?.data) historyTokens = historyResponse.data.data;
      else if (Array.isArray(historyResponse.data)) historyTokens = historyResponse.data;

      const combinedTokens = [...activeTokens];
      historyTokens.forEach(token => {
        if (!combinedTokens.find(t => t._id === token._id || t.tokenId === token.tokenId)) {
          combinedTokens.push(token);
        }
      });

      console.log('✅ Tokens fetched:', { active: activeTokens.length, history: historyTokens.length, combined: combinedTokens.length });

      setTokens(prevTokens => {
        const hasChanged = JSON.stringify(prevTokens) !== JSON.stringify(combinedTokens);
        return hasChanged ? combinedTokens : prevTokens;
      });

      setError('');
    } catch (err) {
      console.error('❌ Error fetching tokens:', err);
      if (isInitialLoad) setError('Failed to fetch cabin data. Please try again.');
    } finally {
      if (isInitialLoad) setLoading(false);
      else setRefreshing(false);
    }
  };

  const getCabinTokens = () => {
    return tokens.filter(token => {
      if (token.cabinId === cabinId) return true;
      if (token.cabinNumber === cabinNumber) return true;
      return !token.cabinId && !token.cabinNumber;
    });
  };

  const getCabinStats = () => {
    const cabinTokens = getCabinTokens();
    const activeTokens = cabinTokens.filter(token => token.status === 'Active');
    const completedTokens = cabinTokens.filter(token => token.status === 'Completed');
    const cancelledTokens = cabinTokens.filter(token => token.status === 'Cancelled');
    return { active: activeTokens.length, completed: completedTokens.length, cancelled: cancelledTokens.length, total: cabinTokens.length };
  };

  const handleTokenClick = (token) => {
    console.log('🎫 Token clicked:', token);
    setSelectedToken(token);
    setShowModal(true);
    const items = Array.isArray(token.item) ? token.item : [token.item];
    const itemsState = {};
    items.forEach((item, index) => { itemsState[index] = token.status === 'Completed'; });
    setCompletedItems(itemsState);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedToken(null);
    setCompletedItems({});
  };

  const toggleItemCompletion = (index) => {
    setCompletedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const areAllItemsCompleted = () => {
    const items = Array.isArray(selectedToken?.item) ? selectedToken.item : [selectedToken?.item];
    return items.every((_, index) => completedItems[index]);
  };

  const handleMarkAsCompleted = async () => {
    if (!selectedToken) return;
    setUpdatingStatus(true);
    try {
      const { token } = getCurrentSession();
      if (!token) {
        alert('🔒 Session expired. Please login again.');
        return;
      }

      const tokenIdentifier = selectedToken.tokenId || selectedToken._id;
      console.log('🔄 Completing token:', tokenIdentifier);

      const response = await axios.put(`/api/tokens/${tokenIdentifier}`, { status: 'Completed' }, { headers: { Authorization: `Bearer ${token}` } });

      console.log('✅ Token completed:', response.data);

      if (response.data?.success) {
        await fetchTokens(false);
        closeModal();
        alert('✅ Token marked as completed!');
      }
    } catch (err) {
      console.error('❌ Error updating token:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update token status';
      alert(`❌ ${errorMsg}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMoveToActive = async () => {
    if (!selectedToken) return;
    setUpdatingStatus(true);
    try {
      const { token } = getCurrentSession();
      if (!token) {
        alert('🔒 Session expired. Please login again.');
        return;
      }

      // ✅ FIX: Use PUT instead of PATCH (CORS issue)
      const tokenIdentifier = selectedToken.tokenId || selectedToken._id;
      console.log('🔄 Moving token to active:', tokenIdentifier);

      const response = await axios.put(`/api/tokens/${tokenIdentifier}`, { status: 'Active' }, { headers: { Authorization: `Bearer ${token}` } });

      console.log('✅ Token moved to active:', response.data);

      if (response.data?.success) {
        await fetchTokens(false);
        closeModal();
        alert('✅ Token moved back to Active!');
      }
    } catch (err) {
      console.error('❌ Error updating token:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update token status';
      alert(`❌ ${errorMsg}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const stats = getCabinStats();
  const activeTokens = getCabinTokens().filter(token => token.status === 'Active');
  const completedTokens = getCabinTokens().filter(token => token.status === 'Completed' || token.status === 'Cancelled');
  const cabinConfig = getCabinConfig(cabinNumber);

  if (loading) {
    return (
      <div className="customer-counter-dashboard">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading cabin data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-counter-dashboard">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchTokens(true)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', marginBottom: '30px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '60px' }}>{cabinConfig.icon}</div>
              <div>
                <h1 style={{ margin: '0 0 5px 0', fontSize: '2em' }}>{cabinConfig.name}</h1>
                <p style={{ margin: '0 0 5px 0', opacity: 0.9 }}>{cabinConfig.description}</p>
                <small style={{ opacity: 0.7 }}>Cabin #{cabinNumber}</small>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.active}</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Active</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.completed}</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔄</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.active}</div>
            <div style={{ color: '#6b7280' }}>Active Tokens</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.completed}</div>
            <div style={{ color: '#6b7280' }}>Completed</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>❌</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{stats.cancelled}</div>
            <div style={{ color: '#6b7280' }}>Cancelled</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>{stats.total}</div>
            <div style={{ color: '#6b7280' }}>Total Tokens</div>
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#1f2937' }}>🔔 Active Tokens</h3>
          {activeTokens.length === 0 ? (
            <div style={{ background: 'white', padding: '60px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎯</div>
              <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '10px' }}>No active tokens at the moment</p>
              <small style={{ color: '#9ca3af' }}>All caught up! Waiting for new customers.</small>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {activeTokens.map((token) => (
                <div key={token._id} onClick={() => handleTokenClick(token)} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px 20px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)', color: 'white' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'; }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '10px' }}>TOKEN NO.</div>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>{token.dailyTokenId || token.tokenId}</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>👤 {token.customerName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showModal && selectedToken && (
          <div onClick={closeModal} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '0', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)' }}>
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '20px 20px 0 0', position: 'relative' }}>
                <button onClick={closeModal} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '10px' }}>TOKEN NUMBER</div>
                  <div style={{ fontSize: '56px', fontWeight: 'bold' }}>{selectedToken.dailyTokenId || selectedToken.tokenId}</div>
                </div>
              </div>
              <div style={{ padding: '30px' }}>
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>👤 Customer:</span>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{selectedToken.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>📱 Mobile:</span>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{selectedToken.mobileNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>💰 Amount:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '18px' }}>₹{selectedToken.amount.toLocaleString()}</span>
                  </div>
                </div>
                <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#1f2937', fontSize: '18px', fontWeight: 'bold' }}>📋 Selected Items ({(Array.isArray(selectedToken.item) ? selectedToken.item : [selectedToken.item]).length})</h3>
                  <div>
                    {(Array.isArray(selectedToken.item) ? selectedToken.item : [selectedToken.item]).map((item, index) => (
                      <div key={index} onClick={() => selectedToken.status === 'Active' && toggleItemCompletion(index)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', marginBottom: '12px', background: completedItems[index] ? '#d1fae5' : '#f9fafb', borderRadius: '12px', cursor: selectedToken.status === 'Active' ? 'pointer' : 'default', border: completedItems[index] ? '2px solid #10b981' : '2px solid #e5e7eb', transition: 'all 0.2s ease', boxShadow: completedItems[index] ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <input type="checkbox" checked={completedItems[index] || false} onChange={() => selectedToken.status === 'Active' && toggleItemCompletion(index)} disabled={selectedToken.status !== 'Active'} onClick={(e) => e.stopPropagation()} style={{ width: '22px', height: '22px', cursor: selectedToken.status === 'Active' ? 'pointer' : 'not-allowed', accentColor: '#10b981' }} />
                        <span style={{ flex: 1, fontSize: '16px', textDecoration: completedItems[index] ? 'line-through' : 'none', color: completedItems[index] ? '#059669' : '#374151', fontWeight: completedItems[index] ? '600' : '400' }}>{item}</span>
                        {completedItems[index] && <span style={{ color: '#10b981', fontSize: '20px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
                <div style={{ marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#6b7280' }}>⏰ Created:</span>
                    <span style={{ color: '#1f2937' }}>{new Date(selectedToken.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#6b7280' }}>📊 Status:</span>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', background: selectedToken.status === 'Active' ? '#dbeafe' : '#d1fae5', color: selectedToken.status === 'Active' ? '#1e40af' : '#065f46' }}>{selectedToken.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  {selectedToken.status === 'Active' && (
                    <button onClick={handleMarkAsCompleted} disabled={!areAllItemsCompleted() || updatingStatus} style={{ padding: '14px 28px', background: !areAllItemsCompleted() || updatingStatus ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: !areAllItemsCompleted() || updatingStatus ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s ease', opacity: !areAllItemsCompleted() || updatingStatus ? 0.6 : 1 }}>{updatingStatus ? '⏳ Updating...' : '✅ Mark as Completed'}</button>
                  )}
                  {selectedToken.status === 'Completed' && (
                    <button onClick={handleMoveToActive} disabled={updatingStatus} style={{ padding: '14px 28px', background: updatingStatus ? '#9ca3af' : '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', cursor: updatingStatus ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s ease' }}>{updatingStatus ? '⏳ Updating...' : '🔄 Move to Active'}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#1f2937' }}>✅ Completed Today</h3>
          {completedTokens.length === 0 ? (
            <div style={{ background: 'white', padding: '60px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>📋</div>
              <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '10px' }}>No completed tokens today</p>
              <small style={{ color: '#9ca3af' }}>Start serving customers to see completed tokens here.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {completedTokens.map((token) => (
                <div key={token._id} onClick={() => handleTokenClick(token)} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', borderLeft: '4px solid #10b981' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(5px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>{token.dailyTokenId || token.tokenId}</div>
                    <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: '#d1fae5', color: '#065f46' }}>{token.completedAt ? new Date(token.completedAt).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: '#4b5563' }}>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>👤 Customer:</strong> {token.customerName}</p>
                      <p style={{ margin: '5px 0' }}><strong>📱 Mobile:</strong> {token.mobileNo}</p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>🛒 Items:</strong> {Array.isArray(token.item) ? token.item.join(', ') : token.item}</p>
                      <p style={{ margin: '5px 0' }}><strong>💰 Amount:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{token.amount.toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {refreshing && (
          <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', zIndex: 1000 }}>🔄 Refreshing...</div>
        )}
      </div>
    </div>
  );
}

export default CabinDashboard;