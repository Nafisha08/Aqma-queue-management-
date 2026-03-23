import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/Dashboard.css'
import VendorManagement from './VendorManagement'
import SubscriptionManagement from './SubscriptionManagement'
import SuperAdminProfile from './SuperAdminProfile'

function SuperAdminDashboard({ username, onLogout }) {
  const [activeTab, setActiveTab] = useState('vendors')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    closeMobileMenu() // Close menu when tab is selected
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay - Click to close menu */}
      {isMobileMenuOpen && (
        <div
          className="mobile-nav-overlay active"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Hamburger Menu Button - Only visible on mobile */}
      <button className="hamburger-menu" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar with mobile-open class */}
      <div className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="dashboard-header">
          <div>
            <h2>SuperAdmin</h2>
           
          </div>
        </div>

        <div className="dashboard-nav">
          <button
            className={`nav-button ${activeTab === 'vendors' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendors')}
          >
            Vendor Management
          </button>

          <button
            className={`nav-button ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            Subscription Management
          </button>
          <button
            className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>

        <button className="logout-button" onClick={onLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === 'vendors' && <VendorManagement />}
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        {activeTab === 'profile' && <SuperAdminProfile username={username} />}
      </div>
    </div>
  )
}

export default SuperAdminDashboard