// import React from 'react'



import React, { useState } from 'react'
import TokenForm from './TokenForm'
import ActiveTokensTable from './ActiveTokensTable'
import TokenHistory from './TokenHistory'

function TokenManagement({ vendorId }) {
  const [activeSection, setActiveSection] = useState('generate')

  return (
    <div className="token-management-container">
      <div className="management-header">
        <h3>🎫 Token Management for Vendor {vendorId}</h3>
        <p>Complete token management system</p>
      </div>

      {/* Navigation Tabs */}
      <div className="management-nav">
        <button
          className={`nav-tab ${activeSection === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveSection('generate')}
        >
          🎫 Generate Token
        </button>
        <button
          className={`nav-tab ${activeSection === 'active' ? 'active' : ''}`}
          onClick={() => setActiveSection('active')}
        >
          📊 Active Tokens
        </button>
        <button
          className={`nav-tab ${activeSection === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSection('history')}
        >
          📜 Token History
        </button>
      </div>

      {/* Content Sections */}
      <div className="management-content">
        {activeSection === 'generate' && (
          <div className="section-content">
            <div className="section-header">
              <h4>Generate New Token</h4>
              <p>Create a new token for customers</p>
            </div>
            <TokenForm vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'active' && (
          <div className="section-content">
            <div className="section-header">
              <h4>Active Tokens</h4>
              <p>Monitor currently active tokens</p>
            </div>
            <ActiveTokensTable vendorId={vendorId} />
          </div>
        )}

        {activeSection === 'history' && (
          <div className="section-content">
            <div className="section-header">
              <h4>Token History</h4>
              <p>View all past tokens and their status</p>
            </div>
            <TokenHistory vendorId={vendorId} />
          </div>
        )}
      </div>

      <style jsx>{`
        .token-management-container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          margin: 1rem;
        }

        .management-header {
          text-align: center;
          margin-bottom: 2rem;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 1rem;
        }

        .management-header h3 {
          color: #333;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .management-header p {
          color: #666;
          margin: 0;
        }

        .management-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .nav-tab {
          background: transparent;
          border: none;
          padding: 1rem 1.5rem;
          cursor: pointer;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .nav-tab:hover {
          background: #f8f9fa;
          color: #333;
        }

        .nav-tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: #f8f9fa;
        }

        .management-content {
          min-height: 400px;
        }

        .section-content {
          animation: fadeIn 0.3s ease-in;
        }

        .section-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .section-header h4 {
          color: #333;
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
        }

        .section-header p {
          color: #666;
          margin: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .token-management-container {
            margin: 0.5rem;
            padding: 1rem;
          }

          .management-nav {
            flex-wrap: wrap;
          }

          .nav-tab {
            padding: 0.7rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  )
}

export default TokenManagement