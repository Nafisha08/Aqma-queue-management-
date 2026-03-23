import { useState, useEffect } from 'react'
import axios from 'axios'
import "../styles/itemManagement.css"

const API_URL = 'https://aqma-queue-management-1.onrender.com/api'

function ItemManagement({ vendorId }) {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token')
  }

  useEffect(() => {
    fetchItems()
  }, [vendorId])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const response = await axios.get(`${API_URL}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.data.success) {
        setItems(response.data.items)
        setError('')
      } else {
        setError('Failed to fetch items')
      }
    } catch (err) {
      setError('Failed to fetch items: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const resetForm = () => {
    setFormData({ name: '', description: '' })
    setEditingItem(null)
  }

  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (item) => {
    setFormData({ name: item.name, description: item.description || '' })
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = getToken()
      const itemData = { ...formData }

      if (editingItem) {
        const response = await axios.put(
          `${API_URL}/items/${editingItem._id}`,
          itemData,
          { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        )
        if (response.data.success) {
          fetchItems()
          alert('Item updated successfully!')
        }
      } else {
        const response = await axios.post(
          `${API_URL}/items`,
          itemData,
          { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        )
        if (response.data.success) {
          fetchItems()
          alert('Item created successfully!')
        }
      }

      setShowForm(false)
      resetForm()
      setError('')
    } catch (err) {
      setError('Failed to save item: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const token = getToken()
      const response = await axios.delete(`${API_URL}/items/${itemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.data.success) {
        alert('Item deleted successfully!')
        fetchItems()
        setError('')
      } else {
        setError('Failed to delete item')
      }
    } catch (err) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Item Management</h2>
        <button className="add-button" onClick={handleAddNew}>
          Add New Item
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
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
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="submit-button">
                {editingItem ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => { setShowForm(false); resetForm() }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="no-data">No items found. Add your first item!</div>
      ) : (
        /* ✅ FIX: div tag properly opened with style */
        <div style={{
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
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item._id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.description || '-'}</td>
                  <td className="action-buttons">
                    <button className="edit-button" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(item._id)}>Delete</button>
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

export default ItemManagement