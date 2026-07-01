/**
 * API Integration Test Script
 *
 * You can run this script on your machine to test the entire lifecycle of the User Service:
 * 1. Register a new user.
 * 2. Log in with the registered credentials.
 * 3. Access the protected profile endpoint (/api/users/me) using the access token.
 * 4. Verify the access token via the verification endpoint (/api/auth/verify).
 * 5. Refresh the access token using the refresh token.
 * 6. Try accessing the profile endpoint with the new access token.
 *
 * Usage:
 * 1. Make sure your local PostgreSQL database is running and configured in your .env file.
 * 2. Start the server using: npm run dev
 * 3. Open a second terminal and run: node test-api.js
 */
const http = require("http");
const BASE_URL = "http://localhost:5000";
const PORT = 5000;
// Unique email for registration to avoid "email already exists" conflict on multiple runs
const testEmail = `student_${Math.floor(Math.random() * 100000)}@capstone.com`;
const testPassword = "SuperSecurePassword123!";
const testName = "Meenakshi Student";
let accessToken = "";
let refreshToken = "";
/**
 * Helper function to send HTTP requests using Node's built-in http module
 */
function makeRequest(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, body: parsedData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, rawBody: data });
        }
      });
    });
    req.on("error", (err) => {
      reject(err);
    });
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}
async function runTests() {
  console.log("==================================================");
  console.log("STARTING USER SERVICE INTEGRATION TESTS");
  console.log("==================================================");
  // 1. TEST REGISTRATION
  console.log(`\n[Test 1] Registering a new user: ${testEmail}...`);
  try {
    const registerRes = await makeRequest(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        email: testEmail,
        password: testPassword,
        name: testName,
      },
    );
    console.log(`Status Code: ${registerRes.statusCode}`);
    console.log("Response Body:", JSON.stringify(registerRes.body, null, 2));
    if (registerRes.statusCode !== 201) {
      throw new Error("Registration failed!");
    }
    console.log("✔ Registration Successful!");
  } catch (error) {
    console.error("✖ Test 1 Failed:", error.message);
    console.log(
      "\nMake sure your server is running on port 5000 and PostgreSQL is active.",
    );
    process.exit(1);
  }
  // 2. TEST LOGIN
  console.log(`\n[Test 2] Logging in as ${testEmail}...`);
  try {
    const loginRes = await makeRequest(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        email: testEmail,
        password: testPassword,
      },
    );
    console.log(`Status Code: ${loginRes.statusCode}`);
    console.log("Response Body (Truncated Tokens):", {
      message: loginRes.body.message,
      user: loginRes.body.user,
      token: loginRes.body.token
        ? `${loginRes.body.token.substring(0, 20)}...`
        : null,
      refreshToken: loginRes.body.refreshToken
        ? `${loginRes.body.refreshToken.substring(0, 20)}...`
        : null,
    });
    if (loginRes.statusCode !== 200) {
      throw new Error("Login failed!");
    }
    accessToken = loginRes.body.token;
    refreshToken = loginRes.body.refreshToken;
    console.log("✔ Login Successful! Tokens received.");
  } catch (error) {
    console.error("✖ Test 2 Failed:", error.message);
    process.exit(1);
  }
  // 3. TEST GET PROFILE (/api/users/me)
  console.log("\n[Test 3] Fetching user profile using Bearer access token...");
  try {
    const profileRes = await makeRequest({
      hostname: "localhost",
      port: PORT,
      path: "/api/users/me",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(`Status Code: ${profileRes.statusCode}`);
    console.log("Response Body:", JSON.stringify(profileRes.body, null, 2));
    if (profileRes.statusCode !== 200) {
      throw new Error("Profile retrieval failed!");
    }
    console.log("✔ Profile Retrieval Successful!");
  } catch (error) {
    console.error("✖ Test 3 Failed:", error.message);
    process.exit(1);
  }
  // 4. TEST TOKEN VERIFICATION (/api/auth/verify)
  console.log("\n[Test 4] Verifying the access token...");
  try {
    const verifyRes = await makeRequest({
      hostname: "localhost",
      port: PORT,
      path: "/api/auth/verify",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(`Status Code: ${verifyRes.statusCode}`);
    console.log("Response Body:", JSON.stringify(verifyRes.body, null, 2));
    if (verifyRes.statusCode !== 200) {
      throw new Error("Token verification failed!");
    }
    console.log("✔ Token Verification Successful!");
  } catch (error) {
    console.error("✖ Test 4 Failed:", error.message);
    process.exit(1);
  }
  // 5. TEST REFRESH TOKEN
  console.log("\n[Test 5] Refreshing the access token using refresh token...");
  try {
    const refreshRes = await makeRequest(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/auth/refresh",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        refreshToken: refreshToken,
      },
    );
    console.log(`Status Code: ${refreshRes.statusCode}`);
    console.log("Response Body (New Token):", {
      token: refreshRes.body.token
        ? `${refreshRes.body.token.substring(0, 20)}...`
        : null,
    });
    if (refreshRes.statusCode !== 200) {
      throw new Error("Token refresh failed!");
    }
    accessToken = refreshRes.body.token;
    console.log("✔ Token Refresh Successful! New access token stored.");
  } catch (error) {
    console.error("✖ Test 5 Failed:", error.message);
    process.exit(1);
  }
  // 6. TEST PROFILE ACCESS WITH NEW ACCESS TOKEN
  console.log(
    "\n[Test 6] Fetching profile again with the newly issued access token...",
  );
  try {
    const profileRes = await makeRequest({
      hostname: "localhost",
      port: PORT,
      path: "/api/users/me",
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(`Status Code: ${profileRes.statusCode}`);
    console.log("Response Body:", JSON.stringify(profileRes.body, null, 2));
    if (profileRes.statusCode !== 200) {
      throw new Error("Profile retrieval with refreshed token failed!");
    }
    console.log("✔ Profile Retrieval with Refreshed Token Successful!");
  } catch (error) {
    console.error("✖ Test 6 Failed:", error.message);
    process.exit(1);
  }
  console.log("\n==================================================");
  console.log("ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================");
}
runTests();
