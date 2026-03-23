import axios from 'axios';
import dotenv from 'dotenv';

class SmsService {
    constructor() {
        this.authKey = process.env.MSG91_AUTH_KEY;
        this.senderId = process.env.MSG91_SENDER_ID || 'TXTLCL';
        this.templateId = process.env.MSG91_TEMPLATE_ID;
        this.baseUrl = 'https://control.msg91.com/api/v5/flow';
        this.balanceUrl = 'https://api.msg91.com/api/balance.php';
        this.maxRetries = 3;
        this.retryDelay = 2000;

        console.log('[SMS Service] Initialized with:');
        console.log(`  AuthKey: ${this.authKey ? '***' + this.authKey.slice(-4) : 'NOT SET'}`);
        console.log(`  SenderId: ${this.senderId}`);
        console.log(`  TemplateId: ${this.templateId || 'NOT SET'}`);
        console.log(`  Debug Mode: ${process.env.SMS_DEBUG === 'true' ? 'ON' : 'OFF'}`);

        // Force reload environment variables if not loaded
        if (!this.authKey) {
            console.log('[SMS Service] ⚠️ Environment variables not loaded, attempting to reload...');
            dotenv.config();
            this.authKey = process.env.MSG91_AUTH_KEY;
            this.senderId = process.env.MSG91_SENDER_ID || 'TXTLCL';
            this.templateId = process.env.MSG91_TEMPLATE_ID;
            console.log(`  Reloaded AuthKey: ${this.authKey ? '***' + this.authKey.slice(-4) : 'STILL NOT SET'}`);
        }
    }

    // Generate universal UPI payment link
    generateUPIPaymentLink(amount, tokenId, customerName) {
        const upiId = process.env.UPI_ID || 'merchant@upi';
        const merchantName = 'Queue Management';
        const transactionNote = `Token ${tokenId}`;

        // Universal UPI deep link format
        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

        console.log(`[UPI] Generated payment link for Token ${tokenId}, Amount: ₹${amount}`);
        return upiLink;
    }

    // Validate mobile number
    validateMobileNumber(mobileNo) {
        const cleanNumber = mobileNo.toString().replace(/\D/g, '');

        // Remove leading 91 if present
        const finalNumber = cleanNumber.startsWith('91') && cleanNumber.length === 12
            ? cleanNumber.slice(2)
            : cleanNumber;

        const isValid = /^[6-9]\d{9}$/.test(finalNumber);

        if (process.env.SMS_DEBUG === 'true') {
            console.log(`[Validation] ${mobileNo} -> ${finalNumber} (Valid: ${isValid})`);
        }

        return {
            isValid,
            cleanNumber: isValid ? finalNumber : null,
            error: isValid ? null : 'Mobile number must be 10 digits starting with 6-9'
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Main method - Send SMS (this is what you should call)
    async sendSMS(mobileNo, tokenData, retryCount = 0) {
        return await this.sendTokenSMS(mobileNo, tokenData, retryCount);
    }

    // Send token SMS with Flow API (better for India DLT compliance)
    async sendTokenSMS(mobileNo, tokenData, retryCount = 0) {
        try {
            console.log(`\n[SMS Service] 📤 Attempt ${retryCount + 1}/${this.maxRetries + 1}`);

            // Validate mobile number
            const validation = this.validateMobileNumber(mobileNo);
            if (!validation.isValid) {
                console.error(`[SMS Service] ❌ ${validation.error}`);
                return {
                    success: false,
                    error: validation.error,
                    message: 'Invalid mobile number format'
                };
            }

            const cleanMobileNo = validation.cleanNumber;

            // Validate configuration
            const configValidation = this.validateConfig();
            if (!configValidation.valid) {
                console.error(`[SMS Service] ❌ Missing: ${configValidation.missing.join(', ')}`);
                return {
                    success: false,
                    error: `Missing: ${configValidation.missing.join(', ')}`,
                    message: 'SMS service not configured properly'
                };
            }

            const { tokenId, customerName, counterNumber, estimatedWaitTime, amount } = tokenData;

            // Format token ID properly (pad with zeros if needed)
            const formattedTokenId = String(tokenId).padStart(2, '0');

            // Generate payment link
            const paymentLink = this.generateUPIPaymentLink(amount, formattedTokenId, customerName);

            console.log(`[SMS Service] 📱 Sending to: +91${cleanMobileNo}`);
            console.log(`[SMS Service] 🎫 Token: ${formattedTokenId} | Counter: ${counterNumber}`);
            console.log(`[SMS Service] ⏱️ Wait: ${estimatedWaitTime} mins | Amount: ₹${amount}`);

            let response;
            let apiVersion;

            // Try Flow API first (if template ID is set)
            if (this.templateId) {
                console.log(`[SMS Service] 🔄 Using Flow API (Template: ${this.templateId})`);

                const flowPayload = {
                    flow_id: this.templateId,
                    sender: this.senderId,
                    mobiles: `91${cleanMobileNo}`,
                    // Template variables (adjust according to your MSG91 template)
                    tokenId: formattedTokenId,
                    customerName: customerName,
                    counterNumber: counterNumber,
                    waitTime: estimatedWaitTime,
                    amount: amount,
                    paymentLink: paymentLink
                };

                console.log(`[SMS Service] 📝 Message Content: Template-based SMS`);
                console.log(`[SMS Service] 🔗 Payment Link: ${paymentLink.substring(0, 50)}...`);

                response = await axios.post(this.baseUrl, flowPayload, {
                    headers: {
                        'authkey': this.authKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                apiVersion = 'Flow API (v5)';

            } else {
                // Fallback to Simple SMS API
                console.log(`[SMS Service] 🔄 Using Simple SMS API (No template)`);

                const message = `Dear ${customerName}, Your Token: ${formattedTokenId}, Counter: ${counterNumber}, Wait: ${estimatedWaitTime} min. Amount: Rs.${amount}. Pay: ${paymentLink}`;

                console.log(`[SMS Service] 📝 Message Content: ${message.substring(0, 100)}...`);
                console.log(`[SMS Service] 🔗 Payment Link: ${paymentLink.substring(0, 50)}...`);

                const smsPayload = {
                    sender: this.senderId,
                    route: '4', // Transactional
                    country: '91',
                    sms: [{
                        message: message,
                        to: [cleanMobileNo]
                    }]
                };

                response = await axios.post('https://api.msg91.com/api/v2/sendsms', smsPayload, {
                    headers: {
                        'authkey': this.authKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                });
                apiVersion = 'Simple SMS API (v2)';
            }

            console.log(`[SMS Service] 📡 HTTP Status: ${response.status}`);
            console.log(`[SMS Service] 📋 Response:`, JSON.stringify(response.data, null, 2));

            // Parse response
            const responseData = response.data;

            // Check for success
            if (response.status === 200 || responseData.type === 'success' || responseData.message === 'success') {
                const messageId = responseData.request_id || responseData.message_id || responseData.data?.request_id || 'unknown';

                console.log(`[SMS Service] ✅ SUCCESS! Message ID: ${messageId}`);

                // Print detailed success message
                console.log('\n' + '='.repeat(60));
                console.log('✅ SMS SENT SUCCESSFULLY');
                console.log('='.repeat(60));
                console.log(`📱 Mobile: +91${cleanMobileNo}`);
                console.log(`🎫 Token: ${tokenId}`);
                console.log(`👤 Customer: ${customerName}`);
                console.log(`🏪 Counter: ${counterNumber}`);
                console.log(`⏱️  Wait Time: ${estimatedWaitTime} minutes`);
                console.log(`💰 Amount: ₹${amount}`);
                console.log(`📨 Message ID: ${messageId}`);
                console.log(`🔧 API: ${apiVersion}`);
                console.log('='.repeat(60) + '\n');

                return {
                    success: true,
                    messageId: messageId,
                    message: 'SMS sent successfully',
                    apiVersion: apiVersion,
                    mobile: cleanMobileNo,
                    tokenData: tokenData
                };
            } else {
                throw new Error(responseData.message || 'MSG91 API error');
            }

        } catch (error) {
            console.error(`[SMS Service] ❌ Attempt ${retryCount + 1} failed:`, error.message);

            if (error.response) {
                console.error(`  HTTP Status: ${error.response.status}`);
                console.error(`  Response:`, JSON.stringify(error.response.data, null, 2));
            }

            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`[SMS Service] 🔄 Retrying in ${this.retryDelay}ms...`);
                await this.sleep(this.retryDelay);
                return this.sendTokenSMS(mobileNo, tokenData, retryCount + 1);
            }

            // Final failure
            const finalError = this.getDetailedErrorMessage(error);
            console.error(`[SMS Service] 💥 FINAL FAILURE: ${finalError}`);

            // Print detailed failure message
            console.log('\n' + '='.repeat(60));
            console.log('❌ SMS SENDING FAILED');
            console.log('='.repeat(60));
            console.log(`🚫 Error: ${finalError}`);
            console.log(`📝 Message: Failed after all retries`);
            console.log(`🔄 Attempts: ${retryCount + 1}`);
            console.log(`📱 Mobile: ${cleanMobileNo}`);
            console.log(`🎫 Token: ${tokenId}`);
            console.log(`👤 Customer: ${customerName}`);
            console.log('='.repeat(60));
            console.log('💡 TROUBLESHOOTING:');
            console.log('   1. Check MSG91_AUTH_KEY in .env file');
            console.log('   2. Verify account balance in MSG91 dashboard');
            console.log('   3. Check sender ID approval status');
            console.log('   4. Run: node testSmsService.js');
            console.log('='.repeat(60) + '\n');

            return {
                success: false,
                error: finalError,
                message: 'Failed after all retries',
                attempts: retryCount + 1,
                mobile: cleanMobileNo,
                tokenData: tokenData
            };
        }
    }

    // Check account balance
    async checkBalance() {
        try {
            console.log('[SMS Service] 💰 Checking balance...');

            const response = await axios.get(this.balanceUrl, {
                params: {
                    authkey: this.authKey
                },
                timeout: 10000
            });

            console.log('[SMS Service] Balance response:', response.data);

            return {
                success: true,
                balance: response.data
            };
        } catch (error) {
            console.error('[SMS Service] Failed to check balance:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get delivery report
    async getDeliveryReport(messageId) {
        try {
            console.log(`[SMS Service] 📊 Checking delivery for: ${messageId}`);

            const response = await axios.get('https://api.msg91.com/api/v2/reports', {
                params: {
                    authkey: this.authKey,
                    request_id: messageId
                },
                timeout: 10000
            });

            return {
                success: true,
                report: response.data
            };
        } catch (error) {
            console.error('[SMS Service] Failed to get report:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getDetailedErrorMessage(error) {
        if (error.response) {
            const { status, data } = error.response;
            const errorMessages = {
                400: 'Bad Request - Invalid parameters',
                401: 'Authentication Failed - Check your AUTH_KEY',
                403: 'Forbidden - Check sender ID approval',
                404: 'Not Found - Invalid API endpoint',
                429: 'Rate Limited - Too many requests',
                500: 'Server Error - MSG91 internal error',
                503: 'Service Unavailable - Try again later'
            };

            return errorMessages[status] || `HTTP ${status}: ${data?.message || 'Unknown error'}`;
        } else if (error.request) {
            return 'Network Error - Check internet connection';
        } else {
            return error.message;
        }
    }

    validateConfig() {
        const missing = [];
        if (!this.authKey) missing.push('MSG91_AUTH_KEY');
        if (!this.senderId) missing.push('MSG91_SENDER_ID');
        if (!process.env.UPI_ID) missing.push('UPI_ID');

        return {
            valid: missing.length === 0,
            missing
        };
    }

    async testSMSConfiguration(testMobileNo = null) {
        console.log('\n[SMS Service] 🔍 Testing Configuration...\n');

        // Test 1: Configuration
        console.log('1️⃣ Checking environment variables...');
        const configValidation = this.validateConfig();
        if (!configValidation.valid) {
            console.error(`   ❌ Missing: ${configValidation.missing.join(', ')}`);
            return {
                success: false,
                error: `Missing: ${configValidation.missing.join(', ')}`,
                configValid: false
            };
        }
        console.log('   ✅ Configuration OK');

        // Test 2: Mobile validation (if provided)
        if (testMobileNo) {
            console.log('\n2️⃣ Validating mobile number...');
            const mobileValidation = this.validateMobileNumber(testMobileNo);
            if (!mobileValidation.isValid) {
                console.error(`   ❌ ${mobileValidation.error}`);
                return {
                    success: false,
                    error: mobileValidation.error,
                    configValid: true,
                    mobileValid: false
                };
            }
            console.log('   ✅ Mobile number valid');

            // Test 3: Send test SMS
            console.log('\n3️ Sending test SMS...');
            const testResult = await this.sendTokenSMS(testMobileNo, {
                tokenId: '01',
                customerName: 'Test User',
                counterNumber: 1,
                estimatedWaitTime: 5,
                amount: 100
            });

            return testResult;
        }

        return {
            success: true,
            message: 'Configuration valid',
            configValid: true
        };
    }
}

export default new SmsService();