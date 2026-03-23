import { useState, useEffect } from 'react'
import axios from 'axios'
import { getAuthHeader } from '../services/auth'
import { getVendorId } from '../services/session'

function CabinManagement({ vendorId: propVendorId }) {
  const vendorId = propVendorId || getVendorId()
  const [cabins, setCabins] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCabin, setEditingCabin] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    cabinNumber: '',
    description: '',
    isActive: 'true'
  })

  useEffect(() => {
    fetchCabins()
  }, [vendorId])

  const fetchCabins = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('/api/cabins', {
        headers: getAuthHeader()
      })

      if (response.data.success) {
        setCabins(response.data.cabins)
      }
    } catch (error) {
      setError('Failed to load cabins')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cabinNumber: '',
      description: '',
      isActive: 'true'
    })
    setEditingCabin(null)
  }

  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (cabin) => {
    setFormData({
      name: cabin.name,
      description: cabin.description || '',
      isActive: cabin.isActive.toString()
    })
    setEditingCabin(cabin)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Cabin name is required')
      return
    }

    setIsLoading(true)

    try {
      const cabinData = {
        ...formData,
        isActive: formData.isActive === 'true'
      }

      let response
      if (editingCabin) {
        response = await axios.put(`/api/cabins/${editingCabin._id}`, cabinData, {
          headers: getAuthHeader()
        })
      } else {
        response = await axios.post('/api/cabins', cabinData, {
          headers: getAuthHeader()
        })
      }

      if (response.data.success) {
        await fetchCabins()
        setShowForm(false)
        resetForm()
        setError('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save cabin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (cabinId) => {
    if (!window.confirm('Are you sure you want to delete this cabin?')) return

    try {
      const response = await axios.delete(`/api/cabins/${cabinId}`, {
        headers: getAuthHeader()
      })

      if (response.data.success) {
        await fetchCabins()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete cabin')
    }
  }

  const handleToggleStatus = async (cabin) => {
    try {
      const response = await axios.put(`/api/cabins/${cabin._id}`, {
        ...cabin,
        isActive: !cabin.isActive
      }, {
        headers: getAuthHeader()
      })

      if (response.data.success) {
        await fetchCabins()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update cabin status')
    }
  }

  return (
    <div className="cabin-management">
      <div className="cabin-header">
        <h2>Cabin Management</h2>
        <button className="btn-add" onClick={handleAddNew} disabled={isLoading}>
          Add New Cabin
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingCabin ? 'Edit Cabin' : 'Add New Cabin'}</h3>
          <form onSubmit={handleSubmit} className="cabin-form">
            <div className="form-group">
              <label>Cabin Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter cabin name (e.g., Cabin-1)"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter cabin description (optional)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="isActive"
                value={formData.isActive}
                onChange={handleInputChange}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingCabin ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="btn-cancel"
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

      {isLoading && !showForm ? (
        <div className="loading">Loading...</div>
      ) : cabins.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">🏢</div>
          <h3>No Cabins Found</h3>
          <p>Start by adding your first cabin</p>
        </div>
      ) : (
        // ✅ inline style lagaya — .table-container ka CSS conflict fix
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          overflowX: 'auto',
          padding: '0',
          border: 'none',
          maxHeight: 'none',
          position: 'static'
        }}>
          <table className="cabins-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cabins.map((cabin, index) => (
                <tr key={cabin._id}>
                  <td>#{index + 1}</td>
                  <td className="cabin-name">{cabin.name}</td>
                  <td>{cabin.description || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${cabin.isActive ? 'active' : 'inactive'}`}>
                      {cabin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(cabin)}
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button
                      className={`btn-status ${cabin.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleStatus(cabin)}
                      disabled={isLoading}
                    >
                      {cabin.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(cabin._id)}
                      disabled={isLoading}
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

export default CabinManagement