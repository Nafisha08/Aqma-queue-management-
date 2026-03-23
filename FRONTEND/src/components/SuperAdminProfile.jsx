import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/VendorManagement.css'

function SuperAdminProfile({ username }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    email: '',
    phone: ''
  })
  const [changePassword, setChangePassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(response.data.user)
      setEditForm({
        email: response.data.user.email || '',
        phone: response.data.user.phone || ''
      })
      setError('')
    } catch (err) {
      setError('Failed to load profile')
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/users/profile', editForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('Profile updated successfully')
      setIsEditing(false)
      fetchProfile()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError('Failed to update profile')
      console.error('Profile update error:', err)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (changePassword.newPassword !== changePassword.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/users/change-password', {
        currentPassword: changePassword.currentPassword,
        newPassword: changePassword.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage('Password changed successfully')
      setChangePassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError('Failed to change password')
      console.error('Password change error:', err)
    }
  }

  if (loading) {
    return <div className="loading">Loading profile...</div>
  }

  if (error && !profile) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>Unable to load profile</h3>
          <p>{error}</p>
          <button onClick={fetchProfile} disabled={loading}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="vendor-profile">
      <div className="profile-header">
        <h2>SuperAdmin Profile</h2>
        <button
          className="btn-change-password"
          onClick={() => setIsEditing(true)}
          disabled={loading}
        >
          Edit Profile
        </button>
      </div>

      {message && <div className="success-msg">{message}</div>}
      {error && <div className="error-msg">{error}</div>}

      <div className="profile-content">
        <div className="profile-section">
          <h3>Profile Information</h3>
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="profile-form">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="form-input disabled"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="form-input disabled"
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="info-grid">
              <div className="info-item">
                <label>Username:</label>
                <span>{profile.username}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{profile.email || 'Not set'}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{profile.phone || 'Not set'}</span>
              </div>
              <div className="info-item">
                <label>Role:</label>
                <span>{profile.role}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>Change Password</h3>
          <form onSubmit={handlePasswordChange} className="password-form">
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                value={changePassword.currentPassword}
                onChange={(e) => setChangePassword({...changePassword, currentPassword: e.target.value})}
                className="form-input"
                required
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                value={changePassword.newPassword}
                onChange={(e) => setChangePassword({...changePassword, newPassword: e.target.value})}
                className="form-input"
                required
                minLength={8}
                placeholder="Enter new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                value={changePassword.confirmPassword}
                onChange={(e) => setChangePassword({...changePassword, confirmPassword: e.target.value})}
                className="form-input"
                required
                minLength={8}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminProfile
