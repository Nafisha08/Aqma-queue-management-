import { useState, useEffect } from 'react'
import axios from 'axios'
import UserManagement from './UserManagement'
import ItemManagement from './ItemManagement'
import CounterManagement from './CounterManagement'

function VendorManagement() {
  const [vendors, setVendors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [activeTab, setActiveTab] = useState('vendors')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [selectedItems, setSelectedItems] = useState(null)
  const [selectedCounter, setSelectedCounter] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors()
  }, [])

  // Fetch all vendors
  const fetchVendors = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('http://localhost:4000/api/vendors', {
        headers: { 
          'user-role': 'superadmin',
          'Content-Type': 'application/json'
        }
      })
      setVendors(response.data)
      setError('')
    } catch (err) {
      setError('Failed to fetch vendors')
      console.error('Fetch vendors error:', err)
      if (err.response) {
        console.error('Error response data:', err.response.data)
        console.error('Error response status:', err.response.status)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: ''
    })
    setEditingVendor(null)
  }

  // Open form for creating new vendor
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // Open form for editing vendor
  const handleEdit = (vendor) => {
    setFormData({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone || '',
      address: vendor.address || ''
    })
    setEditingVendor(vendor)
    setShowForm(true)
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (editingVendor) {
        // Update existing vendor
        const updateUrl = `http://localhost:4000/api/vendors/${editingVendor.id}`
        console.log('Update URL:', updateUrl)
        await axios.put(updateUrl, formData, {
          headers: { 
            'user-role': 'superadmin',
            'Content-Type': 'application/json'
          }
        })
      } else {
        // Create new vendor
        const createUrl = 'http://localhost:4000/api/vendors'
        console.log('Create URL:', createUrl)
        await axios.post(createUrl, formData, {
          headers: { 
            'user-role': 'superadmin',
            'Content-Type': 'application/json'
          }
        })
      }
      
      // Refresh vendors list
      await fetchVendors()
      setShowForm(false)
      resetForm()
      setError('') // Clear any previous errors
    } catch (err) {
      setError(editingVendor ? 'Failed to update vendor' : 'Failed to create vendor')
      console.error('Submit form error:', err)
      if (err.response) {
        console.error('Error response data:', err.response.data)
        console.error('Error response status:', err.response.status)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle vendor deletion
  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return
    
    setIsLoading(true)
    setError('') // Clear any previous errors
    try {
      console.log(`Attempting to delete vendor with ID: ${vendorId}`)
      
      // Make sure we're using the correct URL and headers
      const url = `http://localhost:4000/api/vendors/${vendorId}`
      console.log('Delete URL:', url)
      
      // Use XMLHttpRequest for delete operation
      const xhr = new XMLHttpRequest()
      xhr.open('DELETE', url, true)
      xhr.setRequestHeader('user-role', 'superadmin')
      xhr.setRequestHeader('Content-Type', 'application/json')
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('Delete vendor response:', xhr.responseText)
          
          // If we're currently editing this vendor, close the form
          if (editingVendor && editingVendor.id === vendorId) {
            setShowForm(false)
            resetForm()
          }
          
          fetchVendors()
          setError('') // Clear any previous errors
        } else {
          console.error('Delete vendor error:', xhr.status, xhr.statusText)
          setError(`Failed to delete vendor: ${xhr.statusText}`)
        }
        setIsLoading(false)
      }
      
      xhr.onerror = function() {
        console.error('Delete vendor network error')
        setError('Network error when trying to delete vendor')
        setIsLoading(false)
      }
      
      xhr.send()
      return // Early return since we're handling loading state in callbacks
    } catch (err) {
      setError(`Failed to delete vendor: ${err.message}`)
      console.error('Delete vendor error:', err)
      if (err.response) {
        console.error('Error response data:', err.response.data)
        console.error('Error response status:', err.response.status)
        console.error('Error response headers:', err.response.headers)
      } else if (err.request) {
        console.error('Error request:', err.request)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle vendor selection for user management
  const handleManageUsers = (vendor) => {
    setSelectedVendor(vendor)
    setActiveTab('users')
  }

  // Handle vendor selection for item management
  const handleManageItems = (vendor) => {
    setSelectedVendor(vendor)
    setActiveTab('items')
  }

  // Handle vendor selection for counter management
  const handleManageCounters = (vendor) => {
    setSelectedVendor(vendor)
    setActiveTab('counters')
  }

  // Handle back to vendors list
  const handleBackToVendors = () => {
    setSelectedVendor(null)
    setActiveTab('vendors')
  }

  return (
    <div className="management-container">
      {activeTab === 'vendors' ? (
        <>
          <div className="management-header">
            <h2>Vendor Management</h2>
            <button className="add-button" onClick={handleAddNew}>
              Add New Vendor
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {showForm && (
            <div className="form-container">
              <h3>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
                <div className="form-buttons">
                  <button type="submit" className="submit-button">
                    {editingVendor ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : vendors.length === 0 ? (
            <div className="no-data">No vendors found</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>{vendor.id}</td>
                      <td>{vendor.name}</td>
                      <td>{vendor.email}</td>
                      <td>{vendor.phone || '-'}</td>
                      <td>{vendor.address || '-'}</td>
                      <td className="action-buttons">
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(vendor)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(vendor.id)}
                        >
                          Delete
                        </button>
                        <div className="token-management-container">
                          <button
                            className="token-management-button"
                            onClick={() => alert('Token Management clicked for ' + vendor.name)}
                          >
                            Token Management
                          </button>
                        </div>
                        <button
                        className="action-button manage"
                        onClick={() => handleManageUsers(vendor)}
                      >
                        Manage Users
                      </button>
                      <button
                        className="action-button manage"
                        onClick={() => handleManageItems(vendor)}
                      >
                        Manage Items
                      </button>
                      <button
                        className="action-button manage"
                        onClick={() => handleManageCounters(vendor)}
                      >
                        Manage Counters
                      </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : activeTab === 'users' && selectedVendor ? (
        <div className="user-management-section">
          <div className="back-navigation">
            <button className="back-button" onClick={handleBackToVendors}>
              ← Back to Vendors
            </button>
            <h3>Managing Users for: {selectedVendor.name}</h3>
          </div>
          <UserManagement vendorId={selectedVendor.id} />
        </div>
      ) : activeTab === 'items' && selectedVendor ? (
        <div className="item-management-section">
          <div className="back-navigation">
            <button className="back-button" onClick={handleBackToVendors}>
              ← Back to Vendors
            </button>
            <h3>Managing Items for: {selectedVendor.name}</h3>
          </div>
          <ItemManagement vendorId={selectedVendor.id} />
        </div>
      ) : activeTab === 'counters' && selectedVendor ? (
        <div className="counter-management-section">
          <div className="back-navigation">
            <button className="back-button" onClick={handleBackToVendors}>
              ← Back to Vendors
            </button>
            <h3>Managing Counters for: {selectedVendor.name}</h3>
          </div>
          <CounterManagement vendorId={selectedVendor.id} />
        </div>
      ) : null}
    </div>
  )
}

export default VendorManagement