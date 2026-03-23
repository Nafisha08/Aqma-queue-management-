// import SmsService from './src/utils/smsService.js';
// import dotenv from 'dotenv';

// dotenv.config();

// // Quick test function
// async function quickTest() {
//     console.log('🚀 Quick SMS Test\n');

//     // Test data with Token ID as "01"
//     const testData = {
//         tokenId: '01',           // Ya 1 bhi likh sakte ho, automatically "01" ban jayega
//         customerName: 'Raj Kumar',
//         counterNumber: 1,
//         estimatedWaitTime: 10,
//         amount: 150
//     };

//     // Replace with your test mobile number
//     const testMobile = '9110053531'; // ⚠️ APNA NUMBER DAALO (10 digits, no +91)

//     console.log('📋 Test Data:');
//     console.log('  Token ID:', testData.tokenId);
//     console.log('  Customer:', testData.customerName);
//     console.log('  Mobile:', testMobile);
//     console.log('  Amount:', testData.amount);
//     console.log('\n📤 Sending SMS...\n');

//     // Send SMS
//     const result = await SmsService.sendSMS(testMobile, testData);

//     // Result automatically console mein print ho jayega
//     console.log('\n📊 Final Result:', {
//         success: result.success,
//         messageId: result.messageId || 'N/A',
//         error: result.error || 'None'
//     });

//     return result;
// }

// // Test with multiple token IDs
// async function testMultipleTokens() {
//     console.log('🚀 Testing Multiple Token IDs\n');

//     const tokens = [
//         { id: '01', name: 'Alice', mobile: '9876543210', amount: 100 },
//         { id: '02', name: 'Bob', mobile: '9876543211', amount: 150 },
//         { id: '03', name: 'Charlie', mobile: '9876543212', amount: 200 }
//     ];

//     for (const token of tokens) {
//         console.log(`\n${'='.repeat(60)}`);
//         console.log(`Testing Token ID: ${token.id}`);
//         console.log('='.repeat(60));

//         await SmsService.sendSMS(token.mobile, {
//             tokenId: token.id,
//             customerName: token.name,
//             counterNumber: 1,
//             estimatedWaitTime: 10,
//             amount: token.amount
//         });

//         // Wait 2 seconds before next SMS
//         if (token !== tokens[tokens.length - 1]) {
//             console.log('\n⏳ Waiting 2 seconds...');
//             await new Promise(resolve => setTimeout(resolve, 2000));
//         }
//     }

//     console.log('\n✅ All tests completed!');
// }

// // Example: Exactly how you'll use it in your application
// async function yourApplicationExample() {
//     console.log('📱 Application Example: Token Generation + SMS\n');

//     // When customer gets token "01"
//     const customerData = {
//         tokenId: '01',              // Your token ID
//         customerName: 'Priya Sharma',
//         mobileNo: '9876543210',     // Customer's mobile
//         counterNumber: 1,
//         estimatedWaitTime: 15,
//         amount: 150
//     };

//     console.log(`🎫 Token Generated: ${customerData.tokenId}`);
//     console.log(`👤 Customer: ${customerData.customerName}`);
//     console.log('📤 Sending SMS notification...\n');

//     // Send SMS
//     const smsResult = await SmsService.sendSMS(
//         customerData.mobileNo,
//         {
//             tokenId: customerData.tokenId,
//             customerName: customerData.customerName,
//             counterNumber: customerData.counterNumber,
//             estimatedWaitTime: customerData.estimatedWaitTime,
//             amount: customerData.amount
//         }
//     );

//     // Check result
//     if (smsResult.success) {
//         console.log('\n✅ Token generated and SMS sent!');
//         console.log('📨 Message ID:', smsResult.messageId);

//         // Save message ID to database (optional)
//         // await Token.updateOne(
//         //     { tokenId: customerData.tokenId },
//         //     { smsMessageId: smsResult.messageId }
//         // );

//     } else {
//         console.log('\n⚠️ Token generated but SMS failed');
//         console.log('❌ Error:', smsResult.error);

//         // Handle failed SMS (maybe retry later or notify admin)
//         // await logFailedSMS(customerData.tokenId, smsResult.error);
//     }

//     return smsResult;
// }

// // Show expected console output
// function showExpectedOutput() {
//     console.log(`
// ╔════════════════════════════════════════════════════════════╗
// ║           EXPECTED CONSOLE OUTPUT (SUCCESS)                ║
// ╚════════════════════════════════════════════════════════════╝

// [SMS Service] 📤 Attempt 1/4
// [UPI] Generated payment link for Token 01, Amount: ₹150
// [SMS Service] 📱 Sending to: +919876543210
// [SMS Service] 🎫 Token: 01 | Counter: 1
// [SMS Service] ⏱️ Wait: 10 mins | Amount: ₹150
// [SMS Service] 🔄 Using Simple SMS API (No template)
// [SMS Service] 📡 HTTP Status: 200
// [SMS Service] 📋 Response: { "type": "success", "request_id": "abc123" }
// [SMS Service] ✅ SUCCESS! Message ID: abc123

// ============================================================
// ✅ SMS SENT SUCCESSFULLY
// ============================================================
// 📱 Mobile: +919876543210
// 🎫 Token: 01
// 👤 Customer: Raj Kumar
// 🏪 Counter: 1
// ⏱️  Wait Time: 10 minutes
// 💰 Amount: ₹150
// 📨 Message ID: abc123
// 🔧 API: Simple SMS API (v2)
// ============================================================

// ✅ Token generated and SMS sent!
// 📨 Message ID: abc123
// `);
// }

// // Main execution
// async function main() {
//     try {
//         console.log('╔════════════════════════════════════════════════════════════╗');
//         console.log('║           SMS SERVICE - QUICK TEST SUITE                   ║');
//         console.log('╚════════════════════════════════════════════════════════════╝\n');

//         // Show expected output first
//         showExpectedOutput();

//         console.log('\n🔍 Starting actual test...\n');
//         console.log('⚠️  Make sure to update mobile number in code!');
//         console.log('⚠️  Press Ctrl+C to cancel or wait 5 seconds...\n');

//         await new Promise(resolve => setTimeout(resolve, 5000));

//         // Run quick test
//         await quickTest();

//         // Uncomment below to test multiple tokens
//         // await testMultipleTokens();

//         // Uncomment below to see application example
//         // await yourApplicationExample();

//     } catch (error) {
//         console.error('\n💥 Test failed:', error.message);
//         console.error('Stack trace:', error.stack);
//     }
// }

// // ✅ FIXED: Windows-compatible execution check
// // Run main function directly without complex path checks
// main()
//     .then(() => {
//         console.log('\n👋 Test completed!');
//         process.exit(0);
//     })
//     .catch(error => {
//         console.error('\n❌ Fatal error:', error.message);
//         process.exit(1);
//     });

// // Export functions for manual testing
// export { quickTest, testMultipleTokens, yourApplicationExample };