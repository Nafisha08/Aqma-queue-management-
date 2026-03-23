import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TokenForm.css';

const TokenForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customerName: '',
    mobileNo: '',
    counterNo: '',
    cabin: '',
    selectedItems: [], // Array of {id, name, price, quantity}
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

  /** ---------------- INPUT CHANGE HANDLER ---------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  /** ---------------- VALIDATION ---------------- */
  const validateForm = () => {
    if (!formData.customerName.trim()) return 'Customer name is required';
    if (!formData.mobileNo.trim()) return 'Mobile number is required';
    if (!/^\d{7,15}$/.test(formData.mobileNo.trim())) return 'Enter a valid mobile number (7-15 digits)';
    if (!formData.cabin) return 'Cabin selection is required';
    if (formData.selectedItems.length === 0) return 'At least one service/item is required';
    if (!formData.paymode) return 'Payment mode is required';
    // Removed counter validation since it's auto-assigned
    return '';
  };

  /** ---------------- SOUND + ANNOUNCEMENT ---------------- */
  const playTokenSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
      audio.play().catch(() => console.log('Audio play failed'));
    } catch {
      console.log('Audio not supported');
    }
  };

  const speakTokenAnnouncement = (tokenId, counter) => {
    if ('speechSynthesis' in window) {
      const announcement = `Token ${tokenId} has been generated. Please wait for your turn at Counter ${counter}.`;
      const speech = new SpeechSynthesisUtterance(announcement);
      speech.rate = 0.9;
      speech.pitch = 1;
      window.speechSynthesis.speak(speech);
    }
  };

  /** ---------------- FETCH USER ASSIGNMENT AND STATS ---------------- */
  useEffect(() => {
    const fetchUserAssignment = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || !user?.id) {
          setError('Please log in to continue');
          return;
        }

        // ✅ Use profile endpoint instead of assignment endpoint
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success && data.user) {
          const userData = data.user;
          setUserAssignment({
            counterId: userData.counterId,
            counterName: userData.counterName,
            cabinId: userData.cabinId,
            cabinName: userData.cabinName,
            vendorId: userData.vendorId
          });
          setFormData((prev) => ({
            ...prev,
            counterNo: userData.counterId || ''
          }));

          // Fetch items for this vendor
          if (userData.vendorId) {
            await fetchVendorItems(userData.vendorId, token);
            await fetchCabins(userData.vendorId, token);
          }

          // Fetch collection stats
          await fetchCollectionStats(token);
        } else {
          setError('Failed to load user profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load user profile');
      }
    };

    const fetchVendorItems = async (vendorId, token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/vendor/${vendorId}/items`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setVendorItems(data.items);
        } else {
          setError('No items found for this vendor');
        }
      } catch (err) {
        console.error('Error fetching vendor items:', err);
        setError('Failed to load vendor items');
      }
    };

    const fetchCabins = async (vendorId, token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/cabins`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.cabins)) {
          setCabins(data.cabins);
        }
      } catch (err) {
        console.error('Error fetching cabins:', err);
      }
    };



    const fetchCollectionStats = async (token) => {
      try {
        const res = await fetch(`https://aqma-queue-management.onrender.com/api/tokens/collection-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        if (data.success && data.data) {
          setCollectionStats(data.data);
        }
      } catch (err) {
        console.error('Error fetching collection stats:', err);
      }
    };

    fetchUserAssignment();
  }, []);

  /** ---------------- ITEM MANAGEMENT HANDLERS ---------------- */
  const addItem = (itemId) => {
    const item = vendorItems.find((i) => i.id.toString() === itemId.toString());
    if (!item) return;

    setFormData((prev) => {
      const existingItem = prev.selectedItems.find((si) => si.id.toString() === itemId.toString());
      let newSelectedItems;

      if (existingItem) {
        // Increase quantity if item already exists
        newSelectedItems = prev.selectedItems.map((si) =>
          si.id.toString() === itemId.toString() ? { ...si, quantity: si.quantity + 1 } : si
        );
      } else {
        // Add new item with quantity 1
        newSelectedItems = [
          ...prev.selectedItems,
          { id: item.id, name: item.name, price: item.price || 0, quantity: 1 }
        ];
      }

      // Calculate total amount
      const totalAmount = newSelectedItems.reduce(
        (sum, si) => sum + (si.price * si.quantity),
        0
      );

      return {
        ...prev,
        selectedItems: newSelectedItems,
        amount: totalAmount.toFixed(2)
      };
    });
  };

  const removeItem = (itemId) => {
    setFormData((prev) => {
      const newSelectedItems = prev.selectedItems.filter((si) => si.id.toString() !== itemId.toString());

      // Calculate total amount
      const totalAmount = newSelectedItems.reduce(
        (sum, si) => sum + (si.price * si.quantity),
        0
      );

      return {
        ...prev,
        selectedItems: newSelectedItems,
        amount: totalAmount.toFixed(2)
      };
    });
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setFormData((prev) => {
      const index = prev.selectedItems.findIndex((si) => si.id.toString() === itemId.toString());
      if (index === -1) return prev;

      const newSelectedItems = [...prev.selectedItems];
      newSelectedItems[index] = { ...newSelectedItems[index], quantity: newQuantity };

      // Calculate total amount
      const totalAmount = newSelectedItems.reduce(
        (sum, si) => sum + (si.price * si.quantity),
        0
      );

      return {
        ...prev,
        selectedItems: newSelectedItems,
        amount: totalAmount.toFixed(2)
      };
    });
  };

  // Counter selection handler removed since counter is now readonly

  /** ---------------- FORM SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found. Please login again.');

      const requestData = {
        customerName: formData.customerName.trim(),
        mobileNo: formData.mobileNo.trim(),
        counterNumber: parseInt(formData.counterNo),
        item: formData.selectedItems.map(si => `${si.name} (x${si.quantity})`),
        paymentMode: formData.paymode,
        amount: parseFloat(formData.amount) || 0
      };

      const response = await fetch('https://aqma-queue-management.onrender.com/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to create token');

      const tokenData = result.token;

      // Store token locally
      const existingTokens = JSON.parse(localStorage.getItem('generatedTokens') || '[]');
      existingTokens.push(tokenData);
      localStorage.setItem('generatedTokens', JSON.stringify(existingTokens));
      localStorage.setItem('currentToken', JSON.stringify(tokenData));

      // Trigger updates
      window.dispatchEvent(new CustomEvent('newTokenGenerated', { detail: { token: tokenData } }));

      // Feedback
      playTokenSound();
      speakTokenAnnouncement(tokenData.tokenId, tokenData.counterNumber);

      // Reset form
      setFormData({
        customerName: '',
        mobileNo: '',
        counterNo: userAssignment.counterId || '',
        cabin: '',
        selectedItems: [],
        paymode: 'cash',
        amount: '0.00'
      });

      navigate('/token-success', {
        state: {
          token: tokenData,
          smsSent: result.smsSent,
          smsMessageId: result.smsMessageId
        }
      });
    } catch (err) {
      console.error('Token creation error:', err);
      setError(err.message || 'Failed to create token');
    } finally {
      setIsLoading(false);
    }
  };

  /** ---------------- UI ---------------- */
  return (
    <div className="token-form-container">
      <div className="token-form-card">
        <h2 className="form-title">Generate New Token</h2>

        {/* Counter Info Header */}
        <div className="counter-info-header">
          <div className="counter-number">
            <strong>Counter:</strong> {collectionStats.counterNumber || 'N/A'}
          </div>
          <div className="collection-stats">
            <strong>Today's Collection:</strong> Total ₹{collectionStats.totalCollection} | Cash ₹{collectionStats.cashCollection} | Online ₹{collectionStats.onlineCollection}
          </div>
        </div>

        {userAssignment.cabinName && userAssignment.counterName && (
          <div className="assigned-location">
            <strong>Your Assigned Location:</strong>{' '}
            {userAssignment.cabinName} - {userAssignment.counterName}
          </div>
        )}

        {error && (
          <div className="error-message">
            [Warning] {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="token-form">
          <div className="form-group">
            <label htmlFor="customerName">Customer Name *</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Enter customer name"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobileNo">Mobile Number *</label>
            <input
              type="tel"
              id="mobileNo"
              name="mobileNo"
              value={formData.mobileNo}
              onChange={handleInputChange}
              placeholder="Enter 10-digit mobile number"
              maxLength="15"
              disabled={isLoading}
              required
            />
          </div>

          {/* Counter Selection - Always show assigned counter, readonly */}
          <div className="form-group">
            <label>Assigned Counter *</label>
            <input
              type="text"
              value={userAssignment.counterName || 'No counter assigned'}
              readOnly
              className="readonly-input"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cabin">Cabin *</label>
            <select
              id="cabin"
              name="cabin"
              value={formData.cabin}
              onChange={handleInputChange}
              disabled={isLoading || cabins.length === 0}
              required
            >
              <option value="">Select cabin</option>
              {cabins.map((cabin) => (
                <option key={cabin._id} value={cabin.name}>
                  {cabin.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Items Display */}
          {formData.selectedItems.length > 0 && (
            <div className="selected-items-section">
              <h3>Selected Items:</h3>
              <div className="selected-items-list">
                {formData.selectedItems.map((item) => (
                  <div key={item.id} className="selected-item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">₹{item.price}</span>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        type="button"
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => removeItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="itemSelect">Add Service/Item *</label>
            <select
              id="itemSelect"
              name="itemSelect"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addItem(e.target.value);
                  e.target.value = ''; // Reset select
                }
              }}
              disabled={isLoading || vendorItems.length === 0}
            >
              <option value="">Select service to add</option>
              {vendorItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - ₹{item.price || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="paymode">Payment Mode *</label>
            <select
              id="paymode"
              name="paymode"
              value={formData.paymode}
              onChange={handleInputChange}
              disabled={isLoading}
              required
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              readOnly // <- amount not editable
              placeholder="Auto-filled based on item"
            />
          </div>

          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Generating Token...
              </>
            ) : (
              <>
                🎫 Generate Token
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TokenForm;
