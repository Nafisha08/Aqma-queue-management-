import { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentSession } from '../services/session';

axios.defaults.baseURL = 'https://aqma-queue-management-1.onrender.com';

const STYLES = `
.ccd-wrap { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
.ccd-wrap *, .ccd-wrap *::before, .ccd-wrap *::after { box-sizing: border-box; }

/* HEADER */
.ccd-header { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); border-radius: 20px; padding: 30px; margin-bottom: 30px; box-shadow: 0 20px 60px rgba(102,126,234,0.3); position: relative; overflow: hidden; }
.ccd-header-inner { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; gap: 30px; flex-wrap: wrap; }
.ccd-counter-info { display: flex; align-items: center; gap: 20px; }
.ccd-counter-icon { font-size: 48px; background: rgba(255,255,255,0.2); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.3); }
.ccd-counter-info h1 { color: white; font-size: 32px; font-weight: 700; margin: 0; }
.ccd-counter-info p { color: rgba(255,255,255,0.9); font-size: 16px; margin: 5px 0 0; font-weight: 500; }
.ccd-header-stats { display: flex; gap: 20px; flex-wrap: wrap; }
.ccd-quick-stat { background: rgba(255,255,255,0.15); padding: 15px 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); text-align: center; min-width: 80px; }
.ccd-stat-num { display: block; color: white; font-size: 28px; font-weight: 700; }
.ccd-stat-lbl { color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; display: block; }

/* STATS GRID */
.ccd-stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 20px; margin-bottom: 40px; }
.ccd-stat-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; transition: all 0.3s ease; position: relative; overflow: hidden; }
.ccd-stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
.ccd-stat-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.ccd-stat-card.active::before  { background: #3b82f6; }
.ccd-stat-card.completed::before { background: #10b981; }
.ccd-stat-card.cancelled::before { background: #ef4444; }
.ccd-stat-card.total::before   { background: #8b5cf6; }
.ccd-stat-icon { font-size: 32px; margin-bottom: 15px; display: block; }
.ccd-stat-card h3 { font-size: 36px; font-weight: 700; margin: 0; color: #1e293b; }
.ccd-stat-card p  { color: #64748b; font-size: 14px; font-weight: 500; margin: 5px 0 0; text-transform: uppercase; letter-spacing: 0.5px; }

/* TOKENS SECTION */
.ccd-section { background: white; border-radius: 16px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.ccd-section.active-sec  { border-left: 4px solid #3b82f6; background: linear-gradient(135deg,#eff6ff,#dbeafe); }
.ccd-section.done-sec    { border-left: 4px solid #10b981; background: linear-gradient(135deg,#f0fdf4,#dcfce7); }
.ccd-section h3 { font-size: 24px; font-weight: 700; margin: 0 0 25px; color: #1e293b; display: flex; align-items: center; gap: 10px; }

/* EMPTY STATE */
.ccd-empty { text-align: center; padding: 60px 20px; }
.ccd-empty-icon { font-size: 64px; margin-bottom: 20px; display: block; }
.ccd-empty p     { font-size: 18px; color: #64748b; margin: 0 0 10px; font-weight: 500; }
.ccd-empty small { color: #94a3b8; font-size: 14px; }

/* TOKEN BOXES */
.ccd-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); gap: 20px; padding: 10px 0; }
.ccd-token-box { background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 20px rgba(102,126,234,0.3); position: relative; overflow: hidden; border: 2px solid transparent; }
.ccd-token-box:hover { transform: translateY(-8px) scale(1.03); box-shadow: 0 12px 30px rgba(102,126,234,0.5); border-color: rgba(255,255,255,0.5); }
.ccd-box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; position: relative; z-index: 1; }
.ccd-box-label { color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
.ccd-pulse-dot { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; animation: ccd-pulse 2s infinite; box-shadow: 0 0 10px rgba(239,68,68,0.6); }
@keyframes ccd-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} }
.ccd-box-num { font-size: 48px; font-weight: 800; color: white; text-align: center; margin: 20px 0; text-shadow: 0 4px 8px rgba(0,0,0,0.3); position: relative; z-index: 1; letter-spacing: 2px; }
.ccd-box-footer { text-align: center; position: relative; z-index: 1; }
.ccd-cabin-label { color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; display: inline-block; }

/* CABIN ASSIGN */
.ccd-assign-sec { width: 100%; position: relative; z-index: 2; }
.ccd-assign-btn { color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 600; background: rgba(239,68,68,0.3); padding: 6px 12px; border-radius: 20px; display: inline-block; border: 1px solid rgba(255,255,255,0.3); cursor: pointer; transition: all 0.3s ease; }
.ccd-assign-btn:hover { background: rgba(239,68,68,0.5); transform: scale(1.05); }
.ccd-dropdown-wrap { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.95); padding: 6px; border-radius: 20px; }
.ccd-cabin-select { flex: 1; padding: 4px 8px; border: none; background: transparent; color: #1e293b; font-size: 12px; font-weight: 600; cursor: pointer; outline: none; }
.ccd-cancel-btn { background: rgba(239,68,68,0.2); border: none; color: #ef4444; font-size: 14px; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.ccd-cancel-btn:hover { background: rgba(239,68,68,0.4); }

/* MODAL */
.ccd-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(5px); animation: ccd-fade 0.3s ease; }
@keyframes ccd-fade { from{opacity:0} to{opacity:1} }
.ccd-modal { background: white; border-radius: 20px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: ccd-slideup 0.3s ease; }
@keyframes ccd-slideup { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
.ccd-modal-head { background: linear-gradient(135deg,#667eea,#764ba2); padding: 25px 30px; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center; }
.ccd-modal-head h2 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
.ccd-close-btn { background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.ccd-close-btn:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }
.ccd-modal-body { padding: 30px; }
.ccd-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #e2e8f0; transition: background 0.2s; }
.ccd-detail-row:hover { background: #f8fafc; }
.ccd-detail-row:last-child { border-bottom: none; }
.ccd-detail-label { font-weight: 600; color: #475569; font-size: 14px; }
.ccd-detail-val   { color: #1e293b; font-size: 15px; font-weight: 500; text-align: right; }
.ccd-status-badge { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.ccd-status-badge.active    { background: #dbeafe; color: #1e40af; }
.ccd-status-badge.completed { background: #dcfce7; color: #166534; }
.ccd-status-badge.cancelled { background: #fef2f2; color: #991b1b; }

/* COMPLETED LIST */
.ccd-list { display: grid; gap: 20px; }
.ccd-token-item { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; transition: all 0.3s ease; position: relative; }
.ccd-token-item:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.ccd-token-item.completed { border-left: 4px solid #10b981; background: linear-gradient(135deg,#f0fdf4,#f8fafc); }
.ccd-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.ccd-item-num { font-size: 24px; font-weight: 700; color: white; background: linear-gradient(135deg,#667eea,#764ba2); padding: 8px 16px; border-radius: 8px; display: inline-block; }
.ccd-time-badge { background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.ccd-item-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ccd-item-info p { margin: 8px 0; font-size: 14px; color: #475569; line-height: 1.5; }
.ccd-item-info strong { color: #334155; font-weight: 600; display: inline-block; min-width: 80px; }
.ccd-item-status { position: absolute; top: 20px; right: 20px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
.ccd-item-status.completed { background: #dcfce7; color: #166534; }

/* ERROR */
.ccd-error { background: #fef2f2; color: #991b1b; padding: 20px; border-radius: 12px; border: 2px solid #fecaca; text-align: center; margin: 20px 0; }
.ccd-error p { margin: 0 0 15px; font-size: 16px; font-weight: 500; }
.ccd-error button { background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.ccd-error button:hover { background: #dc2626; }

@media(max-width:768px){
  .ccd-header-inner { flex-direction: column; }
  .ccd-counter-info { flex-direction: column; text-align: center; }
  .ccd-counter-info h1 { font-size: 24px; }
  .ccd-stats { grid-template-columns: 1fr 1fr; }
  .ccd-section { padding: 20px; }
  .ccd-grid { grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap: 15px; }
  .ccd-item-info { grid-template-columns: 1fr; }
}
@media(max-width:480px){
  .ccd-wrap { padding: 10px; }
  .ccd-stats { grid-template-columns: 1fr; }
  .ccd-grid { grid-template-columns: repeat(auto-fill,minmax(120px,1fr)); gap: 12px; }
  .ccd-box-num { font-size: 36px; margin: 15px 0; }
  .ccd-detail-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .ccd-detail-val { text-align: left; }
}
`;

function CustomerCounterDashboard({ activeCounter = 1, userProfile }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedToken, setSelectedToken] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cabins, setCabins] = useState([]);
  const [assigningCabin, setAssigningCabin] = useState(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(null);

  const getCounterConfig = (n) => {
    const configs = {
      1: { id: 1, name: userProfile?.counterName || `Counter ${n}`, description: 'General Services', icon: '🏪' },
      2: { id: 2, name: userProfile?.counterName || `Counter ${n}`, description: 'Cash Services', icon: '💰' },
      3: { id: 3, name: userProfile?.counterName || `Counter ${n}`, description: 'Loan Services', icon: '🏦' },
    };
    return configs[n] || { ...configs[1], name: userProfile?.counterName || `Counter ${n}` };
  };

  useEffect(() => {
    fetchData(true);
    fetchCabins();
    const iv = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(iv);
  }, []);

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const { token } = getCurrentSession();
      if (!token) throw new Error('Auth token not found');
      const [activeRes, histRes] = await Promise.all([
        axios.get('/api/tokens/active', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tokens/history', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const active = activeRes.data?.success ? activeRes.data.data : (Array.isArray(activeRes.data) ? activeRes.data : []);
      const hist = histRes.data?.success ? histRes.data.data : (Array.isArray(histRes.data) ? histRes.data : []);
      const combined = [...active];
      hist.forEach(t => { if (!combined.find(c => c._id === t._id || c.tokenId === t.tokenId)) combined.push(t); });
      setTokens(prev => JSON.stringify(prev) !== JSON.stringify(combined) ? combined : prev);
      setError('');
    } catch (e) {
      if (initial) setError('Failed to fetch counter data. Please try again.');
    } finally {
      if (initial) setLoading(false);
    }
  };

  const fetchCabins = async () => {
    try {
      const { token } = getCurrentSession();
      const res = await axios.get('/api/cabins', { headers: { Authorization: `Bearer ${token}` } });
      setCabins(res.data?.success ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    } catch (e) { }
  };

  const handleAssignCabin = async (tokenId, cabinId) => {
    setAssigningCabin(tokenId);
    try {
      const { token } = getCurrentSession();
      const res = await axios.patch(`/api/tokens/${tokenId}/assign-cabin`, { cabinId }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) { await fetchData(false); alert('✅ Cabin assigned!'); setShowAssignDropdown(null); }
    } catch (e) { alert('❌ Failed to assign cabin.'); }
    finally { setAssigningCabin(null); }
  };

  const getCounterTokens = () => tokens.filter(t => {
    const tCtr = t.counterId?._id || t.counterId;
    const uCtr = userProfile?.counterId;
    if (tCtr && uCtr) return tCtr === uCtr;
    if (t.counterNumber !== undefined) return t.counterNumber === activeCounter || t.counterNumber === parseInt(activeCounter);
    return false;
  });

  const allCtr = getCounterTokens();
  const active = allCtr.filter(t => t.status === 'Active');
  const completed = allCtr.filter(t => t.status === 'Completed' || t.status === 'Cancelled');
  const stats = {
    active: allCtr.filter(t => t.status === 'Active').length,
    completed: allCtr.filter(t => t.status === 'Completed').length,
    cancelled: allCtr.filter(t => t.status === 'Cancelled').length,
    total: allCtr.length,
  };

  const cfg = getCounterConfig(activeCounter);

  if (error) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="ccd-wrap">
        <div className="ccd-error">
          <p>{error}</p>
          <button onClick={() => fetchData(true)}>Retry</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="ccd-wrap">

        {/* HEADER */}
        <div className="ccd-header">
          <div className="ccd-header-inner">
            <div className="ccd-counter-info">
              <div className="ccd-counter-icon">{cfg.icon}</div>
              <div>
                <h1>{cfg.name}</h1>
                <p>{cfg.description}</p>
              </div>
            </div>
            <div className="ccd-header-stats">
              <div className="ccd-quick-stat">
                <span className="ccd-stat-num">{stats.active}</span>
                <span className="ccd-stat-lbl">Active</span>
              </div>
              <div className="ccd-quick-stat">
                <span className="ccd-stat-num">{stats.completed}</span>
                <span className="ccd-stat-lbl">Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="ccd-stats">
          {[
            { cls: 'active', icon: '🔄', val: stats.active, label: 'Active Tokens' },
            { cls: 'completed', icon: '✅', val: stats.completed, label: 'Completed' },
            { cls: 'cancelled', icon: '❌', val: stats.cancelled, label: 'Cancelled' },
            { cls: 'total', icon: '📊', val: stats.total, label: 'Total Tokens' },
          ].map(s => (
            <div key={s.cls} className={`ccd-stat-card ${s.cls}`}>
              <span className="ccd-stat-icon">{s.icon}</span>
              <h3>{s.val}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ACTIVE TOKENS */}
        <div className="ccd-section active-sec">
          <h3>🔔 Active Tokens</h3>
          {active.length === 0 ? (
            <div className="ccd-empty">
              <span className="ccd-empty-icon">🎯</span>
              <p>No active tokens at the moment</p>
              <small>All caught up! Waiting for new customers.</small>
            </div>
          ) : (
            <div className="ccd-grid">
              {active.map(t => (
                <div key={t._id || t.tokenId} className="ccd-token-box" onDoubleClick={() => { setSelectedToken(t); setShowModal(true); }} title="Double click to view details">
                  <div className="ccd-box-header">
                    <span className="ccd-box-label">TOKEN NO.</span>
                    <span className="ccd-pulse-dot"></span>
                  </div>
                  <div className="ccd-box-num">{t.dailyTokenId || t.tokenId}</div>
                  <div className="ccd-box-footer">
                    {t.cabin || t.cabinId || t.cabinNo ? (
                      <span className="ccd-cabin-label">🪑 Cabin {t.cabin || t.cabinId || t.cabinNo}</span>
                    ) : (
                      <div className="ccd-assign-sec">
                        {showAssignDropdown === t._id ? (
                          <div className="ccd-dropdown-wrap" onClick={e => e.stopPropagation()}>
                            <select className="ccd-cabin-select" onChange={e => { if (e.target.value) handleAssignCabin(t._id, e.target.value); }} disabled={assigningCabin === t._id}>
                              <option value="">Select Cabin</option>
                              {cabins.map(c => <option key={c._id || c.id} value={c._id || c.id}>Cabin {c.cabinNumber || c.name}</option>)}
                            </select>
                            <button className="ccd-cancel-btn" onClick={e => { e.stopPropagation(); setShowAssignDropdown(null); }}>✕</button>
                          </div>
                        ) : (
                          <button className="ccd-assign-btn" onClick={e => { e.stopPropagation(); setShowAssignDropdown(t._id); }}>🪑 Cabin N/A</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL */}
        {showModal && selectedToken && (
          <div className="ccd-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="ccd-modal" onClick={e => e.stopPropagation()}>
              <div className="ccd-modal-head">
                <h2>Token Details</h2>
                <button className="ccd-close-btn" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <div className="ccd-modal-body">
                {[
                  ['🎫 Token Number', selectedToken.dailyTokenId || selectedToken.tokenId],
                  ['🏪 Counter', `Counter ${activeCounter}`],
                  ['🪑 Cabin', selectedToken.cabin || selectedToken.cabinId || selectedToken.cabinNo || 'Not Assigned'],
                  ['👤 Customer', selectedToken.customerName],
                  ['📱 Mobile', selectedToken.mobileNo],
                  ['🛒 Items', Array.isArray(selectedToken.item) ? selectedToken.item.join(', ') : selectedToken.item],
                  ['💰 Amount', `₹${selectedToken.amount}`],
                  ['⏰ Created', new Date(selectedToken.createdAt).toLocaleString()],
                ].map(([label, val]) => (
                  <div key={label} className="ccd-detail-row">
                    <span className="ccd-detail-label">{label}</span>
                    <span className="ccd-detail-val">{val}</span>
                  </div>
                ))}
                <div className="ccd-detail-row">
                  <span className="ccd-detail-label">📊 Status</span>
                  <span className={`ccd-status-badge ${selectedToken.status.toLowerCase()}`}>{selectedToken.status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETED */}
        <div className="ccd-section done-sec">
          <h3>✅ Completed Today</h3>
          {completed.length === 0 ? (
            <div className="ccd-empty">
              <span className="ccd-empty-icon">📋</span>
              <p>No completed tokens today</p>
              <small>Start serving customers to see completed tokens here.</small>
            </div>
          ) : (
            <div className="ccd-list">
              {completed.slice(0, 10).map(t => (
                <div key={t._id || t.tokenId} className="ccd-token-item completed">
                  <div className="ccd-item-header">
                    <div className="ccd-item-num">{t.dailyTokenId || t.tokenId}</div>
                    <span className="ccd-time-badge">{t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="ccd-item-info">
                    <div>
                      <p><strong>👤 Customer:</strong> {t.customerName}</p>
                      <p><strong>📱 Mobile:</strong> {t.mobileNo}</p>
                      <p><strong>🛒 Items:</strong> {Array.isArray(t.item) ? t.item.join(', ') : t.item}</p>
                      <p><strong>💰 Amount:</strong> ₹{t.amount}</p>
                      <p><strong>🪑 Cabin:</strong> {t.cabin || t.cabinNo || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>⏰ Created:</strong> {new Date(t.createdAt).toLocaleTimeString()}</p>
                      <p><strong>🏪 Vendor:</strong> {t.vendorId?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className={`ccd-item-status ${t.status.toLowerCase()}`}>{t.status.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

export default CustomerCounterDashboard;