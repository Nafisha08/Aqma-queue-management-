import { useState, useEffect, useCallback } from 'react'
import "../styles/VendorManagement.css";
import { getAuthHeader } from '../services/auth'
import { validatePhone, validateEmail, validateRequired, validateCategoryId } from '../utils/validation'

function VendorManagement() {
    const [vendors, setVendors] = useState([])
    const [categories, setCategories] = useState([])
    const [subscriptions, setSubscriptions] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingVendor, setEditingVendor] = useState(null)
    const [activeTab, setActiveTab] = useState('vendors')

    // API Configuration
    const API_BASE_URL = 'https://aqma-queue-management-1.onrender.com/api/vendor-management'
    const OFFLINE_MODE = false

    // Helper function to get auth headers
    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        ...getAuthHeader()
    })

    // Form state
    const [formData, setFormData] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternateMobile: '',
        address: '',
        gstNo: '',
        subscriptionId: '',
        categoryId: ''
    })

    // Form validation errors state
    const [errors, setErrors] = useState({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternateMobile: '',
        categoryId: ''
    })

    // Load initial data on component mount
    useEffect(() => {
        loadInitialData()
    }, [])

    // Load all initial data
    const loadInitialData = async () => {
        setIsLoading(true)
        setError('')
        try {
            await Promise.all([
                loadVendors(),
                loadCategories(),
                loadSubscriptions()
            ])
        } catch (err) {
            setError('Failed to load data. Please check your connection.')
        } finally {
            setIsLoading(false)
        }
    }

    // Load vendors from API
    const loadVendors = async () => {
        if (OFFLINE_MODE) {
            setVendors([
                {
                    _id: '1',
                    id: 1,
                    vendorId: 1,
                    companyName: 'Demo Medical Center',
                    contactPerson: 'John Doe',
                    email: 'demo@medical.com',
                    phone: '1234567890',
                    alternateMobile: '9876543210',
                    address: '123 Medical Street, Health District, City - 400001',
                    gstNo: '27ABCDE1234F1Z5',
                    categoryId: 1,
                    subscriptionId: 1,
                    subscription: 'Basic',
                    createdAt: new Date().toISOString(),
                    status: 'active',
                    isActive: true
                }
            ])
            return
        }

        try {
            const response = await fetch(`${API_BASE_URL}/vendors?limit=100`, {
                method: 'GET',
                headers: getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()

            if (result.success && result.vendors) {
                setVendors(result.vendors)
            } else {
                throw new Error(result.message || 'Failed to load vendors')
            }
        } catch (err) {
            setError('Failed to load vendors: ' + err.message)
            console.error('Load vendors error:', err)
        }
    }

    // Load categories
    const loadCategories = async () => {
        try {
            setCategories([
                { id: 1, name: 'Medical', isActive: true },
                { id: 2, name: 'Shop', isActive: true },
                { id: 3, name: 'Juice Corner', isActive: true },
                { id: 4, name: 'Hospital', isActive: true },
                { id: 5, name: 'Restaurant', isActive: true },
                { id: 6, name: 'Pharmacy', isActive: true }
            ])
        } catch (err) {
            setCategories([])
        }
    }

    // Load subscriptions
    const loadSubscriptions = async () => {
        try {
            setSubscriptions([
                { id: 1, name: 'Basic', price: 500 },
                { id: 2, name: 'Standard', price: 1000 },
                { id: 3, name: 'Premium', price: 1500 }
            ])
        } catch (err) {
            setSubscriptions([])
        }
    }

    // Get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(cat => cat.id === categoryId)
        return category ? category.name : 'Unknown'
    }

    // Get subscription name by ID
    const getSubscriptionName = (subscriptionId) => {
        const subscription = subscriptions.find(sub => sub.id === subscriptionId)
        return subscription ? subscription.name : 'No subscription'
    }

    // Handle form input changes with real-time validation and 10-digit limit
    const handleInputChange = (e) => {
        const { name, value } = e.target

        // For phone and alternateMobile fields, only allow digits and max 10 characters
        if (name === 'phone' || name === 'alternateMobile') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
            setFormData(prev => ({
                ...prev,
                [name]: digitsOnly
            }))

            // Validate phone number
            let errorMessage = ''
            if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
                errorMessage = 'Phone number must be exactly 10 digits'
            } else if (digitsOnly.length === 10) {
                errorMessage = '' // Valid
            }

            setErrors(prev => ({
                ...prev,
                [name]: errorMessage
            }))
            return
        }

        // For other fields, normal handling
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        let errorMessage = ''
        switch (name) {
            case 'companyName':
                errorMessage = validateRequired(value, 'Company name')
                break
            case 'contactPerson':
                errorMessage = validateRequired(value, 'Contact person')
                break
            case 'email':
                errorMessage = validateEmail(value)
                break
            case 'categoryId':
                errorMessage = validateCategoryId(value)
                break
            default:
                errorMessage = ''
        }

        setErrors(prev => ({
            ...prev,
            [name]: errorMessage
        }))
    }

    // Reset form to initial state
    const resetForm = () => {
        setFormData({
            companyName: '',
            contactPerson: '',
            email: '',
            phone: '',
            alternateMobile: '',
            address: '',
            gstNo: '',
            subscriptionId: '',
            categoryId: ''
        })
        setErrors({
            companyName: '',
            contactPerson: '',
            email: '',
            phone: '',
            alternateMobile: '',
            categoryId: ''
        })
        setEditingVendor(null)
    }

    // Open form for creating new vendor
    const handleAddNew = () => {
        resetForm()
        setShowForm(true)
    }

    // Open form for editing existing vendor
    const handleEdit = (vendor) => {
        setFormData({
            companyName: vendor.companyName || '',
            contactPerson: vendor.contactPerson || '',
            email: vendor.email || '',
            phone: vendor.phone || '',
            alternateMobile: vendor.alternateMobile || '',
            address: vendor.address || '',
            gstNo: vendor.gstNo || '',
            subscriptionId: vendor.subscriptionId ? vendor.subscriptionId.toString() : '',
            categoryId: vendor.categoryId ? vendor.categoryId.toString() : ''
        })
        setEditingVendor(vendor)
        setShowForm(true)
    }

    // Validate form data with 10-digit phone validation
    const validateForm = () => {
        const newErrors = {
            companyName: '',
            contactPerson: '',
            email: '',
            phone: '',
            alternateMobile: '',
            categoryId: ''
        }

        newErrors.companyName = validateRequired(formData.companyName, 'Company name')
        newErrors.contactPerson = validateRequired(formData.contactPerson, 'Contact person')
        newErrors.email = validateEmail(formData.email)
        newErrors.categoryId = validateCategoryId(formData.categoryId)

        // Validate phone - must be exactly 10 digits
        if (!formData.phone) {
            newErrors.phone = 'Phone number is required'
        } else if (formData.phone.length !== 10) {
            newErrors.phone = 'Phone number must be exactly 10 digits'
        } else if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = 'Phone number must contain only digits'
        }

        // Validate alternate mobile - must be exactly 10 digits if provided
        if (formData.alternateMobile) {
            if (formData.alternateMobile.length !== 10) {
                newErrors.alternateMobile = 'Alternate mobile must be exactly 10 digits'
            } else if (!/^\d{10}$/.test(formData.alternateMobile)) {
                newErrors.alternateMobile = 'Alternate mobile must contain only digits'
            }
        }

        setErrors(newErrors)

        const hasErrors = Object.values(newErrors).some(error => error !== '')
        return !hasErrors
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        if (e) e.preventDefault()

        if (!validateForm()) {
            return
        }

        if (isNaN(parseInt(formData.categoryId))) {
            setError('Category is required and must be a valid number')
            return
        }

        setIsLoading(true)
        setError('')

        const requestData = {
            companyName: formData.companyName.trim(),
            contactPerson: formData.contactPerson.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim(),
            username: formData.phone.trim(),
            alternateMobile: formData.alternateMobile.trim(),
            address: formData.address.trim(),
            categoryId: parseInt(formData.categoryId)
        }

        if (formData.subscriptionId && formData.subscriptionId !== '') {
            requestData.subscriptionId = parseInt(formData.subscriptionId)
        }

        const gstValue = formData.gstNo.trim()
        if (gstValue) {
            requestData.gstNo = gstValue.toUpperCase()
        }

        try {
            let url, method

            if (editingVendor) {
                url = `${API_BASE_URL}/vendors/${editingVendor.id || editingVendor.vendorId}`
                method = 'PUT'
            } else {
                url = `${API_BASE_URL}/vendors`
                method = 'POST'
            }

            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(requestData)
            })

            const result = await response.json()

            if (result.success) {
                await loadVendors()
                setShowForm(false)
                resetForm()
                setError('')
            } else {
                // ✅ UPDATED: Better error handling for duplicate entries
                if (response.status === 409) {
                    // Duplicate entry error
                    const errorMessage = result.errors && result.errors.length > 0
                        ? result.errors[0]
                        : result.message || 'Duplicate entry found'

                    setError(errorMessage)

                    // ✅ Highlight the specific field with error
                    if (result.field) {
                        setErrors(prev => ({
                            ...prev,
                            [result.field]: errorMessage
                        }))
                    }
                } else {
                    // Other errors
                    const errorMessage = result.errors && result.errors.length > 0
                        ? result.errors.join(', ')
                        : result.message || 'Failed to save vendor'
                    setError(errorMessage)
                }
            }

        } catch (err) {
            setError('Failed to save vendor: ' + err.message)
        } finally {
            setIsLoading(false)
        }
    }

    // Handle vendor deletion
    const handleDelete = async (vendor) => {
        const vendorName = vendor.companyName || vendor.name || 'this vendor'
        if (!window.confirm(`Are you sure you want to delete "${vendorName}"?`)) {
            return
        }

        setIsLoading(true)
        setError('')

        const vendorId = vendor.id || vendor.vendorId || vendor._id

        try {
            const response = await fetch(`${API_BASE_URL}/vendors/${vendorId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            })

            const result = await response.json()

            if (response.ok && result.success) {
                await loadVendors()

                if (editingVendor && (editingVendor.id || editingVendor.vendorId) === vendorId) {
                    setShowForm(false)
                    resetForm()
                }
            } else {
                throw new Error(result.message || 'Failed to delete vendor')
            }
        } catch (err) {
            setError(err.message || 'Failed to delete vendor')
        } finally {
            setIsLoading(false)
        }
    }

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        } catch (err) {
            return 'Invalid Date'
        }
    }

    // Filter active vendors for display
    const activeVendors = vendors.filter(vendor =>
        vendor.isActive !== false && !vendor.deletedAt
    )

    return (
        <div className="management-container">
            {activeTab === 'vendors' ? (
                <>
                    <div className="management-header">
                        <h2>Vendor Management</h2>
                        <div className="header-actions">
                            <span className="vendor-count">
                                Total Vendors: {activeVendors.length}
                            </span>
                            <button className="add-button" onClick={handleAddNew} disabled={isLoading}>
                                Add New Vendor
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                            <button
                                className="error-close"
                                onClick={() => setError('')}
                                title="Clear error"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {showForm && (
                        <div className="form-container">
                            <div className="form-header">
                                <h3>
                                    {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                                </h3>
                                <button
                                    className="form-close-button"
                                    onClick={() => {
                                        setShowForm(false)
                                        resetForm()
                                        setError('')
                                    }}
                                    title="Close form"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="vendor-form">
                                <div className="form-section">
                                    <h4>Basic Information</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Company Name <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                required
                                                maxLength={100}
                                                placeholder="Enter company name"
                                                className={errors.companyName ? 'error' : ''}
                                            />
                                            {errors.companyName && <span className="error-text">{errors.companyName}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>Contact Person <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                name="contactPerson"
                                                value={formData.contactPerson}
                                                onChange={handleInputChange}
                                                required
                                                maxLength={50}
                                                placeholder="Enter contact person name"
                                                className={errors.contactPerson ? 'error' : ''}
                                            />
                                            {errors.contactPerson && <span className="error-text">{errors.contactPerson}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Contact Information</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Email <span className="required">*</span></label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Enter email address"
                                                className={errors.email ? 'error' : ''}
                                            />
                                            {errors.email && <span className="error-text">{errors.email}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>Phone no / User Name <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                required
                                                maxLength="10"
                                                inputMode="numeric"
                                                placeholder="Enter 10 digit phone number"
                                                className={errors.phone ? 'error' : ''}
                                            />
                                            {errors.phone && <span className="error-text">{errors.phone}</span>}
                                            <small style={{ color: '#666', fontSize: '12px' }}>
                                                Enter exactly 10 digits (Required)
                                            </small>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Alternate Mobile</label>
                                            <input
                                                type="text"
                                                name="alternateMobile"
                                                value={formData.alternateMobile}
                                                onChange={handleInputChange}
                                                maxLength="10"
                                                inputMode="numeric"
                                                placeholder="Enter 10 digit alternate mobile"
                                                className={errors.alternateMobile ? 'error' : ''}
                                            />
                                            {errors.alternateMobile && <span className="error-text">{errors.alternateMobile}</span>}
                                            <small style={{ color: '#666', fontSize: '12px' }}>
                                                Enter exactly 10 digits (Optional)
                                            </small>
                                        </div>
                                        <div className="form-group">
                                            <label>GST Number (Optional)</label>
                                            <input
                                                type="text"
                                                name="gstNo"
                                                value={formData.gstNo}
                                                onChange={handleInputChange}
                                                placeholder="Enter GST number"
                                                style={{ textTransform: 'uppercase' }}
                                                maxLength={20}
                                            />
                                            <small style={{ color: '#666', fontSize: '12px' }}>
                                                Any valid GST format accepted (Optional)
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Classification</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Category <span className="required">*</span></label>
                                            <select
                                                name="categoryId"
                                                value={formData.categoryId}
                                                onChange={handleInputChange}
                                                required
                                                className={errors.categoryId ? 'error' : ''}
                                            >
                                                <option value="">Select Category</option>
                                                {categories.filter(cat => cat.isActive).map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.categoryId && <span className="error-text">{errors.categoryId}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>Subscription Plan</label>
                                            <select
                                                name="subscriptionId"
                                                value={formData.subscriptionId}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Select Subscription (Optional)</option>
                                                {subscriptions.map(subscription => (
                                                    <option key={subscription.id} value={subscription.id}>
                                                        {subscription.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-section">
                                    <h4>Address</h4>
                                    <div className="form-row">
                                        <div className="form-group address-group">
                                            <label>Complete Address</label>
                                            <textarea
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                rows="4"
                                                className="address-textarea"
                                                placeholder="Enter complete address..."
                                                maxLength={500}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-buttons">
                                    <button
                                        type="submit"
                                        className="submit-button"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>{editingVendor ? 'Updating...' : 'Creating...'}</>
                                        ) : (
                                            <>{editingVendor ? 'Update Vendor' : 'Create Vendor'}</>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={() => {
                                            setShowForm(false)
                                            resetForm()
                                            setError('')
                                        }}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="content-area">
                        {isLoading && !showForm ? (
                            <div className="loading">
                                <div className="loading-spinner">⏳</div>
                                <p>Loading vendors...</p>
                            </div>
                        ) : activeVendors.length === 0 ? (
                            <div className="no-data">
                                <div className="no-data-icon">📋</div>
                                <h3>No Vendors Found</h3>
                                <p>Start by adding your first vendor using the "Add New Vendor" button above.</p>
                                <button className="add-button-secondary" onClick={handleAddNew}>
                                    Add Your First Vendor
                                </button>
                            </div>
                        ) : (
                            <div className="table-container">
                                <div className="table-wrapper">
                                    <table className="vendor-table">
                                        <thead>
                                            <tr>
                                                <th className="col-id">ID</th>
                                                <th className="col-company">Company Name</th>
                                                <th className="col-contact">Contact Person</th>
                                                <th className="col-email">Email</th>
                                                <th className="col-phone">Phone</th>
                                                <th className="col-alt-mobile">Alt Mobile</th>
                                                <th className="col-gst">GST No</th>
                                                <th className="col-address">Address</th>
                                                <th className="col-category">Category</th>
                                                <th className="col-subs">Subscription</th>
                                                <th className="col-status">Status</th>
                                                <th className="col-created">Created</th>
                                                <th className="col-actions">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeVendors.map((vendor, index) => (
                                                <tr key={vendor._id || vendor.id} className="vendor-row">
                                                    <td className="col-id">
                                                        <span className="vendor-id">
                                                            #{(vendor.displayId || (index + 1)).toString().padStart(2, '0')}
                                                        </span>
                                                    </td>
                                                    <td className="col-company">
                                                        <div className="vendor-name" title={vendor.companyName}>
                                                            {vendor.companyName || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-contact">
                                                        <div className="contact-info">
                                                            {vendor.contactPerson || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-email">
                                                        <div className="contact-info" title={vendor.email}>
                                                            {vendor.email || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-phone">
                                                        <div className="contact-info">
                                                            {vendor.phone || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-alt-mobile">
                                                        <div className="contact-info">
                                                            {vendor.alternateMobile || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-gst">
                                                        <div className="contact-info">
                                                            {vendor.gstNo || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-address">
                                                        <div className="address-info" title={vendor.address}>
                                                            {vendor.address ? (
                                                                vendor.address.length > 30 ?
                                                                    vendor.address.substring(0, 30) + '...' :
                                                                    vendor.address
                                                            ) : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="col-category">
                                                        <span className="category-badge">
                                                            {getCategoryName(vendor.categoryId)}
                                                        </span>
                                                    </td>
                                                    <td className="col-subs">
                                                        <div className="subscription-info">
                                                            {getSubscriptionName(vendor.subscriptionId)}
                                                        </div>
                                                    </td>
                                                    <td className="col-status">
                                                        <span className={`status-badge ${vendor.status || 'active'}`}>
                                                            {vendor.status || 'active'}
                                                        </span>
                                                    </td>
                                                    <td className="col-created">
                                                        <div className="date-info">
                                                            {formatDate(vendor.createdAt)}
                                                        </div>
                                                    </td>
                                                    <td className="col-actions">
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-button edit-button"
                                                                onClick={() => handleEdit(vendor)}
                                                                title="Edit Vendor"
                                                                disabled={isLoading}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="action-button delete-button"
                                                                onClick={() => handleDelete(vendor)}
                                                                title="Delete Vendor"
                                                                disabled={isLoading}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div>
                    <div className="back-navigation">
                        <button className="back-button" onClick={() => setActiveTab('vendors')}>
                            ← Back to Vendors
                        </button>
                        <h3>Management Section</h3>
                    </div>
                    <div className="management-section">
                        <div className="under-development-icon">🚧</div>
                        <h3 className="under-development-title">Under Development</h3>
                        <p className="under-development-text">This section is under development.</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default VendorManagement