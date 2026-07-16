const path = require("path");
const mongoose = require("mongoose");
const env = require("./config/env");
const emailService = require("./services/email.service");
const User = require("./models/user.model");
const authService = require("./services/auth.service");

const testEmail = process.argv[2];

if (!testEmail) {
  console.error("❌ Please provide a test email address. Example:\n   node src/test_resend_integration.js your-email@example.com");
  process.exit(1);
}

const runTest = async () => {
  console.log("🚀 Starting Resend integration and sign up workflow test...\n");
  console.log(`Configured Sender (EMAIL_FROM/RESEND_FROM_EMAIL): ${env.RESEND_FROM_EMAIL}`);
  console.log(`Configured API Key: ${env.RESEND_API_KEY ? env.RESEND_API_KEY.substring(0, 15) + "..." : "None"}`);
  console.log(`Target Test Email: ${testEmail}\n`);

  try {
    // 1. Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB.");

    // 2. Clean up existing test user
    console.log(`🔄 Cleaning up any existing user with email: ${testEmail}...`);
    await User.deleteMany({ email: testEmail.toLowerCase() });
    console.log("✅ Cleanup complete.");

    // 3. Test sending directly via EmailService
    console.log("\n--- TEST 1: Direct Verification Email sending via EmailService ---");
    console.log(`Sending email to ${testEmail}...`);
    const directResult = await emailService.sendVerificationEmail(
      testEmail,
      "Test User",
      "http://localhost:5000/api/v1/auth/verify-email/test-token-direct"
    );
    console.log("✅ Direct email sent successfully! Response:", directResult);

    // 4. Test Sign Up workflow (calls emailService.sendVerificationEmail internally)
    console.log("\n--- TEST 2: Sign Up Workflow via AuthService.register ---");
    const signUpData = {
      firstName: "Test",
      lastName: "User",
      email: testEmail,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
      role: "CUSTOMER",
    };
    
    console.log(`Registering user ${testEmail}...`);
    const registerResult = await authService.register(signUpData);
    console.log("✅ User registered successfully in DB!");
    console.log("User Document:", JSON.stringify(registerResult.user, null, 2));

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
    console.log("Please check your email inbox (including spam folder) for the verification emails.");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB.");
  }
};

runTest();
