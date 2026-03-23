import { useState } from 'react'
import '../styles/Dashboard.css'
import UserManagement from './UserManagement'
import ItemManagement from './ItemManagement'
import CounterManagement from './CounterManagement'
import TokenManagement from './TokenManagement'
import VendorProfile from './VendorProfile'


function UserDashboard({ username, vendorId, onLogout }) {
  const [activeSection, setActiveSection] = useState('users')

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="dashboard-header">
          <h2>USER</h2>
          <p>{username}</p>
        </div>
        <div className="dashboard-nav">

          <button
            className={`nav-button ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            Users
          </button>
          <button
            className={`nav-button ${activeSection === 'items' ? 'active' : ''}`}
            onClick={() => setActiveSection('items')}
          >
            Items
          </button>
          <button
            className={`nav-button ${activeSection === 'counters' ? 'active' : ''}`}
            onClick={() => setActiveSection('counters')}
          >
            Counters
          </button>
          <button
            className={`nav-button ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Profile
          </button>
          <button
            className={`nav-button ${activeSection === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveSection('tokens')}
          >
            Tokens
          </button>
        </div>
        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        {activeSection === 'users' && (
          <div className="management-section">
            <h2>User Management</h2>
            <UserManagement vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'items' && (
          <div className="management-section">
            <h2>Item Management</h2>
            <ItemManagement vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'counters' && (
          <div className="management-section">
            <h2>Counter Management</h2>
            <CounterManagement vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'profile' && (
          <div className="management-section">
            <VendorProfile />
          </div>
        )}

        {activeSection === 'tokens' && (
          <div className="management-section">
            <TokenManagement vendorId={vendorId} />
          </div>
        )}
      </div>
    </div>
  )
}

export default UserDashboard