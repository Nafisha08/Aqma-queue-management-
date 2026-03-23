import { useState } from 'react'
import '../styles/Dashboard.css'
import UserManagement from './UserManagement'
import ItemManagement from './ItemManagement'
import CounterManagement from './CounterManagement'
import VendorTokenManagement from './VendorTokenManagement'
import VendorProfile from './VendorProfile'
import CabinManagement from './CabinManagement'
import CashReport from './CashReport'

function VendorDashboard({ username, vendorId, onLogout }) {
  const [activeSection, setActiveSection] = useState('users')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleSectionChange = (section) => {
    setActiveSection(section)
    closeMobileMenu() // Close menu when section is selected
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
            <h2>VENDOR</h2>
            <p>{username}</p>
          </div>
        </div>

        <div className="dashboard-nav">
          <button
            className={`nav-button ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => handleSectionChange('users')}
          >
            <span>👥</span> Users
          </button>

          <button
            className={`nav-button ${activeSection === 'cabins' ? 'active' : ''}`}
            onClick={() => handleSectionChange('cabins')}
          >
            <span>🏠</span> Cabins
          </button>

          <button
            className={`nav-button ${activeSection === 'counters' ? 'active' : ''}`}
            onClick={() => handleSectionChange('counters')}
          >
            <span>🏪</span> Counters
          </button>

          <button
            className={`nav-button ${activeSection === 'items' ? 'active' : ''}`}
            onClick={() => handleSectionChange('items')}
          >
            <span>📦</span> Items
          </button>

          <button
            className={`nav-button ${activeSection === 'tokens' ? 'active' : ''}`}
            onClick={() => handleSectionChange('tokens')}
          >
            <span>🎫</span> Token Management
          </button>

          <button
            className={`nav-button ${activeSection === 'cash-report' ? 'active' : ''}`}
            onClick={() => handleSectionChange('cash-report')}
          >
            <span>💰</span> Cash Report
          </button>

          <button
            className={`nav-button ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => handleSectionChange('profile')}
          >
            <span>👤</span> Profile
          </button>
        </div>

        <button className="logout-button" onClick={onLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      {/* Main Content */}
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
            <VendorTokenManagement vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'cabins' && (
          <div className="management-section">
            <CabinManagement vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'cash-report' && (
          <div className="management-section">
            <CashReport vendorId={vendorId} />
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorDashboard