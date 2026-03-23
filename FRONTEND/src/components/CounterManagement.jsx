import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'https://aqma-queue-management-1.onrender.com/api'

function CounterManagement({ vendorId }) {
  const [counters, setCounters] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCounter, setEditingCounter] = useState(null)

  // Form state - ✅ CABIN REMOVED
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    purpose: '',
    status: 'active'
  })

  // Available statuses for counters
  const availableStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Under Maintenance' }
  ]

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token')
  }

  // Fetch counters on component mount
  useEffect(() => {
    fetchCounters()
  }, [vendorId])

  // Fetch all counters - REAL API CALL
  const fetchCounters = async () => {
    setIsLoading(true)
    try {
      const token = getToken()

      const response = await axios.get(`${API_URL}/counters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Counters fetched:', response.data)

      if (response.data.success) {
        const validCounters = response.data.counters.filter(counter => counter._id)
        setCounters(validCounters)
        setError('')
      } else {
        setError('Failed to fetch counters')
      }
    } catch (err) {
      setError('Failed to fetch counters: ' + (err.response?.data?.message || err.message))
      console.error('Fetch counters error:', err)
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

  // Reset form - ✅ CABIN REMOVED
  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      purpose: '',
      status: 'active'
    })
    setEditingCounter(null)
  }

  // Open form for creating new counter
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // Open form for editing counter - ✅ CABIN REMOVED
  const handleEdit = (counter) => {
    if (!counter || !counter._id) {
      setError('Cannot edit counter: Invalid counter data (missing ID)')
      console.error('Invalid counter for editing:', counter)
      return
    }

    setFormData({
      name: counter.name,
      location: counter.location || '',
      purpose: counter.purpose || '',
      status: counter.status || 'active'
    })
    setEditingCounter(counter)
    setShowForm(true)
    setError('')
  }

  // Handle form submission - REAL API CALL
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const token = getToken()
      const counterData = {
        ...formData,
        vendorId: vendorId || null
      }

      if (editingCounter) {
        if (!editingCounter._id) {
          setError('Cannot update counter: Missing counter ID')
          console.error('Editing counter without _id:', editingCounter)
          return
        }

        console.log('Updating counter:', editingCounter._id, 'with data:', counterData)

        const response = await axios.put(
          `${API_URL}/counters/${editingCounter._id}`,
          counterData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.data.success) {
          console.log('Counter updated successfully')
          fetchCounters()
          setError('')
        }
      } else {
        console.log('Creating new counter with data:', counterData)

        const response = await axios.post(
          `${API_URL}/counters`,
          counterData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.data.success) {
          console.log('Counter created successfully')
          fetchCounters()
          setError('')
        }
      }

      setShowForm(false)
      resetForm()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message
      setError('Failed to save counter: ' + errorMsg)
      console.error('Save counter error:', err)
      console.error('Error response:', err.response?.data)
    }
  }

  // Handle counter deletion - REAL API CALL
  const handleDelete = async (counter) => {
    if (!counter || !counter._id) {
      setError('Cannot delete counter: Invalid counter data (missing ID)')
      console.error('Invalid counter for deletion:', counter)
      return
    }

    if (!confirm(`Are you sure you want to delete counter "${counter.name}"?`)) {
      return
    }

    try {
      const token = getToken()

      console.log('Deleting counter:', counter._id)

      const response = await axios.delete(`${API_URL}/counters/${counter._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success) {
        console.log('Counter deleted successfully')
        fetchCounters()
        setError('')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message
      setError('Failed to delete counter: ' + errorMsg)
      console.error('Delete counter error:', err)
      console.error('Error response:', err.response?.data)
    }
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Counter Management</h2>
        <button className="add-button" onClick={handleAddNew}>
          Add New Counter
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingCounter ? 'Edit Counter' : 'Add New Counter'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter counter name"
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location (optional)"
              />
            </div>

            {/* ✅ CABIN FIELD REMOVED */}

            <div className="form-group">
              <label>Purpose</label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                placeholder="Counter purpose (e.g., General services)"
              />
            </div>

            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                {availableStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-buttons">
              <button type="submit" className="submit-button">
                {editingCounter ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                  setError('')
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
      ) : counters.length === 0 ? (
        <div className="no-data">No counters found. Add your first counter!</div>
      ) : (
        <div className="table-container" style={{
          maxHeight: '500px',
          overflowY: 'auto',
          overflowX: 'auto',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <table className="data-table">
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
                <th>Location</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((counter, index) => (
                <tr key={counter._id || `counter-${index}`}>
                  <td>#{index + 1}</td>
                  <td>{counter.name}</td>
                  <td>{counter.location || '-'}</td>
                  <td>{counter.purpose || '-'}</td>
                  <td>
                    <span className={`status-badge ${counter.status}`}>
                      {counter.status.charAt(0).toUpperCase() + counter.status.slice(1)}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(counter)}
                      disabled={!counter._id}
                      title={!counter._id ? 'Cannot edit: Invalid counter data' : 'Edit counter'}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(counter)}
                      disabled={!counter._id}
                      title={!counter._id ? 'Cannot delete: Invalid counter data' : 'Delete counter'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CounterManagement