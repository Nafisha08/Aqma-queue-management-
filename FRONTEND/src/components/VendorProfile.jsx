import { useState, useEffect } from "react";
import axios from "axios";
import { getAuthHeader } from "../services/auth";
import { validatePassword } from "../utils/validation";
import "../styles/VendorManagement.css";

function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  const authHeaders = () => ({
    ...getAuthHeader(),
    "Content-Type": "application/json",
  });

  // Load vendor profile on component mount
  useEffect(() => {
    fetchVendorProfile();
  }, []);

  // ✅ FIXED: Updated to handle backend response structure
  const fetchVendorProfile = async () => {
    try {
      setIsLoading(true);
      setError(""); // Clear previous errors

      const response = await axios.get(
        `https://aqma-queue-management-1.onrender.com/api/vendor-management/profile`,
        { headers: authHeaders() }
      );

      console.log('✅ Full Response:', response.data); // Debug log

      if (response.data.success) {
        // ✅ FIXED: Backend sends vendor data in response.data.data.vendor
        const vendorData = response.data.data?.vendor || response.data.vendor;

        if (vendorData) {
          console.log('✅ Vendor Data:', vendorData); // Debug log
          setVendor(vendorData);
          setError("");
        } else {
          console.error('❌ Vendor data not found in response');
          setError("Vendor data not found in response");
        }
      } else {
        setError(response.data.message || "Failed to load vendor profile");
      }
    } catch (error) {
      console.error("❌ Error fetching vendor profile:", error);
      console.error("❌ Error response:", error.response?.data);

      const errorMessage = error.response?.data?.message ||
        error.message ||
        "Failed to load vendor profile";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });

    let errorMessage = "";
    if (name === "newPassword") {
      errorMessage = validatePassword(value, false);
    } else if (name === "confirmPassword") {
      if (value !== passwordData.newPassword) {
        errorMessage = "Passwords do not match";
      }
    }

    setPasswordErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords
    const newPasswordError = validatePassword(passwordData.newPassword, false);
    const confirmError = passwordData.newPassword !== passwordData.confirmPassword ? "Passwords do not match" : "";

    if (newPasswordError || confirmError) {
      setPasswordErrors({
        newPassword: newPasswordError,
        confirmPassword: confirmError,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.put(
        `https://aqma-queue-management.onrender.com/api/users/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: authHeaders() }
      );

      if (response.data.success) {
        setShowPasswordForm(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordErrors({});
        setError("");
        alert("Password changed successfully!");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setError("");
  };

  if (isLoading && !vendor) {
    return (
      <div className="loading" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '20px'
      }}>
        <div className="loading-spinner" style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading vendor profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="error-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '20px'
      }}>
        <div className="error-message" style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#856404' }}>
            Unable to load vendor profile
          </h3>
          <p style={{ marginBottom: '20px', color: '#856404' }}>
            {error || "Please try again later"}
          </p>
          <button
            onClick={fetchVendorProfile}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-profile">
      <div className="profile-header">
        <h2>Vendor Profile</h2>
        <button
          className="btn-change-password"
          onClick={() => setShowPasswordForm(true)}
          disabled={isLoading}
        >
          Change Password
        </button>
      </div>

      {error && (
        <div className="error-msg" style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      <div className="profile-content">
        <div className="profile-section">
          <h3>Company Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Company Name:</label>
              <span>{vendor.companyName || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Contact Person:</label>
              <span>{vendor.contactPerson || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{vendor.email || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{vendor.phone || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Alternate Mobile:</label>
              <span>{vendor.alternateMobile || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>GST Number:</label>
              <span>{vendor.gstNo || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Address:</label>
              <span>{vendor.address || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Category:</label>
              <span>{vendor.category || "Not provided"}</span>
            </div>
            <div className="info-item">
              <label>Subscription:</label>
              <span>{vendor.subscription || "No subscription"}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={`status-badge ${vendor.status}`}>
                {vendor.status || "active"}
              </span>
            </div>
            <div className="info-item">
              <label>Member Since:</label>
              <span>
                {vendor.createdAt
                  ? new Date(vendor.createdAt).toLocaleDateString()
                  : "Not available"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showPasswordForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>Current Password *</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  placeholder="Enter new password"
                  className={passwordErrors.newPassword ? "error" : ""}
                />
                {passwordErrors.newPassword && (
                  <span className="error-text">{passwordErrors.newPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                  className={passwordErrors.confirmPassword ? "error" : ""}
                />
                {passwordErrors.confirmPassword && (
                  <span className="error-text">{passwordErrors.confirmPassword}</span>
                )}
              </div>

              <div className="form-buttons">
                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={resetPasswordForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorProfile;