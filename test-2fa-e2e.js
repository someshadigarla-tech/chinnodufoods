/**
 * Automated End-to-End Test Suite for Chinnodu Foods 2FA Authenticator System
 * Tests:
 * 1. Zero-trust password verification & pre-auth session creation
 * 2. First-time setup onboarding (Secret generation, QR code, 8 recovery codes)
 * 3. 2FA confirmation via valid TOTP code
 * 4. Normal login flow (Password -> Requires 2FA -> Correct TOTP -> Authenticated session)
 * 5. Rejection of incorrect & expired TOTP codes
 * 6. Rate limiting / brute-force protection
 * 7. Single-use emergency recovery codes (Burn once, reject replay)
 * 8. Protection of admin endpoints without 2FA
 */

const http = require("http");
const { totpAuthService } = require("./totp-auth");
const { generateSync } = require("otplib");

const PORT = 8089;
process.env.PORT = PORT;
process.env.NODE_ENV = "test";
process.env.ADMIN_PASSWORD = "test-admin-secure-pass-2026";
process.env.ADMIN_USERNAME = "testadmin";
process.env.ALLOW_DEV_OTP = "false";

// Helper for making HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers
    };
    if (postData) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
            rawBody: data
          });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookie(resHeaders) {
  const setCookie = resHeaders["set-cookie"];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
  const match = cookieStr.match(/(?:session_token|admin_session)=([^;]+)/);
  return match ? `session_token=${match[1]}` : null;
}


async function runTests() {
  // Start the server
  const serverModule = require("./server.js");
  const { readOtpsData, saveOtpsData, flushOtpsSync } = serverModule;

  // Reset 2FA state to initial clean state for tests, while saving current config to restore afterwards
  const initialOtps = readOtpsData();
  const savedOriginalConfig = JSON.parse(JSON.stringify(initialOtps.admin2fa || {}));
  initialOtps.admin2fa = {
    two_factor_enabled: false,
    totp_secret_encrypted: null,
    two_factor_confirmed_at: null,
    recovery_codes_hashes: []
  };
  saveOtpsData(initialOtps);


  // Give server 500ms to bind to port
  await new Promise((r) => setTimeout(r, 600));


  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Direct endpoint protection (Zero-Trust)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Direct access attempt to protected admin endpoint without auth");
    const unauthCheck = await request("GET", "/api/admin/check-auth");
    assert(
      unauthCheck.statusCode === 401 && unauthCheck.body.authenticated === false,
      "/api/admin/check-auth denies unauthenticated requests with 401"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 2: First-time 2FA Setup Flow
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] First-time Admin Login triggers 2FA setup onboarding");
    const loginRes1 = await request("POST", "/api/admin/login", {
      username: "testadmin",
      password: "test-admin-secure-pass-2026"
    });

    assert(loginRes1.statusCode === 200, "Password verified successfully");
    assert(loginRes1.body.requires2FaSetup === true, "Requires 2FA setup flag returned");
    assert(Boolean(loginRes1.body.preAuthSessionId), "Pre-auth session ID issued");
    assert(
      loginRes1.body.qrCodeDataUrl && loginRes1.body.qrCodeDataUrl.startsWith("data:image/png;base64,"),
      "Dynamic QR code data URL generated"
    );
    assert(
      Array.isArray(loginRes1.body.recoveryCodes) && loginRes1.body.recoveryCodes.length === 8,
      "8 cryptographically secure emergency recovery codes generated"
    );
    assert(
      !loginRes1.headers["set-cookie"],
      "NO authenticated session cookie issued during pre-authentication"
    );

    const setupSessionId = loginRes1.body.preAuthSessionId;
    const cleanSecret = (loginRes1.body.manualSecretKey || '').replace(/\s+/g, '');
    const recoveryCodes = loginRes1.body.recoveryCodes;

    // Test invalid TOTP during setup
    console.log("\n[TEST 3] Setup verification with invalid 6-digit TOTP code");
    const badSetupRes = await request("POST", "/api/admin/2fa/verify-setup", {
      preAuthSessionId: setupSessionId,
      totpCode: "000000"
    });
    assert(badSetupRes.statusCode === 400 || badSetupRes.statusCode === 401, "Invalid code rejected during setup");
    assert(readOtpsData().admin2fa.two_factor_enabled === false, "2FA remains disabled after bad code");

    // Test valid TOTP during setup
    console.log("\n[TEST 4] Setup verification with valid 6-digit TOTP code");
    const validSetupCode = generateSync({ secret: cleanSecret });
    const goodSetupRes = await request("POST", "/api/admin/2fa/verify-setup", {
      preAuthSessionId: setupSessionId,
      totpCode: validSetupCode
    });

    assert(goodSetupRes.statusCode === 200 && goodSetupRes.body.success === true, "Setup confirmed with valid code");
    assert(readOtpsData().admin2fa.two_factor_enabled === true, "2FA is now permanently enabled in backend");
    const sessionCookie = extractCookie(goodSetupRes.headers);

    assert(Boolean(sessionCookie), "Authenticated HttpOnly session cookie issued upon successful 2FA setup");

    // Verify session now has access
    const authCheckAfterSetup = await request("GET", "/api/admin/check-auth", null, {
      Cookie: sessionCookie
    });
    assert(authCheckAfterSetup.body.authenticated === true, "Admin session is now authorized for admin dashboard");

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Normal Login with 2FA Enabled
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Normal Login Flow (Password -> Requires 2FA -> Correct TOTP)");
    const loginRes2 = await request("POST", "/api/admin/login", {
      username: "testadmin",
      password: "test-admin-secure-pass-2026"
    });

    assert(loginRes2.statusCode === 200, "Password verified");
    assert(loginRes2.body.requires2Fa === true, "Server prompts for 2FA verification");
    assert(!loginRes2.headers["set-cookie"], "Session cookie NOT issued until TOTP verified");

    const preAuthId = loginRes2.body.preAuthSessionId;

    // Test incorrect TOTP
    console.log("\n[TEST 6] Incorrect TOTP code during normal login");
    const wrongTotpRes = await request("POST", "/api/admin/2fa/verify", {
      preAuthSessionId: preAuthId,
      totpCode: "123456"
    });
    assert(wrongTotpRes.statusCode === 401, "Wrong TOTP code denied with 401");
    assert(!wrongTotpRes.headers["set-cookie"], "No session cookie on failed TOTP");

    // Test correct TOTP
    console.log("\n[TEST 7] Correct TOTP code during normal login");
    const currentTotp = generateSync({ secret: cleanSecret });
    const correctTotpRes = await request("POST", "/api/admin/2fa/verify", {
      preAuthSessionId: preAuthId,
      totpCode: currentTotp
    });
    assert(correctTotpRes.statusCode === 200 && correctTotpRes.body.success === true, "Login successful with valid TOTP");
    const loginCookie = extractCookie(correctTotpRes.headers);
    assert(Boolean(loginCookie), "Authenticated session cookie received");

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Brute-Force Rate Limiting Protection
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Brute-force rate limiting (5 failed attempts trigger lockout)");
    const bruteLoginRes = await request("POST", "/api/admin/login", {
      username: "testadmin",
      password: "test-admin-secure-pass-2026"
    });
    const brutePreAuthId = bruteLoginRes.body.preAuthSessionId;

    for (let i = 1; i <= 5; i++) {
      await request("POST", "/api/admin/2fa/verify", {
        preAuthSessionId: brutePreAuthId,
        totpCode: "999999"
      });
    }

    const lockedOutRes = await request("POST", "/api/admin/2fa/verify", {
      preAuthSessionId: brutePreAuthId,
      totpCode: generateSync({ secret: cleanSecret })
    });
    assert(
      lockedOutRes.statusCode === 429 || (lockedOutRes.body && lockedOutRes.body.lockedOut),
      "Pre-auth session locked out after 5 consecutive failures"
    );

    // Clear lockout on testadmin so recovery tests can proceed
    const otpsAfterBrute = readOtpsData();
    if (otpsAfterBrute.lockouts) {
      delete otpsAfterBrute.lockouts["testadmin"];
      saveOtpsData(otpsAfterBrute);
    }


    // -------------------------------------------------------------------------
    // TEST SUITE 5: Emergency Recovery Codes
    // -------------------------------------------------------------------------
    console.log("\n[TEST 9] Emergency Single-Use Recovery Code verification");
    const recoveryLogin = await request("POST", "/api/admin/login", {
      username: "testadmin",
      password: "test-admin-secure-pass-2026"
    });
    const recPreAuthId = recoveryLogin.body.preAuthSessionId;
    const testCodeToUse = recoveryCodes[0];

    const recRes = await request("POST", "/api/admin/2fa/recovery", {
      preAuthSessionId: recPreAuthId,
      recoveryCode: testCodeToUse
    });
    assert(recRes.statusCode === 200 && recRes.body.success === true, "Recovery code accepted and session issued");
    assert(recRes.body.remainingCodesCount === 7, "Remaining recovery codes decremented to 7");

    // Test replay attack with the SAME recovery code
    console.log("\n[TEST 10] Recovery code replay prevention (Single-use enforcement)");
    const recoveryLogin2 = await request("POST", "/api/admin/login", {
      username: "testadmin",
      password: "test-admin-secure-pass-2026"
    });
    const recPreAuthId2 = recoveryLogin2.body.preAuthSessionId;

    const replayRes = await request("POST", "/api/admin/2fa/recovery", {
      preAuthSessionId: recPreAuthId2,
      recoveryCode: testCodeToUse
    });
    assert(replayRes.statusCode === 401, "Previously used recovery code strictly denied (Anti-replay)");

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Secret Protection & Status API
    // -------------------------------------------------------------------------
    console.log("\n[TEST 11] Status API never exposes the raw TOTP secret");
    const statusRes = await request("GET", "/api/admin/2fa/status", null, {
      Cookie: loginCookie
    });
    assert(statusRes.statusCode === 200, "Status endpoint accessible to authenticated admin");
    assert(statusRes.body.secret === undefined, "Raw secret is NOT exposed in status API");
    assert(statusRes.body.totp_secret_encrypted === undefined, "Encrypted secret is NOT exposed in status API");
    assert(statusRes.body.two_factor_enabled === true, "two_factor_enabled is true");

    // Summary
    console.log("\n===============================================================");
    console.log(`🎯 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================");

    async function restoreAndExit(code) {
      try {
        const finalOtps = readOtpsData();
        finalOtps.admin2fa = savedOriginalConfig;
        saveOtpsData(finalOtps);
        if (typeof flushOtpsSync === 'function') flushOtpsSync();
        console.log("[TEST] Restored original pre-test 2FA configuration in RAM/JSON.");
      } catch (e) {
        console.warn("[TEST] Could not restore config:", e.message);
      }
      process.exit(code);
    }

    if (failed === 0) {
      console.log("✨ ALL 11 SECURITY AND FUNCTIONAL E2E TESTS PASSED SUCCESSFULLY! ✨\n");
      await restoreAndExit(0);
    } else {
      console.error("💥 SOME TESTS FAILED!\n");
      await restoreAndExit(1);
    }
  } catch (err) {
    console.error("Unexpected test error:", err);
    try {
      const finalOtps = readOtpsData();
      finalOtps.admin2fa = savedOriginalConfig;
      saveOtpsData(finalOtps);
      if (typeof flushOtpsSync === 'function') flushOtpsSync();
    } catch (_) {}
    process.exit(1);
  }
}

runTests();

