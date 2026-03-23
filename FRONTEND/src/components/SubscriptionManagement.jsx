import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/SubscriptionManagement.css'

function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    subscriptionName: '',
    planType: '',
    durationInMonths: '',
    price: '',
    description: '',
    maxUsersAllowed: '',
    categoryId: '',
    isActive: true
  })

  // Sample categories data
  const sampleCategories = [
    { id: 1, name: 'Medical', isActive: true },
    { id: 2, name: 'Shop', isActive: true },
    { id: 3, name: 'Juice Corner', isActive: true },
    { id: 4, name: 'Hospital', isActive: true },
    { id: 5, name: 'Restaurant', isActive: true },
    { id: 6, name: 'Pharmacy', isActive: true }
  ]

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  }

  // Helper function to get next sequential ID
  const getNextSequentialId = () => {
    if (subscriptions.length === 0) return 1;
    const maxId = Math.max(...subscriptions.map(s => {
      // Extract numeric ID from various ID formats
      const id = s.id || s.subscriptionId || s._id;
      if (typeof id === 'number') return id;
      if (typeof id === 'string') {
        const numericMatch = id.match(/\d+/);
        return numericMatch ? parseInt(numericMatch[0]) : 0;
      }
      return 0;
    }));
    return maxId + 1;
  }

  // Fetch data on component mount
  useEffect(() => {
    // Set categories first
    setCategories(sampleCategories)
    fetchSubscriptions()
  }, [])

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'All Categories'
  }

  // Fetch all subscriptions
  const fetchSubscriptions = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/subscription-plans', {
        headers: authHeaders()
      })

      // Filter out soft deleted subscriptions and assign sequential IDs
      const activeSubscriptions = response.data.filter(sub => sub.isActive !== false)

      // Process subscriptions to ensure sequential IDs regardless of backend response
      const subscriptionsWithSequentialId = activeSubscriptions.map((subscription, index) => {
        // Generate clean sequential ID
        const sequentialId = index + 1;

        console.log(`Processing subscription ${index}: Original ID = ${subscription._id || subscription.id}, New ID = ${sequentialId}`)

        return {
          ...subscription,
          id: sequentialId,
          subscriptionId: sequentialId,
          displayId: sequentialId,
          originalId: subscription._id || subscription.id // Keep original for API calls
        }
      })

      console.log('All subscriptions with sequential IDs:', subscriptionsWithSequentialId)
      setSubscriptions(subscriptionsWithSequentialId)
      setError('')
    } catch (err) {
      setError('Failed to fetch subscriptions')
      console.error('Fetch subscriptions error:', err)
      if (err.response) {
        console.error('Error response data:', err.response.data)
        console.error('Error response status:', err.response.status)
      }

      // Fallback to sample data with sequential IDs
      const fallbackData = [
        {
          _id: '1',
          id: 1,
          displayId: 1,
          subscriptionId: 1,
          originalId: '1',
          name: 'Basic Plan',
          price: 500,
          duration: 30,
          categoryId: 1,
          description: 'Basic subscription plan',
          features: ['1 users', '1 months duration', 'Paid plan', 'Category: Medical'],
          status: 'active',
          isActive: true
        }
      ]
      setSubscriptions(fallbackData)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      subscriptionName: '',
      planType: '',
      durationInMonths: '',
      price: '',
      description: '',
      maxUsersAllowed: '',
      categoryId: '',
      isActive: true
    })
    setEditingSubscription(null)
  }

  // Open form for creating new subscription
  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  // Open form for editing subscription
  const handleEdit = (subscription) => {
    // Extract max users from features array
    const maxUsersFeature = subscription.features?.find(f => f.includes('users'))
    const maxUsers = maxUsersFeature ? maxUsersFeature.match(/(\d+)/)?.[1] || '' : ''

    setFormData({
      subscriptionName: subscription.name || '',
      planType: subscription.features?.some(f => f.includes('Free plan')) ? 'Free' : 'Paid',
      durationInMonths: subscription.duration ? Math.round(subscription.duration / 30).toString() : '',
      price: subscription.price?.toString() || '',
      description: subscription.description || '',
      maxUsersAllowed: maxUsers,
      categoryId: subscription.categoryId || '',
      isActive: subscription.status === 'active' && subscription.isActive !== false
    })
    setEditingSubscription(subscription)
    setShowForm(true)
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Prepare data for subscription plans endpoint
      const dataToSend = {
        name: formData.subscriptionName,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: parseInt(formData.durationInMonths) * 30, // Convert months to days
        categoryId: parseInt(formData.categoryId),
        features: [
          `${formData.maxUsersAllowed} users`,
          `${formData.durationInMonths} months duration`,
          formData.planType === 'Free' ? 'Free plan' : 'Paid plan',
          `Category: ${getCategoryName(parseInt(formData.categoryId))}`
        ],
        status: formData.isActive ? 'active' : 'inactive',
        isActive: formData.isActive
      }

      console.log('Sending data:', dataToSend)

      if (editingSubscription) {
        // Update existing subscription plan using originalId
        const updateUrl = `/api/subscription-plans/${editingSubscription.originalId || editingSubscription._id || editingSubscription.id}`
        console.log('Update URL:', updateUrl)
        await axios.put(updateUrl, dataToSend, {
          headers: authHeaders()
        })
      } else {
        // Create new subscription plan
        const createUrl = '/api/subscription-plans'
        console.log('Create URL:', createUrl)
        await axios.post(createUrl, dataToSend, {
          headers: authHeaders()
        })
      }

      // Refresh subscriptions list to reassign sequential IDs
      await fetchSubscriptions()

      // If this is a new subscription creation, ensure it gets a proper sequential ID
      if (!editingSubscription) {
        setSubscriptions(prevSubscriptions => {
          return prevSubscriptions.map((subscription, index) => {
            // If subscription doesn't have a proper numeric ID, assign sequential
            if (!subscription.id || isNaN(subscription.id) || subscription.id.toString().length > 10) {
              return {
                ...subscription,
                id: index + 1,
                subscriptionId: index + 1,
                displayId: index + 1
              }
            }
            return subscription
          })
        })

        // Scroll to the bottom of the table to show the new entry
        setTimeout(() => {
          const tableWrapper = document.querySelector('.table-wrapper')
          if (tableWrapper) {
            tableWrapper.scrollTop = tableWrapper.scrollHeight
          }
        }, 300)
      }

      setShowForm(false)
      resetForm()
      setError('') // Clear any previous errors
    } catch (err) {
      setError(editingSubscription ? 'Failed to update subscription plan' : 'Failed to create subscription plan')
      console.error('Submit form error:', err)
      if (err.response) {
        console.error('Error response data:', err.response.data)
        console.error('Error response status:', err.response.status)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle subscription soft deletion
  const handleDelete = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan? (It will be deactivated, not permanently deleted)')) return

    setIsLoading(true)
    setError('') // Clear any previous errors
    try {
      // Find the subscription to get its originalId
      const subscription = subscriptions.find(s => s.id === subscriptionId || s.displayId === subscriptionId)
      const apiId = subscription?.originalId || subscription?._id || subscriptionId

      console.log(`Attempting to soft delete subscription plan with ID: ${apiId}`)
      const url = `/api/subscription-plans/${apiId}`
      console.log('Soft delete URL:', url)

      // Instead of DELETE, send PUT request to set isActive: false
      const softDeleteData = {
        isActive: false,
        status: 'inactive',
        deletedAt: new Date().toISOString()
      }

      await axios.put(url, softDeleteData, { headers: authHeaders() })

      if (editingSubscription && (editingSubscription.id === subscriptionId || editingSubscription.displayId === subscriptionId)) {
        setShowForm(false)
        resetForm()
      }

      await fetchSubscriptions()
      setError('')
    } catch (err) {
      console.error('Soft delete subscription plan error:', err)
      setError('Failed to delete subscription plan')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle subscription activation
  const handleActivate = async (subscriptionId) => {
    setIsLoading(true)
    try {
      // Find the subscription to get its originalId
      const subscription = subscriptions.find(s => s.id === subscriptionId || s.displayId === subscriptionId)
      const apiId = subscription?.originalId || subscription?._id || subscriptionId

      const url = `/api/subscription-plans/${apiId}`
      const activateData = {
        isActive: true,
        status: 'active',
        deletedAt: null,
        updatedAt: new Date().toISOString()
      }

      await axios.put(url, activateData, { headers: authHeaders() })
      await fetchSubscriptions()
      setError('')
    } catch (err) {
      console.error('Activate subscription plan error:', err)
      setError('Failed to activate subscription plan')
    } finally {
      setIsLoading(false)
    }
  }

  // Convert days to months for display
  const formatDuration = (days) => {
    if (!days) return 'N/A'
    const months = Math.round(days / 30)
    return months === 1 ? '1 Month' : `${months} Months`
  }

  // Get plan type display
  const getPlanTypeDisplay = (subscriptionType) => {
    return subscriptionType === 0 ? 'Free' : 'Paid'
  }

  return (
    <div className="management-container">
      <div className="management-header">
        <h2>Subscription Management</h2>
        <button className="add-button" onClick={handleAddNew}>
          <span className="add-icon">+</span>
          Add New Subscription
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h3>{editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}</h3>
          <form onSubmit={handleSubmit} className="subscription-form">
            <div className="form-row">
              <div className="form-group">
                <label>Subscription Name *</label>
                <input
                  type="text"
                  name="subscriptionName"
                  value={formData.subscriptionName}
                  onChange={handleInputChange}
                  placeholder="e.g., Trial version, Premium"
                  required
                />
              </div>

              <div className="form-group">
                <label>Plan Type *</label>
                <select
                  name="planType"
                  value={formData.planType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Plan Type</option>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration (Months) *</label>
                <input
                  type="number"
                  name="durationInMonths"
                  value={formData.durationInMonths}
                  onChange={handleInputChange}
                  placeholder="e.g., 1, 12"
                  min="1"
                  required
                />
                <small>1 month = 30 days</small>
              </div>

              <div className="form-group">
                <label>Price (₹) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Max Users Allowed *</label>
                <input
                  type="number"
                  name="maxUsersAllowed"
                  value={formData.maxUsersAllowed}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.filter(cat => cat.isActive).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed description of the subscription"
                rows="3"
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Active Status
              </label>
            </div>

            <div className="form-buttons">
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? 'Processing...' : (editingSubscription ? 'Update Subscription' : 'Create Subscription')}
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
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>Loading subscriptions...</span>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">📋</div>
          <h3>No subscriptions found</h3>
          <p>Create your first subscription plan to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table subscription-table">
              <thead>
                <tr>
                  <th className="th-id">ID</th>
                  <th className="th-name">Subscription Name</th>
                  <th className="th-plan">Plan Type</th>
                  <th className="th-duration">Duration</th>
                  <th className="th-price">Price</th>
                  <th className="th-users">Max Users</th>
                  <th className="th-category">Category</th>
                  <th className="th-description">Description</th>
                  <th className="th-status">Status</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => {
                  // Extract max users from features array
                  const maxUsersFeature = subscription.features?.find(f => f.includes('users'))
                  const maxUsers = maxUsersFeature ? maxUsersFeature.match(/(\d+)/)?.[1] || 'N/A' : 'N/A'

                  // Determine plan type from features
                  const planType = subscription.features?.some(f => f.includes('Free plan')) ? 0 : 1

                  return (
                    <tr key={subscription.originalId || subscription._id || subscription.id} className="table-row">
                      <td className="td-id" data-label="ID">#{subscription.id || subscription.displayId || subscription.subscriptionId}</td>
                      <td className="td-name" data-label="Name">
                        <div className="subscription-name">
                          {subscription.name || 'Unnamed Plan'}
                        </div>
                      </td>
                      <td className="td-plan" data-label="Plan Type">
                        <span className={`plan-badge ${planType === 0 ? 'plan-free' : 'plan-paid'}`}>
                          {getPlanTypeDisplay(planType)}
                        </span>
                      </td>
                      <td className="td-duration" data-label="Duration">{formatDuration(subscription.duration)}</td>
                      <td className="td-price" data-label="Price">
                        <span className="price-amount">₹{Number(subscription.price || 0).toFixed(2)}</span>
                      </td>
                      <td className="td-users" data-label="Max Users">
                        <span className="users-count">{maxUsers}</span>
                      </td>
                      <td className="td-category" data-label="Category">
                        <span className="category-badge">
                          {getCategoryName(subscription.categoryId)}
                        </span>
                      </td>
                      <td className="td-description" data-label="Description">
                        <div className="description-text" title={subscription.description}>
                          {subscription.description || 'No description available'}
                        </div>
                      </td>
                      <td className="td-status" data-label="Status">
                        <span className={`status-badge ${subscription.status === 'active' && subscription.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                          <span className="status-dot"></span>
                          {subscription.status === 'active' && subscription.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td-actions" data-label="Actions">
                        <div className="action-buttons">
                          <button
                            className="edit-button action-btn edit-btn"
                            onClick={() => handleEdit(subscription)}
                            title="Edit subscription"
                          >
                            <span className="btn-icon">✏️</span>
                            Edit
                          </button>
                          {subscription.isActive !== false ? (
                            <button
                              className="delete-button action-btn delete-btn"
                              onClick={() => handleDelete(subscription.id || subscription.displayId)}
                              title="Delete subscription (Soft Delete)"
                            >
                              <span className="btn-icon">🗑️</span>
                              Delete
                            </button>
                          ) : (
                            <button
                              className="activate-button action-btn activate-btn"
                              onClick={() => handleActivate(subscription.id || subscription.displayId)}
                              title="Activate subscription"
                            >
                              <span className="btn-icon">✅</span>
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManagement