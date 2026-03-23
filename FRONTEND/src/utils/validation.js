// Shared validation utilities for form fields

/**
 * Validates phone number: exactly 10 digits only
 * @param {string} phone - The phone number to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
        return 'Phone number is required'; // Required for login
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
        return 'Phone number must be exactly 10 digits';
    }
    return '';
};

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateEmail = (email) => {
    if (!email || email.trim() === '') {
        return 'Email is required';
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim())) {
        return 'Please enter a valid email address';
    }
    return '';
};

/**
 * Validates required text field
 * @param {string} value - The value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateRequired = (value, fieldName) => {
    if (!value || value.trim() === '') {
        return `${fieldName} is required`;
    }
    return '';
};

/**
 * Validates password: required, minimum 8 characters
 * @param {string} password - The password to validate
 * @param {boolean} isRequired - Whether password is required (for editing, it might be optional)
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validatePassword = (password, isRequired = true) => {
    if (isRequired && (!password || password.trim() === '')) {
        return 'Password is required';
    }
    if (password && password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return '';
};

/**
 * Validates username: required, minimum 3 characters
 * @param {string} username - The username to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateUsername = (username) => {
    if (!username || username.trim() === '') {
        return 'Username is required';
    }
    if (username.trim().length < 3) {
        return 'Username must be at least 3 characters long';
    }
    return '';
};

/**
 * Validates username or phone number: can be either a username (min 3 chars) or phone (10 digits)
 * @param {string} value - The username or phone number to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateUsernameOrPhone = (value) => {
    if (!value || value.trim() === '') {
        return 'Username or phone number is required';
    }

    const trimmedValue = value.trim();

    // Check if it's a phone number (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (phoneRegex.test(trimmedValue)) {
        return ''; // Valid phone number
    }

    // Check if it's a username (minimum 3 characters, alphanumeric with spaces/underscores/hyphens allowed)
    const usernameRegex = /^[a-zA-Z0-9\s_-]{3,}$/;
    if (usernameRegex.test(trimmedValue)) {
        return ''; // Valid username
    }

    return 'Username must be at least 3 characters or phone number must be exactly 10 digits';
};

/**
 * Validates category ID (positive number)
 * @param {string|number} categoryId - The category ID to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateCategoryId = (categoryId) => {
    if (!categoryId) {
        return 'Category is required';
    }
    const num = parseInt(categoryId);
    if (isNaN(num) || num <= 0) {
        return 'Category must be a valid positive number';
    }
    return '';
};

/**
 * Validates amount: required, positive number greater than 0
 * @param {string|number} amount - The amount to validate
 * @returns {string} - Error message if invalid, empty string if valid
 */
export const validateAmount = (amount) => {
    if (!amount || amount === '') {
        return 'Amount is required';
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
        return 'Amount must be a positive number greater than 0';
    }
    return '';
};
