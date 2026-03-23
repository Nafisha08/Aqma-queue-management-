import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TokenForm.css';

const TokenForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customerName: '',
    mobileNo: '',
    counterNo: '',
    itemSelect: '',
    paymode: 'cash',
    amount: ''
  });

  const [userAssignment, setUserAssignment] = useState({
    cabinId: null,
    cabinName: null,
    counterId: null,
    counterName: null,
    vendorId: null
  });

  const [vendorItems, setVendorItems] = useState([]); // Items linked to the vendor
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /** ---------------- HANDLE INPUT ---------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'mobileNo') processedValue = value.replace(/\D/g, '');

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue
    }));
  };

  /** ---------------- VALIDATION ---------------- */
  const validateForm = () => {
    if (!formData.customerName.trim()) return 'Customer name is required';
    if (!formData.mobileNo.trim()) return 'Mobile number is required';
    if (!/^\d{7,15}$/.test(formData.mobileNo.trim())) return 'Enter a valid mobile number (7-15 digits)';
    if (!formData.itemSelect) return 'Service/Item selection is required';
    if (!formData.paymode) return 'Payment mode is required';
    if (!formData.counterNo) return 'Counter selection is required';
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

  /** ---------------- FETCH USER ASSIGNMENT ---------------- */
  useEffect(() => {
    const fetchUserAssignment = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const user = JSON.parse(localStorage.getItem('user'));

        if (!token || !user?.id) {
          setError('Please log in to continue');
          return;
        }

        const res = await fetch(`https://aqma-queue-management.onrender.com/api/users/assignment/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success && data.assignment) {
          const assign = data.assignment;
          setUserAssignment(assign);
          setFormData((prev) => ({
            ...prev,
            counterNo: assign.counterId || ''
          }));

          // Fetch items for this vendor
          if (assign.vendorId) {
            await fetchVendorItems(assign.vendorId, token);
          }
        } else {
          setError('Failed to load counter assignment');
        }
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError('Failed to load counter assignment');
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

    fetchUserAssignment();
  }, []);

  /** ---------------- ITEM SELECTION HANDLER ---------------- */
  const handleItemSelect = (e) => {
    const selectedItemId = e.target.value;
    const selectedItem = vendorItems.find((item) => item.id === selectedItemId);

    setFormData((prev) => ({
      ...prev,
      itemSelect: selectedItemId,
      amount: selectedItem ? selectedItem.price : ''
    }));
  };

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
        item: [formData.itemSelect],
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
        itemSelect: '',
        paymode: 'cash',
        amount: ''
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

        {userAssignment.cabinName && userAssignment.counterName && (
          <div className="assigned-location">
            <strong>Your Assigned Location:</strong>{' '}
            {userAssignment.cabinName} - {userAssignment.counterName}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
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

          {/* Assigned Counter (Auto-filled, Hidden) */}
          <input type="hidden" name="counterNo" value={userAssignment.counterId || ''} />

          <div className="form-group">
            <label htmlFor="itemSelect">Service/Item *</label>
            <select
              id="itemSelect"
              name="itemSelect"
              value={formData.itemSelect}
              onChange={handleItemSelect}
              disabled={isLoading || vendorItems.length === 0}
              required
            >
              <option value="">Select service</option>
              {vendorItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — ₹{item.price}
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
