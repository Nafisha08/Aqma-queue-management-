# SMS Service Troubleshooting Guide

## Common Issues and Solutions

### 1. SMS Not Reaching Phone Numbers

#### **Issue**: SMS delivery fails silently
**Symptoms**: API returns success but SMS never arrives

**Possible Causes & Solutions**:

1. **Invalid Auth Key**
   - Check your `MSG91_AUTH_KEY` in `.env`
   - Verify it's active in MSG91 dashboard
   - Test with: `SmsService.testSMSConfiguration()`

2. **Blocked Sender ID**
   - Your sender ID might be blocked or not approved
   - Check MSG91 dashboard for sender ID status
   - Use 'TXTLCL' for testing (limited delivery)

3. **DLT Template Issues (India)**
   - SMS content must match approved DLT template
   - Use Flow API with template ID for better delivery
   - Set `MSG91_TEMPLATE_ID` in `.env`

4. **Insufficient Balance**
   - Check account balance: `SmsService.checkBalance()`
   - Top up credits in MSG91 dashboard

5. **Rate Limiting**
   - Too many SMS in short time
   - Add delays between SMS (2+ seconds recommended)

### 2. API Connection Issues

#### **Issue**: Network errors or timeouts
**Symptoms**: `Network Error: Unable to reach MSG91 servers`

**Solutions**:
- Check internet connection
- Verify MSG91 API endpoints are accessible
- Try different network/VPN
- Check firewall settings

#### **Issue**: HTTP 401/403 errors
**Symptoms**: Authentication failed

**Solutions**:
- Verify `MSG91_AUTH_KEY` is correct
- Check if account is active
- Ensure sender ID is approved for your account

### 3. Mobile Number Validation Issues

#### **Issue**: Invalid mobile number format
**Symptoms**: "Mobile number must be exactly 10 digits"

**Solutions**:
- Remove country code (+91) - service adds it automatically
- Remove spaces, hyphens, or special characters
- Ensure exactly 10 digits for Indian numbers

### 4. Configuration Issues

#### **Issue**: Missing environment variables
**Symptoms**: "Missing configuration" errors

**Required Variables**:
```env
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_ID=TXTLCL
MSG91_TEMPLATE_ID=your_template_id  # Optional but recommended
UPI_ID=your_upi_id@bank
SMS_DEBUG=true
```

### 5. Testing and Debugging

#### **Run Configuration Test**:
```javascript
const result = await SmsService.testSMSConfiguration('9876543210');
console.log(result);
```

#### **Check Account Balance**:
```javascript
const balance = await SmsService.checkBalance();
console.log(balance);
```

#### **Enable Debug Logging**:
Set `SMS_DEBUG=true` in `.env` for detailed logs.

#### **Check Delivery Status**:
```javascript
const report = await SmsService.getDeliveryReport(messageId);
console.log(report);
```

### 6. MSG91 Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 101 | Invalid mobile number | Check number format (10 digits) |
| 102 | Invalid sender ID | Verify sender ID in dashboard |
| 103 | Invalid auth key | Check API key |
| 104 | Invalid message content | Check SMS content length/format |
| 105 | Insufficient balance | Add credits to account |
| 106 | Invalid route | Use route '4' for transactional |
| 107 | Blocked sender ID | Contact MSG91 support |
| 109 | Invalid DLT template | Create/approve template |
| 110 | Rate limit exceeded | Add delays between SMS |

### 7. Best Practices

1. **Use Flow API for India**: Better DLT compliance and delivery rates
2. **Validate Numbers**: Always validate mobile numbers before sending
3. **Handle Retries**: Service automatically retries failed SMS (up to 3 times)
4. **Monitor Balance**: Check balance regularly to avoid failures
5. **Add Delays**: Wait 2+ seconds between SMS to avoid rate limits
6. **Log Everything**: Enable debug mode for troubleshooting
7. **Test First**: Use `testSMSConfiguration()` before production use

### 8. Quick Diagnosis Script

Run this to diagnose common issues:

```javascript
import SmsService from './src/utils/smsService.js';

async function diagnoseSMSIssues() {
    console.log('🔍 SMS Service Diagnosis\n');

    // 1. Check configuration
    console.log('1. Checking configuration...');
    const configTest = await SmsService.testSMSConfiguration();
    console.log('Config test result:', configTest);

    // 2. Check balance
    console.log('\n2. Checking account balance...');
    const balance = await SmsService.checkBalance();
    console.log('Balance check result:', balance);

    // 3. Test with sample number (optional)
    console.log('\n3. Testing SMS send (optional)...');
    // Uncomment below line to test actual SMS sending
    // const smsTest = await SmsService.testSMSConfiguration('9876543210');
    // console.log('SMS test result:', smsTest);

    console.log('\n✅ Diagnosis complete. Check results above.');
}

// Run diagnosis
diagnoseSMSIssues().catch(console.error);
```

### 9. Getting Help

1. **Check Logs**: Enable `SMS_DEBUG=true` and check console output
2. **MSG91 Dashboard**: Verify account status, balance, and sender IDs
3. **Test Environment**: Use test credentials first
4. **Contact Support**: Reach out to MSG91 support with error codes and logs

### 10. Production Checklist

- [ ] Valid MSG91 auth key configured
- [ ] Approved sender ID set
- [ ] DLT template created (India)
- [ ] Sufficient account balance
- [ ] UPI ID configured for payment links
- [ ] Debug logging enabled for monitoring
- [ ] Error handling implemented in application
- [ ] Rate limiting considered for bulk SMS
- [ ] Mobile number validation in place
- [ ] Retry mechanism configured
