import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getAuthHeader } from "../services/auth";
import { getVendorId, getCurrentSession } from "../services/session";
import { validatePhone } from "../utils/validation";
import "../styles/UserManagemet.css";

function UserManagement({ vendorId: propVendorId }) {
  const { vendorId: routeVendorId } = useParams();
  const vendorId = propVendorId || routeVendorId || getVendorId();
  const currentUser = getCurrentSession();

  const [users, setUsers] = useState([]);
  const [vendorData, setVendorData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [counters, setCounters] = useState([]);
  const [vendorCounter, setVendorCounter] = useState(null);
  const [cabins, setCabins] = useState([]);
  const [vendorCabin, setVendorCabin] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    userType: "counter",
    counterId: "",
    cabinId: "",
  });

  const authHeaders = () => ({
    ...getAuthHeader(),
    "Content-Type": "application/json",
  });

  const fetchVendorCounter = async () => {
    if (currentUser?.role === 'vendor' && vendorId) {
      try {
        const response = await axios.get(
          `https://aqma-queue-management-1.onrender.com/api/counters`,
          { headers: authHeaders() }
        );

        if (response.data.success && response.data.counters) {
          const vendorCounters = response.data.counters.filter(counter => {
            let counterVendorId;
            if (typeof counter.vendorId === 'object' && counter.vendorId !== null) {
              counterVendorId = counter.vendorId._id || counter.vendorId.id;
            } else {
              counterVendorId = counter.vendorId;
            }
            return counterVendorId === vendorId && counter.status === 'active';
          });

          if (vendorCounters.length > 0) {
            setVendorCounter(vendorCounters[0]);
            setError("");
          } else {
            setError('Please create a counter first before adding users.');
          }
        } else {
          setError('Failed to load counter information');
        }
      } catch (error) {
        console.error("❌ Failed to load vendor counter:", error);
        setError('Failed to load counter information');
      }
    }
  };

  const fetchCounters = async () => {
    if (currentUser?.role !== 'vendor') {
      try {
        const response = await axios.get(
          `https://aqma-queue-management-1.onrender.com/api/counters`,
          { headers: authHeaders() }
        );
        if (response.data.success) {
          setCounters(response.data.counters.filter(counter => counter.status === 'active'));
        }
      } catch (error) {
        console.error("Failed to load counters:", error);
        setCounters([]);
      }
    }
  };

  const fetchCabins = async () => {
    if (currentUser?.role !== 'vendor') {
      try {
        const response = await axios.get(
          `https://aqma-queue-management-1.onrender.com/api/cabins`,
          { headers: authHeaders() }
        );
        if (response.data.success) {
          setCabins(response.data.cabins.filter(cabin => cabin.isActive));
        }
      } catch (error) {
        console.error("Failed to load cabins:", error);
        setCabins([]);
      }
    }
  };

  const fetchVendorCabin = async () => {
    if (currentUser?.role === 'vendor' && vendorId) {
      try {
        const response = await axios.get(
          `https://aqma-queue-management-1.onrender.com/api/cabins`,
          { headers: authHeaders() }
        );

        if (response.data.success) {
          const vendorCabins = response.data.cabins.filter(cabin => {
            let cabinVendorId;
            if (typeof cabin.vendorId === 'object' && cabin.vendorId !== null) {
              cabinVendorId = cabin.vendorId._id || cabin.vendorId.id;
            } else {
              cabinVendorId = cabin.vendorId;
            }
            return cabinVendorId === vendorId && cabin.isActive;
          });

          if (vendorCabins.length > 0) {
            setVendorCabin(vendorCabins[0]);
          }
        }
      } catch (error) {
        console.error("❌ Failed to load vendor cabin:", error);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVendorData();
    fetchVendorCounter();
    fetchCounters();
    fetchCabins();
    fetchVendorCabin();
  }, [vendorId]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const vendorIdParam = vendorId || 'null';
      const response = await axios.get(
        `https://aqma-queue-management-1.onrender.com/api/users/vendor/${vendorIdParam}`,
        { headers: authHeaders() }
      );
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setError("Failed to load users");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendorData = async () => {
    try {
      const userRole = currentUser?.role || localStorage.getItem('userRole');
      let url;
      if (userRole === 'vendor') {
        url = `https://aqma-queue-management-1.onrender.com/api/vendor-management/profile`;
      } else if (userRole === 'superadmin' && vendorId) {
        url = `https://aqma-queue-management-1.onrender.com/api/vendor-management/vendors/${vendorId}`;
      } else {
        setVendorData(null);
        return;
      }

      const response = await axios.get(url, { headers: authHeaders() });
      if (response.data.success) {
        setVendorData(response.data.vendor);
      } else {
        setVendorData(null);
      }
    } catch (error) {
      console.error("❌ Failed to load vendor data:", error);
      setVendorData(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'userType') {
      setFormData({ ...formData, userType: value, counterId: "", cabinId: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", username: "", userType: "counter", counterId: "", cabinId: "" });
    setErrors({});
    setEditingUser(null);
  };

  const handleAddNew = () => {
    if (currentUser?.role === 'vendor') {
      if (!vendorCounter && !vendorCabin) {
        setError('Please create at least one counter or cabin before adding users.');
        return;
      }
    }
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (user) => {
    let userType = "counter";
    if (user.userType && Array.isArray(user.userType)) {
      if (user.userType.includes("cabin")) userType = "cabin";
      else if (user.userType.includes("counter")) userType = "counter";
    } else if (user.cabinId && !user.counterId) {
      userType = "cabin";
    } else if (user.counterId && !user.cabinId) {
      userType = "counter";
    } else if (user.cabinName && !user.counterName) {
      userType = "cabin";
    } else if (user.counterName && !user.cabinName) {
      userType = "counter";
    }

    setFormData({
      name: user.name || "",
      username: user.username || "",
      userType: userType,
      counterId: user.counterId || "",
      cabinId: user.cabinId || "",
    });
    setErrors({});
    setEditingUser(user);
    setShowForm(true);
  };

  const validateForm = () => {
    const newErrors = {};
    const phoneError = validatePhone(formData.username);
    if (phoneError) newErrors.username = phoneError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (currentUser?.role === 'vendor') {
      if (formData.userType === 'counter' && !vendorCounter) {
        setError('Cannot create user. Please create a counter first.');
        return;
      }
      if (formData.userType === 'cabin' && !vendorCabin) {
        setError('Cannot create user. Please create a cabin first.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const userData = {
        name: formData.name,
        username: formData.username,
        userType: [formData.userType],
      };

      if (editingUser) {
        if (formData.userType === 'counter') userData.cabinId = null;
        else if (formData.userType === 'cabin') userData.counterId = null;
      }

      if (currentUser?.role === 'vendor') {
        if (formData.userType === 'counter' && vendorCounter?._id) {
          userData.counterId = vendorCounter._id;
        } else if (formData.userType === 'cabin' && vendorCabin?._id) {
          userData.cabinId = vendorCabin._id;
        }
      } else {
        if (formData.userType === 'counter' && formData.counterId) {
          userData.counterId = formData.counterId;
        } else if (formData.userType === 'cabin' && formData.cabinId) {
          userData.cabinId = formData.cabinId;
        }
      }

      const vendorIdParam = vendorId || 'null';
      let response;
      if (editingUser) {
        response = await axios.put(
          `https://aqma-queue-management-1.onrender.com/api/users/vendor/${vendorIdParam}/${editingUser.id}`,
          userData,
          { headers: authHeaders() }
        );
      } else {
        response = await axios.post(
          `https://aqma-queue-management-1.onrender.com/api/users/vendor/${vendorIdParam}`,
          userData,
          { headers: authHeaders() }
        );
      }

      if (response.data.success) {
        await fetchUsers();
        setShowForm(false);
        resetForm();
        setError("");
      } else {
        setError(response.data.message || "Failed to save user");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to save user";
      setError(errorMsg);
      if (errorMsg.includes('counter') || errorMsg.includes('cabin') || errorMsg.includes('duplicate')) {
        alert(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const vendorIdParam = vendorId || 'null';
      const response = await axios.delete(
        `https://aqma-queue-management-1.onrender.com/api/users/vendor/${vendorIdParam}/${userId}`,
        { headers: authHeaders() }
      );
      if (response.data.success) await fetchUsers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const vendorIdParam = vendorId || 'null';
      const newStatus = user.isActive !== false ? false : true;
      const response = await axios.put(
        `https://aqma-queue-management-1.onrender.com/api/users/vendor/${vendorIdParam}/${user.id}`,
        { ...user, isActive: newStatus },
        { headers: authHeaders() }
      );
      if (response.data.success) await fetchUsers();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status");
    }
  };

  return (
    <div className="user-management">
      {vendorData && (
        <div className="vendor-info-section" style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#495057' }}>Vendor Information</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            <div><strong>Company Name:</strong> {vendorData.companyName}</div>
            <div><strong>Contact Person:</strong> {vendorData.contactPerson}</div>
            <div><strong>Email:</strong> {vendorData.email}</div>
            <div><strong>Phone:</strong> {vendorData.phone || 'N/A'}</div>
            <div><strong>Alternate Mobile:</strong> {vendorData.alternateMobile || 'N/A'}</div>
            <div><strong>GST No:</strong> {vendorData.gstNo || 'N/A'}</div>
            <div><strong>Category:</strong> {vendorData.category || 'N/A'}</div>
            <div><strong>Subscriptions:</strong> {vendorData.subscription || 'N/A'}</div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Address:</strong> {vendorData.address || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {currentUser?.role === 'vendor' && !vendorCounter && !vendorCabin && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#856404'
        }}>
          <strong>⚠️ No Counter or Cabin Found:</strong> Please create at least one counter or cabin before adding users.
        </div>
      )}

      <div className="user-header">
        <h2>User Management</h2>
        <button
          className="btn-add"
          onClick={handleAddNew}
          disabled={isLoading || (currentUser?.role === 'vendor' && !vendorCounter && !vendorCabin)}
        >
          Add New User
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
              />
              <small className="help-text" style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
                Multiple users can have the same name
              </small>
            </div>

            <div className="form-group">
              <label>Mobile/Username *</label>
              <input
                type="tel"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter 10 digit phone number"
                maxLength="10"
                pattern="\d{10}"
              />
              {errors.username && <div className="error-text">{errors.username}</div>}
              <small className="help-text">This phone number will be used as the username</small>
            </div>

            <div className="form-group">
              <label>User Type *</label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="counter">Counter</option>
                <option value="cabin">Cabin</option>
              </select>
            </div>

            {formData.userType === 'counter' && (
              <div className="form-group">
                <label>Counter *</label>
                {currentUser?.role === 'vendor' ? (
                  <>
                    <input
                      type="text"
                      value={vendorCounter ? vendorCounter.name : 'No counter available'}
                      readOnly
                      disabled
                      className="readonly-input"
                      style={{
                        backgroundColor: '#e9ecef',
                        cursor: 'not-allowed',
                        color: '#495057',
                        border: '1px solid #ced4da',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        width: '100%'
                      }}
                    />
                    <small className="help-text" style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
                      ✅ Counter will be automatically assigned from your vendor account
                    </small>
                  </>
                ) : (
                  <select
                    name="counterId"
                    value={formData.counterId}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a counter</option>
                    {counters.map(counter => (
                      <option key={counter._id} value={counter._id}>{counter.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {formData.userType === 'cabin' && (
              <div className="form-group">
                <label>Cabin *</label>
                {currentUser?.role === 'vendor' ? (
                  <>
                    <input
                      type="text"
                      value={vendorCabin ? vendorCabin.name : 'No cabin available'}
                      readOnly
                      disabled
                      className="readonly-input"
                      style={{
                        backgroundColor: '#e9ecef',
                        cursor: 'not-allowed',
                        color: '#495057',
                        border: '1px solid #ced4da',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        width: '100%'
                      }}
                    />
                    <small className="help-text" style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
                      ✅ Cabin will be automatically assigned from your vendor account
                    </small>
                  </>
                ) : (
                  <select
                    name="cabinId"
                    value={formData.cabinId}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a cabin</option>
                    {cabins.map(cabin => (
                      <option key={cabin._id} value={cabin._id}>{cabin.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="form-buttons">
              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingUser ? "Update" : "Create"}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setShowForm(false); resetForm(); setError(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && !showForm ? (
        <div className="loading">Loading...</div>
      ) : (() => {
        const userRoleUsers = users.filter(user => user.role === "user");
        return userRoleUsers.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">👤</div>
            <h3>No Users Found</h3>
            <p>No users with role "user" found</p>
          </div>
        ) : (
          /* ✅ FIX: maxHeight value added */
          <div className="user-management__table-container" style={{
            maxHeight: '500px',
            overflowY: 'auto',
            overflowX: 'auto',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <table className="users-table">
              <thead style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#f8f9fa',
                zIndex: 1,
                boxShadow: '0 2px 2px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Phone Number</th>
                  <th>Counter/Cabin</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userRoleUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>#{index + 1}</td>
                    <td>{user.name || 'N/A'}</td>
                    <td className="username">{user.username}</td>
                    <td>
                      {user.counterName ? (
                        <span style={{
                          backgroundColor: '#e7f5ff',
                          color: '#1971c2',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontWeight: '500',
                          display: 'inline-block'
                        }}>
                          🏪 {user.counterName}
                        </span>
                      ) : user.cabinName ? (
                        <span style={{
                          backgroundColor: '#fff4e6',
                          color: '#e8590c',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontWeight: '500',
                          display: 'inline-block'
                        }}>
                          🏠 {user.cabinName}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => handleEdit(user)} disabled={isLoading}>Edit</button>
                      <button
                        className={`btn-status ${user.isActive !== false ? 'deactivate' : 'activate'}`}
                        onClick={() => handleToggleStatus(user)}
                        disabled={isLoading}
                      >
                        {user.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(user.id)} disabled={isLoading}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

export default UserManagement;