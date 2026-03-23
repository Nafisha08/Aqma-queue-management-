import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STYLES = `
.tf-wrap { width: 100%; max-width: 900px; margin: 0 auto; padding: 24px 20px; font-family: 'Segoe UI', sans-serif; box-sizing: border-box; }
.tf-wrap *, .tf-wrap *::before, .tf-wrap *::after { box-sizing: border-box; }

/* STATS HEADER */
.tf-stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 14px; margin-bottom: 28px; }
.tf-stat-card { border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.tf-stat-card.blue   { background: linear-gradient(135deg,#667eea,#764ba2); color: white; }
.tf-stat-card.green  { background: linear-gradient(135deg,#11998e,#38ef7d); color: white; }
.tf-stat-card.cash   { background: linear-gradient(135deg,#f7971e,#ffd200); color: white; }
.tf-stat-card.online { background: linear-gradient(135deg,#fc4a1a,#f7b733); color: white; }
.tf-stat-icon { font-size: 28px; }
.tf-stat-info { display: flex; flex-direction: column; }
.tf-stat-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9; }
.tf-stat-value { font-size: 20px; font-weight: 700; line-height: 1.2; }

/* FORM CARD */
.tf-card { background: white; border-radius: 20px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
.tf-card-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px; text-align: center; }
.tf-assigned { background: linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08)); border: 1px solid rgba(102,126,234,0.2); border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #7c3aed; font-weight: 600; margin-bottom: 20px; text-align: center; }
.tf-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; color: #dc2626; font-size: 14px; margin-bottom: 16px; }

/* FORM GROUPS */
.tf-form { display: flex; flex-direction: column; gap: 18px; }
.tf-group { display: flex; flex-direction: column; gap: 6px; }
.tf-group label { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; }
.tf-input, .tf-select { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 15px; font-family: 'Segoe UI', sans-serif; color: #1e293b; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
.tf-input:focus, .tf-select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.tf-input.readonly { background: #f8fafc; color: #64748b; cursor: not-allowed; }
.tf-input:disabled, .tf-select:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }

/* ITEMS SECTION */
.tf-items-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
.tf-items-col h4 { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin: 0 0 12px; }
.tf-available-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; }
.tf-item-name  { font-size: 14px; color: #1e293b; font-weight: 500; }
.tf-item-price { font-size: 13px; color: #7c3aed; font-weight: 600; }
.tf-qty-controls { display: flex; align-items: center; gap: 6px; }
.tf-qty-btn { width: 26px; height: 26px; border: none; border-radius: 6px; background: #7c3aed; color: white; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; line-height: 1; }
.tf-qty-btn:hover:not(:disabled) { background: #6d28d9; }
.tf-qty-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
.tf-qty-val { font-size: 14px; font-weight: 600; color: #1e293b; min-width: 20px; text-align: center; }

/* SELECTED ITEMS */
.tf-selected-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.2); border-radius: 8px; margin-bottom: 8px; }
.tf-remove-btn { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 2px 8px; font-size: 13px; cursor: pointer; transition: background 0.2s; font-weight: 700; }
.tf-remove-btn:hover { background: #fee2e2; }
.tf-no-items { font-size: 13px; color: #94a3b8; text-align: center; padding: 16px; }

/* AMOUNT BOX */
.tf-amount-box { background: linear-gradient(135deg,rgba(124,58,237,0.06),rgba(67,56,202,0.06)); border: 1px solid rgba(124,58,237,0.2); border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
.tf-amount-label { font-size: 13px; font-weight: 600; color: #64748b; letter-spacing: 1px; text-transform: uppercase; }
.tf-amount-val { font-size: 24px; font-weight: 800; color: #7c3aed; font-family: 'Orbitron', monospace; }

/* SUBMIT */
.tf-submit { width: 100%; padding: 16px; background: linear-gradient(135deg,#10b981,#059669); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.25s; box-shadow: 0 6px 20px rgba(16,185,129,0.35); display: flex; align-items: center; justify-content: center; gap: 10px; }
.tf-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(16,185,129,0.45); }
.tf-submit:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
.tf-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: tf-spin 0.7s linear infinite; }
@keyframes tf-spin { to { transform: rotate(360deg); } }

@media(max-width:640px){
  .tf-wrap { padding: 14px 10px; }
  .tf-card { padding: 20px 16px; }
  .tf-items-grid { grid-template-columns: 1fr; }
  .tf-stats { grid-template-columns: repeat(2,1fr); }
}
`;

const TokenForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customerName: '',
    mobileNo: '',
    counterNo: '',
    cabin: '',
    selectedItems: [],
    paymode: 'cash',
    amount: '0.00'
  });

  const [collectionStats, setCollectionStats] = useState({
    counterNumber: '',
    totalCollection: '0.00',
    cashCollection: '0.00',
    onlineCollection: '0.00',
    completedTokens: 0
  });

  const [cabins, setCabins] = useState([]);
  const [userAssignment, setUserAssignment] = useState({});
  const [vendorItems, setVendorItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) return 'Customer name is required';
    if (!formData.mobileNo.trim()) return 'Mobile number is required';
    if (!/^\d{7,15}$/.test(formData.mobileNo.trim())) return 'Enter a valid mobile number (7-15 digits)';
    if (!formData.cabin) return 'Cabin selection is required';
    if (formData.selectedItems.length === 0) return 'At least one service/item is required';
    if (!formData.paymode) return 'Payment mode is required';
    return '';
  };

  const playTokenSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
      audio.play().catch(() => { });
    } catch { }
  };

  const speakTokenAnnouncement = (tokenId, counter) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance(`Token ${tokenId} has been generated. Please wait for your turn at Counter ${counter}.`);
      speech.rate = 0.9;
      window.speechSynthesis.speak(speech);
    }
  };

  useEffect(() => {
    const fetchUserAssignment = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user'));
        if (!token || !user?.id) { setError('Please log in to continue'); return; }

        const res = await fetch(`https://aqma-queue-management.onrender.com/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.user) {
          const u = data.user;
          setUserAssignment({ counterId: u.counterId, counterName: u.counterName, cabinId: u.cabinId, cabinName: u.cabinName, vendorId: u.vendorId });
          setFormData(prev => ({ ...prev, counterNo: u.counterId || '' }));
          if (u.vendorId) {
            await fetchVendorItems(u.vendorId, token);
            await fetchCabins(u.vendorId, token);
          }
          await fetchCollectionStats(token);
        } else { setError('Failed to load user profile'); }
      } catch (err) { setError('Failed to load user profile'); }
    };

    const fetchVendorItems = async (vendorId, token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/vendor/${vendorId}/items`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) setVendorItems(data.items);
        else setError('No items found for this vendor');
      } catch { }
    };

    const fetchCabins = async (vendorId, token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/cabins`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && Array.isArray(data.cabins)) setCabins(data.cabins);
      } catch { }
    };

    const fetchCollectionStats = async (token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/tokens/collection-stats`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && data.data) setCollectionStats(data.data);
      } catch { }
    };

    fetchUserAssignment();
  }, []);

  const updateItemTotal = (items) => {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    setFormData(prev => ({ ...prev, selectedItems: items, amount: total.toFixed(2) }));
  };

  const addItem = (itemId) => {
    const item = vendorItems.find(i => i.id.toString() === itemId.toString());
    if (!item) return;
    const existing = formData.selectedItems.find(si => si.id.toString() === itemId.toString());
    const newItems = existing
      ? formData.selectedItems.map(si => si.id.toString() === itemId.toString() ? { ...si, quantity: si.quantity + 1 } : si)
      : [...formData.selectedItems, { id: item.id, name: item.name, price: item.price || 0, quantity: 1 }];
    updateItemTotal(newItems);
  };

  const removeItem = (itemId) => {
    updateItemTotal(formData.selectedItems.filter(si => si.id.toString() !== itemId.toString()));
  };

  const updateQuantity = (itemId, qty) => {
    if (qty < 1) return;
    updateItemTotal(formData.selectedItems.map(si => si.id.toString() === itemId.toString() ? { ...si, quantity: qty } : si));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validateForm();
    if (err) return setError(err);
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found. Please login again.');
      const requestData = {
        customerName: formData.customerName.trim(),
        mobileNo: formData.mobileNo.trim(),
        counterNumber: parseInt(formData.counterNo),
        cabin: formData.cabin,
        item: formData.selectedItems.map(si => `${si.name} (x${si.quantity})`),
        paymentMode: formData.paymode,
        amount: parseFloat(formData.amount) || 0
      };
      const response = await fetch('https://aqma-queue-management.onrender.com/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestData)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to create token');
      const tokenData = result.token;
      const existing = JSON.parse(localStorage.getItem('generatedTokens') || '[]');
      existing.push(tokenData);
      localStorage.setItem('generatedTokens', JSON.stringify(existing));
      localStorage.setItem('currentToken', JSON.stringify(tokenData));
      window.dispatchEvent(new CustomEvent('newTokenGenerated', { detail: { token: tokenData } }));
      playTokenSound();
      speakTokenAnnouncement(tokenData.tokenId, tokenData.counterNumber);
      setFormData({ customerName: '', mobileNo: '', counterNo: userAssignment.counterId || '', cabin: '', selectedItems: [], paymode: 'cash', amount: '0.00' });
      navigate('/token-success', { state: { token: tokenData, smsSent: result.smsSent, smsMessageId: result.smsMessageId } });
    } catch (err) {
      setError(err.message || 'Failed to create token');
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="tf-wrap">

        {/* STATS */}
        <div className="tf-stats">
          <div className="tf-stat-card blue">
            <span className="tf-stat-icon">🏪</span>
            <div className="tf-stat-info">
              <span className="tf-stat-label">Counter</span>
              <span className="tf-stat-value">{collectionStats.counterNumber || userAssignment.counterName || 'N/A'}</span>
            </div>
          </div>
          <div className="tf-stat-card green">
            <span className="tf-stat-icon">💰</span>
            <div className="tf-stat-info">
              <span className="tf-stat-label">Total Collection</span>
              <span className="tf-stat-value">₹{collectionStats.totalCollection}</span>
            </div>
          </div>
          <div className="tf-stat-card cash">
            <span className="tf-stat-icon">💵</span>
            <div className="tf-stat-info">
              <span className="tf-stat-label">Cash</span>
              <span className="tf-stat-value">₹{collectionStats.cashCollection}</span>
            </div>
          </div>
          <div className="tf-stat-card online">
            <span className="tf-stat-icon">📱</span>
            <div className="tf-stat-info">
              <span className="tf-stat-label">Online</span>
              <span className="tf-stat-value">₹{collectionStats.onlineCollection}</span>
            </div>
          </div>
        </div>

        <div className="tf-card">
          <h2 className="tf-card-title">Generate New Token</h2>

          {userAssignment.cabinName && userAssignment.counterName && (
            <div className="tf-assigned">
              📍 Your Location: {userAssignment.cabinName} — {userAssignment.counterName}
            </div>
          )}

          {error && <div className="tf-error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="tf-form">
            {/* Customer Name */}
            <div className="tf-group">
              <label>Customer Name *</label>
              <input className="tf-input" type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Enter customer name" disabled={isLoading} required />
            </div>

            {/* Mobile */}
            <div className="tf-group">
              <label>Mobile No *</label>
              <input className="tf-input" type="tel" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} placeholder="Enter 10-digit mobile number" maxLength="15" disabled={isLoading} required />
            </div>

            {/* Cabin */}
            <div className="tf-group">
              <label>Cabin *</label>
              <select className="tf-select" name="cabin" value={formData.cabin} onChange={handleInputChange} disabled={isLoading || cabins.length === 0} required>
                <option value="">Select cabin</option>
                {cabins.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Counter (readonly) */}
            <div className="tf-group">
              <label>Assigned Counter *</label>
              <input className="tf-input readonly" type="text" value={userAssignment.counterName || 'No counter assigned'} readOnly disabled={isLoading} />
            </div>

            {/* Items */}
            <div className="tf-group">
              <label>Service / Items *</label>
              <div className="tf-items-grid">
                <div className="tf-items-col">
                  <h4>Available Items</h4>
                  {vendorItems.length === 0
                    ? <p className="tf-no-items">Loading items...</p>
                    : vendorItems.map(item => {
                      const selected = formData.selectedItems.find(si => si.id.toString() === item.id.toString());
                      const qty = selected?.quantity || 0;
                      return (
                        <div key={item.id} className="tf-available-item">
                          <div>
                            <div className="tf-item-name">{item.name}</div>
                            <div className="tf-item-price">₹{item.price || 0}</div>
                          </div>
                          <div className="tf-qty-controls">
                            <button type="button" className="tf-qty-btn" onClick={() => qty > 0 ? updateQuantity(item.id, qty - 1) : null} disabled={qty === 0}>−</button>
                            <span className="tf-qty-val">{qty}</span>
                            <button type="button" className="tf-qty-btn" onClick={() => addItem(item.id.toString())}>+</button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <div className="tf-items-col">
                  <h4>Selected Items</h4>
                  {formData.selectedItems.length === 0
                    ? <p className="tf-no-items">No items selected</p>
                    : formData.selectedItems.map(si => (
                      <div key={si.id} className="tf-selected-item">
                        <div>
                          <div className="tf-item-name">{si.name}</div>
                          <div className="tf-item-price">₹{si.price} × {si.quantity}</div>
                        </div>
                        <button type="button" className="tf-remove-btn" onClick={() => removeItem(si.id)}>✕</button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="tf-group">
              <label>Payment Mode *</label>
              <select className="tf-select" name="paymode" value={formData.paymode} onChange={handleInputChange} disabled={isLoading} required>
                <option value="">Select Payment Mode</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Amount */}
            <div className="tf-group">
              <label>Amount (₹)</label>
              <div className="tf-amount-box">
                <span className="tf-amount-label">Total Amount</span>
                <span className="tf-amount-val">₹{formData.amount}</span>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="tf-submit" disabled={isLoading}>
              {isLoading ? <><div className="tf-spinner" /> Generating Token...</> : <>🎫 Generate Token</>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default TokenForm;