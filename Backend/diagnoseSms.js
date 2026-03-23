import SmsService from './src/utils/smsService.js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseSMSIssues() {
    console.log('\n🔍 SMS Service Diagnosis\n');

    // 1. Check configuration
    console.log('1. Checking environment variables...');
    const configValidation = SmsService.validateConfig();
    if (!configValidation.valid) {
        console.error(`   ❌ Missing: ${configValidation.missing.join(', ')}`);
        return {
            success: false,
            error: `Missing: ${configValidation.missing.join(', ')}`,
            configValid: false
        };
    }
    console.log('   ✅ Configuration OK');

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
