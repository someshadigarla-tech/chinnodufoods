// =============================================================================
    // Universal Cloud Backend Routing & Cross-Origin Admin Authentication
    // =============================================================================
    const BACKEND_URL = "https://chinnodufoods.onrender.com";
    const LOCAL_URL = "http://localhost:8080";
    let API_BASE = "";
    if (window.location.protocol === "file:") {
      API_BASE = LOCAL_URL;
    } else if (window.location.hostname.includes("github.io") || window.location.hostname.includes("chinnodufoods.com")) {
      API_BASE = BACKEND_URL;
    } else if (window.location.port && window.location.port !== "8080" && window.location.port !== "8089") {
      API_BASE = LOCAL_URL;
    }


    function getAdminAuthHeaders(customHeaders = {}) {
      const token = localStorage.getItem("admin_session_token");
      const headers = { ...customHeaders };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    }

    // Intercept native fetch: route /api/... to Render when on GitHub Pages or file preview, and inject auth token
    const _originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      let finalUrl = url;
      if (typeof url === "string" && url.startsWith("/api/")) {
        finalUrl = `${API_BASE}${url}`;
      }
      options = options || {};
      options.credentials = options.credentials || "include";
      options.headers = getAdminAuthHeaders(options.headers || {});
      return _originalFetch.call(this, finalUrl, options);
    };

    // HTML Sanitizer Helper
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // State
    let ALL_ORDERS = [];
    let CURRENT_ORDER_FILTER = 'all';
    let CURRENT_DATE_FILTER = 'all';
    window.CURRENT_DATE_FILTER = 'all';
    let CURRENT_PREVIEW_ORDERS = [];
    let CURRENT_PREVIEW_DATE = 'all';
    let AVAILABLE_DATES_SUMMARY = [];
    let EXPANDED_ORDER_IDS = new Set();
    let MODAL_TARGET_DATE = 'all';
    let ACTIVE_CUSTOMER_HISTORY = null;
    let ACTIVE_CUSTOMER_ORDER_ID = null;
    let SEARCH_QUERY = '';
    let ACTIVE_VIEW = 'orders';
    let FINANCE_DATA = { accounts: [], transactions: [], summary: {} };
    let CURRENT_TXN_FILTER = 'all';
    let CURRENT_PAGE = 1;
    let TOTAL_PAGES = 1;
    let TOTAL_ORDERS = 0;
    let PAGE_SIZE = 25;
    let SEARCH_DEBOUNCE_TIMER = null;

    // Products & Stock State
    let ALL_PRODUCTS = [];
    let CURRENT_PRODUCT_CAT_FILTER = 'all';
    let CURRENT_PRODUCT_STOCK_FILTER = 'all';
    let PRODUCT_SEARCH_QUERY = '';
    let PRODUCTS_STATS = { total: 0, inStock: 0, outOfStock: 0, categoriesCount: 0 };
    let PRODUCT_SEARCH_DEBOUNCE = null;

    // WhatsApp Customer Alerts Suite State
    let ACTIVE_WA_ORDER = null;
    let ACTIVE_WA_TYPE = 'confirmed';

    const COURIER_URL_MAP = {
      'India Post (Speed Post)': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
      'DTDC Express': 'https://www.dtdc.in/tracking.asp',
      'Delhivery': 'https://www.delhivery.com/track/package/',
      'Blue Dart': 'https://www.bluedart.com/tracking',
      'The Professional Couriers': 'https://www.tpcindia.com',
      'ST Courier': 'https://stcourier.com/track',
      'Shadowfax': 'https://tracker.shadowfax.in/',
      'Other': ''
    };

    // =========================================================================
    // 🛡️ SECURE 2FA TOTP AUTHENTICATOR APP & RECOVERY STATE
    // =========================================================================
    let PRE_AUTH_SESSION_ID = null;
    let SETUP_PRE_AUTH_SESSION_ID = null;
    let IS_VERIFYING_TOTP = false;
    let CURRENT_SETUP_RECOVERY_CODES = [];
    let CURRENT_MODAL_RECOVERY_CODES = [];

    // Helper: Toggle password show/hide with embedded Eye SVG icon
    function togglePasswordVisibility() {
      const pwd = document.getElementById("admin-password-input");
      const btn = document.getElementById("toggle-pwd-btn");
      if (!pwd || !btn) return;
      if (pwd.type === "password") {
        pwd.type = "text";
        btn.setAttribute("title", "Click to hide password");
        btn.setAttribute("aria-label", "Hide password");
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B1426" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
      } else {
        pwd.type = "password";
        btn.setAttribute("title", "Click to show typed password");
        btn.setAttribute("aria-label", "Show password");
        btn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    }

    // Helper: Update filled state styling for 6-digit input grids
    function updateDigitGridFilledState(prefix, count = 6) {
      for (let j = 0; j < count; j++) {
        const box = document.getElementById(`${prefix}-digit-${j}`);
        if (!box) continue;
        if (box.value && box.value.trim() !== "") {
          box.classList.add("filled");
        } else {
          box.classList.remove("filled");
        }
      }
    }

    // Helper: Collect entered code from digit grid
    function getEnteredDigitCode(prefix, count = 6) {
      let code = "";
      for (let j = 0; j < count; j++) {
        const box = document.getElementById(`${prefix}-digit-${j}`);
        if (box) code += (box.value || "").trim();
      }
      return code;
    }

    // Helper: Clear digit grid and refocus first box
    function clearDigitGrid(prefix, count = 6) {
      for (let j = 0; j < count; j++) {
        const box = document.getElementById(`${prefix}-digit-${j}`);
        if (box) box.value = "";
      }
      updateDigitGridFilledState(prefix, count);
      const first = document.getElementById(`${prefix}-digit-0`);
      if (first) first.focus();
    }

    // Generic 6-Digit Grid Setup (Auto-advance, backspace jump, paste, auto-verify)
    function setupDigitGrid(prefix, count = 6, onComplete, errorBannerId) {
      for (let i = 0; i < count; i++) {
        const input = document.getElementById(`${prefix}-digit-${i}`);
        if (!input) continue;

        input.addEventListener("focus", () => {
          input.select();
        });

        input.addEventListener("keydown", (e) => {
          if (errorBannerId) {
            const errBanner = document.getElementById(errorBannerId);
            if (errBanner) errBanner.style.display = "none";
          }

          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            input.value = e.key;
            updateDigitGridFilledState(prefix, count);

            if (i < count - 1) {
              const next = document.getElementById(`${prefix}-digit-${i + 1}`);
              if (next) {
                next.focus();
                next.select();
              }
            }
            const fullCode = getEnteredDigitCode(prefix, count);
            if (fullCode.length === count && /^\d+$/.test(fullCode) && onComplete) {
              onComplete();
            }
            return;
          }

          if (e.key === "Backspace") {
            e.preventDefault();
            if (input.value) {
              input.value = "";
              updateDigitGridFilledState(prefix, count);
            } else if (i > 0) {
              const prev = document.getElementById(`${prefix}-digit-${i - 1}`);
              if (prev) {
                prev.value = "";
                updateDigitGridFilledState(prefix, count);
                prev.focus();
              }
            }
            return;
          }

          if (e.key === "ArrowLeft" && i > 0) {
            e.preventDefault();
            const prev = document.getElementById(`${prefix}-digit-${i - 1}`);
            if (prev) {
              prev.focus();
              prev.select();
            }
          } else if (e.key === "ArrowRight" && i < count - 1) {
            e.preventDefault();
            const next = document.getElementById(`${prefix}-digit-${i + 1}`);
            if (next) {
              next.focus();
              next.select();
            }
          }
        });

        input.addEventListener("input", () => {
          const raw = input.value.replace(/\D/g, "");
          if (raw.length > 1) {
            for (let j = 0; j < count; j++) {
              const box = document.getElementById(`${prefix}-digit-${j}`);
              if (box) box.value = raw[j] || "";
            }
            updateDigitGridFilledState(prefix, count);
            const focusIdx = Math.min(raw.length, count - 1);
            const focusEl = document.getElementById(`${prefix}-digit-${focusIdx}`);
            if (focusEl) focusEl.focus();
            const fullCode = getEnteredDigitCode(prefix, count);
            if (fullCode.length === count && /^\d+$/.test(fullCode) && onComplete) {
              onComplete();
            }
            return;
          }

          input.value = raw.slice(-1);
          updateDigitGridFilledState(prefix, count);
          if (raw && i < count - 1) {
            const next = document.getElementById(`${prefix}-digit-${i + 1}`);
            if (next) {
              next.focus();
              next.select();
            }
          }
          const fullCode = getEnteredDigitCode(prefix, count);
          if (fullCode.length === count && /^\d+$/.test(fullCode) && onComplete) {
            onComplete();
          }
        });

        input.addEventListener("paste", (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
          if (pasteData.length > 0) {
            for (let j = 0; j < count; j++) {
              const box = document.getElementById(`${prefix}-digit-${j}`);
              if (box) box.value = pasteData[j] || "";
            }
            updateDigitGridFilledState(prefix, count);
            const focusIdx = Math.min(pasteData.length, count - 1);
            const focusEl = document.getElementById(`${prefix}-digit-${focusIdx}`);
            if (focusEl) focusEl.focus();
            const fullCode = getEnteredDigitCode(prefix, count);
            if (fullCode.length === count && /^\d+$/.test(fullCode) && onComplete) {
              onComplete();
            }
          }
        });
      }
    }

    // Step 1: Admin Login Credentials Submission
    async function handleAdminLogin(e) {
      if (e && e.preventDefault) e.preventDefault();
      const usernameInput = document.getElementById("admin-username-input");
      const passwordInput = document.getElementById("admin-password-input");
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passwordInput ? passwordInput.value : "";
      if (!username || !password) return;

      const submitBtn = document.getElementById("btn-login-submit");
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>Checking Credentials...</span>";

      const errBanner = document.getElementById("login-error-banner");
      if (errBanner) {
        errBanner.style.display = "none";
        errBanner.textContent = "";
      }

      localStorage.removeItem("admin_session_token");

      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          // Case 1: First-time setup required
          if (data.requires2FaSetup) {
            SETUP_PRE_AUTH_SESSION_ID = data.preAuthSessionId;
            CURRENT_SETUP_RECOVERY_CODES = data.recoveryCodes || [];
            
            // Set QR code image
            const qrImg = document.getElementById("setup-qr-image");
            if (qrImg && data.qrCodeDataUrl) {
              qrImg.src = data.qrCodeDataUrl;
            }

            // Set manual key text
            const keyText = document.getElementById("setup-manual-key-text");
            if (keyText && data.manualSecretKey) {
              keyText.textContent = data.manualSecretKey;
            }

            // Render 8 recovery codes
            const codesGrid = document.getElementById("setup-recovery-codes-grid");
            if (codesGrid && CURRENT_SETUP_RECOVERY_CODES.length) {
              codesGrid.innerHTML = CURRENT_SETUP_RECOVERY_CODES.map(code => 
                `<div class="recovery-code-pill">${code}</div>`
              ).join("");
            }

            // Show setup screen
            document.getElementById("login-step-1").style.display = "none";
            document.getElementById("login-step-2").style.display = "none";
            document.getElementById("login-step-recovery").style.display = "none";
            document.getElementById("login-step-setup").style.display = "block";
            clearDigitGrid("setup", 6);
            showToast("📲 Scan the QR code with your Authenticator app.");
            return;
          }

          // Case 2: 2FA Active -> Authenticator verification required
          if (data.requires2Fa) {
            PRE_AUTH_SESSION_ID = data.preAuthSessionId;
            const accountDisplay = document.getElementById("totp-account-display");
            if (accountDisplay && data.account) {
              accountDisplay.textContent = `Authenticator App (${data.account})`;
            }

            document.getElementById("login-step-1").style.display = "none";
            document.getElementById("login-step-setup").style.display = "none";
            document.getElementById("login-step-recovery").style.display = "none";
            document.getElementById("login-step-2").style.display = "block";
            clearDigitGrid("totp", 6);
            showToast("🔐 Enter the 6-digit code from your Authenticator app.");
            return;
          }

          // Case 3: Direct authenticated access (only if 2FA disabled on server)
          if (data.authenticated) {
            if (data.token) {
              localStorage.setItem("admin_session_token", data.token);
            }
            showToast("🎉 Welcome Somesh Garu! Access granted.");
            showDashboard();
            return;
          }
        } else {
          const errMsg = data.error || "Invalid username or password.";
          if (errBanner) {
            errBanner.textContent = errMsg;
            errBanner.style.display = "block";
          }
          showToast("❌ " + errMsg);
          if (passwordInput) {
            passwordInput.value = "";
            passwordInput.focus();
          }
        }
      } catch (err) {
        console.error("Login communication error:", err);
        showToast("❌ Unable to connect to backend server. Please retry in a few seconds.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }

    // Step 2: Verify 6-digit TOTP Code
    async function handleVerifyTotp(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (IS_VERIFYING_TOTP) return;

      const code = getEnteredDigitCode("totp", 6);
      const errBanner = document.getElementById("totp-error-banner");

      if (code.length < 6 || !/^\d{6}$/.test(code)) {
        if (errBanner) {
          errBanner.textContent = "Please enter all 6 numeric digits from your Authenticator app.";
          errBanner.style.display = "block";
        }
        showToast("⚠️ Please enter all 6 numeric digits.");
        const emptyIdx = [0,1,2,3,4,5].find(i => !document.getElementById(`totp-digit-${i}`).value);
        if (emptyIdx !== undefined) document.getElementById(`totp-digit-${emptyIdx}`).focus();
        return;
      }

      if (!PRE_AUTH_SESSION_ID) {
        if (errBanner) {
          errBanner.textContent = "Verification session expired. Please sign in again.";
          errBanner.style.display = "block";
        }
        showToast("⚠️ Session expired. Please sign in again.");
        setTimeout(() => backToLoginStep1(), 1500);
        return;
      }

      if (errBanner) errBanner.style.display = "none";

      IS_VERIFYING_TOTP = true;
      const verifyBtn = document.getElementById("btn-totp-submit");
      const origText = verifyBtn.innerHTML;
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = "<span>⚡ Verifying code...</span>";

      try {
        const res = await fetch("/api/admin/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            preAuthSessionId: PRE_AUTH_SESSION_ID,
            totpCode: code
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.token) {
            localStorage.setItem("admin_session_token", data.token);
          }
          PRE_AUTH_SESSION_ID = null;
          showToast("🎉 Two-factor authentication successful!");
          showDashboard();
        } else {
          const errMsg = data.error || "Invalid or expired verification code. Please check your Authenticator app.";
          if (errBanner) {
            errBanner.textContent = errMsg;
            errBanner.style.display = "block";
          }
          showToast("❌ " + errMsg);

          // Shake grid animation
          const grid = document.getElementById("totp-inputs-grid");
          if (grid) {
            grid.classList.add("otp-shake");
            setTimeout(() => grid.classList.remove("otp-shake"), 400);
          }
          clearDigitGrid("totp", 6);
          if (data.lockedOut) {
            setTimeout(() => backToLoginStep1(), 2500);
          }
        }
      } catch (err) {
        showToast("❌ Network error verifying Authenticator code.");
      } finally {
        IS_VERIFYING_TOTP = false;
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = origText;
      }
    }

    // Step Setup: Verify Initial Setup Code & Confirm 2FA
    async function handleVerifySetup(e) {
      if (e && e.preventDefault) e.preventDefault();
      const code = getEnteredDigitCode("setup", 6);
      const errBanner = document.getElementById("setup-error-banner");
      const succBanner = document.getElementById("setup-success-banner");

      if (code.length < 6 || !/^\d{6}$/.test(code)) {
        if (errBanner) {
          errBanner.textContent = "Please enter the 6-digit code shown in your Authenticator app.";
          errBanner.style.display = "block";
        }
        showToast("⚠️ Enter the full 6-digit code.");
        return;
      }

      if (!SETUP_PRE_AUTH_SESSION_ID) {
        if (errBanner) {
          errBanner.textContent = "Setup session expired. Please sign in again.";
          errBanner.style.display = "block";
        }
        showToast("⚠️ Setup session expired.");
        setTimeout(() => backToLoginStep1(), 1500);
        return;
      }

      if (errBanner) errBanner.style.display = "none";
      const submitBtn = document.getElementById("btn-setup-submit");
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>Pairing Authenticator...</span>";

      try {
        const res = await fetch("/api/admin/2fa/verify-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            preAuthSessionId: SETUP_PRE_AUTH_SESSION_ID,
            totpCode: code
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (succBanner) {
            succBanner.textContent = "✅ Authenticator successfully configured.";
            succBanner.style.display = "block";
          }
          if (data.token) {
            localStorage.setItem("admin_session_token", data.token);
          }
          SETUP_PRE_AUTH_SESSION_ID = null;
          showToast("🎉 Authenticator successfully configured!");
          setTimeout(() => {
            showDashboard();
          }, 1200);
        } else {
          const errMsg = data.error || "Invalid confirmation code. Please enter the current code from your Authenticator app.";
          if (errBanner) {
            errBanner.textContent = errMsg;
            errBanner.style.display = "block";
          }
          showToast("❌ " + errMsg);
          const grid = document.getElementById("setup-inputs-grid");
          if (grid) {
            grid.classList.add("otp-shake");
            setTimeout(() => grid.classList.remove("otp-shake"), 400);
          }
          clearDigitGrid("setup", 6);
        }
      } catch (err) {
        showToast("❌ Network error confirming 2FA setup.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }

    // Step Recovery: Verify Single-Use Emergency Recovery Code
    async function handleVerifyRecoveryCode(e) {
      if (e && e.preventDefault) e.preventDefault();
      const codeInput = document.getElementById("admin-recovery-code-input");
      const code = codeInput ? codeInput.value.trim().toUpperCase() : "";
      const errBanner = document.getElementById("recovery-error-banner");

      if (!code) {
        if (errBanner) {
          errBanner.textContent = "Please enter an 8-character emergency recovery code.";
          errBanner.style.display = "block";
        }
        return;
      }

      if (!PRE_AUTH_SESSION_ID) {
        if (errBanner) {
          errBanner.textContent = "Session expired. Please sign in again.";
          errBanner.style.display = "block";
        }
        showToast("⚠️ Session expired.");
        setTimeout(() => backToLoginStep1(), 1500);
        return;
      }

      if (errBanner) errBanner.style.display = "none";
      const submitBtn = document.getElementById("btn-recovery-submit");
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>Verifying Recovery Code...</span>";

      try {
        const res = await fetch("/api/admin/2fa/recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            preAuthSessionId: PRE_AUTH_SESSION_ID,
            recoveryCode: code
          })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.token) {
            localStorage.setItem("admin_session_token", data.token);
          }
          PRE_AUTH_SESSION_ID = null;
          showToast(`⚠️ Recovery code verified! (${data.remainingCodesCount} remaining). Access granted.`);
          showDashboard();
        } else {
          const errMsg = data.error || "Invalid or previously used recovery code.";
          if (errBanner) {
            errBanner.textContent = errMsg;
            errBanner.style.display = "block";
          }
          showToast("❌ " + errMsg);
          if (codeInput) {
            codeInput.value = "";
            codeInput.focus();
          }
        }
      } catch (err) {
        showToast("❌ Network error verifying recovery code.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }

    // Navigation & UI Helpers for 2FA
    function backToLoginStep1() {
      PRE_AUTH_SESSION_ID = null;
      SETUP_PRE_AUTH_SESSION_ID = null;
      const step1 = document.getElementById("login-step-1");
      const step2 = document.getElementById("login-step-2");
      const stepSetup = document.getElementById("login-step-setup");
      const stepRec = document.getElementById("login-step-recovery");
      if (step1) step1.style.display = "block";
      if (step2) step2.style.display = "none";
      if (stepSetup) stepSetup.style.display = "none";
      if (stepRec) stepRec.style.display = "none";

      const pwd = document.getElementById("admin-password-input");
      if (pwd) {
        pwd.value = "";
        pwd.focus();
      }
    }

    function showRecoveryStep() {
      const step2 = document.getElementById("login-step-2");
      const stepRec = document.getElementById("login-step-recovery");
      if (step2) step2.style.display = "none";
      if (stepRec) stepRec.style.display = "block";
      const recInp = document.getElementById("admin-recovery-code-input");
      if (recInp) {
        recInp.value = "";
        recInp.focus();
      }
      const errBanner = document.getElementById("recovery-error-banner");
      if (errBanner) errBanner.style.display = "none";
    }

    function backToTotpStep2() {
      const step2 = document.getElementById("login-step-2");
      const stepRec = document.getElementById("login-step-recovery");
      if (stepRec) stepRec.style.display = "none";
      if (step2) step2.style.display = "block";
      clearDigitGrid("totp", 6);
    }

    function toggleManualKeyDisplay() {
      const box = document.getElementById("setup-manual-key-box");
      if (!box) return;
      box.style.display = box.style.display === "none" ? "block" : "none";
    }

    function copyManualSecretKey() {
      const text = document.getElementById("setup-manual-key-text")?.textContent || "";
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showToast("📋 Secret key copied to clipboard!");
      }).catch(() => {
        showToast("Key: " + text);
      });
    }

    function copySetupRecoveryCodes() {
      if (!CURRENT_SETUP_RECOVERY_CODES.length) return;
      const text = "Chinnodu Foods Admin Emergency Recovery Codes:\n\n" + 
        CURRENT_SETUP_RECOVERY_CODES.map((c, i) => `${i + 1}. ${c}`).join("\n") +
        "\n\nEach code can be used only once. Store in a secure password manager.";
      navigator.clipboard.writeText(text).then(() => {
        showToast("📋 All 8 recovery codes copied to clipboard!");
      }).catch(() => {
        showToast("⚠️ Could not access clipboard.");
      });
    }

    function copyModalRecoveryCodes() {
      if (!CURRENT_MODAL_RECOVERY_CODES.length) return;
      const text = "Chinnodu Foods Admin Emergency Recovery Codes:\n\n" + 
        CURRENT_MODAL_RECOVERY_CODES.map((c, i) => `${i + 1}. ${c}`).join("\n") +
        "\n\nEach code can be used only once. Store in a secure password manager.";
      navigator.clipboard.writeText(text).then(() => {
        showToast("📋 New recovery codes copied to clipboard!");
      }).catch(() => {
        showToast("⚠️ Could not access clipboard.");
      });
    }

    // 2FA Security Settings Modal
    async function open2FaSettingsModal() {
      const modal = document.getElementById("modal-2fa-settings");
      if (!modal) return;
      modal.style.display = "flex";

      try {
        const res = await fetch("/api/admin/2fa/status", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const statusBadge = document.getElementById("modal-2fa-status-badge");
          const confirmedAt = document.getElementById("modal-2fa-confirmed-at");
          const recoveryCount = document.getElementById("modal-2fa-recovery-count");
          const emailDisplay = document.getElementById("modal-2fa-account-email");

          if (emailDisplay && data.account) emailDisplay.textContent = data.account;

          if (data.two_factor_enabled) {
            if (statusBadge) {
              statusBadge.textContent = "🛡️ 2FA ACTIVE";
              statusBadge.style.background = "#DCFCE7";
              statusBadge.style.color = "#15803D";
              statusBadge.style.borderColor = "#86EFAC";
            }
            if (confirmedAt) {
              confirmedAt.textContent = data.two_factor_confirmed_at 
                ? new Date(data.two_factor_confirmed_at).toLocaleString("en-IN") 
                : "Active";
            }
            if (recoveryCount) {
              recoveryCount.textContent = `${data.remainingRecoveryCodes} of ${data.totalRecoveryCodes || 8}`;
            }
          } else {
            if (statusBadge) {
              statusBadge.textContent = "⚠️ 2FA DISABLED";
              statusBadge.style.background = "#FEF3C7";
              statusBadge.style.color = "#92400E";
              statusBadge.style.borderColor = "#FDE68A";
            }
            if (confirmedAt) confirmedAt.textContent = "Not configured";
            if (recoveryCount) recoveryCount.textContent = "None";
          }
        }
      } catch (e) {
        console.warn("Could not fetch 2FA status:", e);
      }
    }

    function close2FaSettingsModal() {
      const modal = document.getElementById("modal-2fa-settings");
      if (modal) modal.style.display = "none";
      const regBox = document.getElementById("modal-regenerated-codes-box");
      if (regBox) regBox.style.display = "none";
    }

    async function promptRegenerateRecoveryCodes() {
      const totpCode = prompt("Enter current 6-digit Authenticator code to authorize generating fresh recovery codes:");
      if (!totpCode || totpCode.trim().length !== 6) {
        if (totpCode) showToast("⚠️ Must enter a valid 6-digit code.");
        return;
      }

      try {
        const res = await fetch("/api/admin/2fa/regenerate-recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ totpCode: totpCode.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          CURRENT_MODAL_RECOVERY_CODES = data.recoveryCodes || [];
          const grid = document.getElementById("modal-new-codes-grid");
          if (grid) {
            grid.innerHTML = CURRENT_MODAL_RECOVERY_CODES.map(c => 
              `<div class="recovery-code-pill">${c}</div>`
            ).join("");
          }
          const box = document.getElementById("modal-regenerated-codes-box");
          if (box) box.style.display = "block";
          const countEl = document.getElementById("modal-2fa-recovery-count");
          if (countEl) countEl.textContent = "8 of 8";
          showToast("🎉 8 fresh emergency recovery codes generated! Save them now.");
        } else {
          showToast("❌ " + (data.error || "Failed to regenerate recovery codes."));
        }
      } catch (e) {
        showToast("❌ Network error regenerating recovery codes.");
      }
    }

    async function triggerReconfigure2Fa() {
      const confirmReconfig = confirm("Reconfiguring 2FA will initiate a fresh pairing setup flow on your next login.\n\nDo you want to log out and pair your new authenticator now?");
      if (!confirmReconfig) return;
      close2FaSettingsModal();
      adminLogout();
    }

    async function promptDisable2Fa() {
      const password = prompt("Enter your admin password to confirm disabling 2FA:");
      if (!password) return;
      const totpCode = prompt("Enter the current 6-digit Authenticator code:");
      if (!totpCode) return;

      try {
        const res = await fetch("/api/admin/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password, totpCode: totpCode.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast("⚠️ 2FA has been disabled for this account.");
          close2FaSettingsModal();
          open2FaSettingsModal();
        } else {
          showToast("❌ " + (data.error || "Failed to disable 2FA."));
        }
      } catch (e) {
        showToast("❌ Network error disabling 2FA.");
      }
    }

    // Page Load Initialization: Set up digit listeners & verify live session
    document.addEventListener("DOMContentLoaded", async () => {
      // Setup both 6-digit grids
      setupDigitGrid("totp", 6, () => handleVerifyTotp(), "totp-error-banner");
      setupDigitGrid("setup", 6, () => handleVerifySetup(), "setup-error-banner");

      // Verify token/session against live backend (Strict Zero-Trust on frontend)
      try {
        const authRes = await fetch("/api/admin/check-auth", { credentials: "include" });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.authenticated) {
            showDashboard();
            return;
          }
        }
      } catch (err) {
        console.warn("Live session check error:", err);
      }
      
      // If check-auth failed or unauthenticated, enforce login screen
      localStorage.removeItem("admin_session_token");
      showLoginScreen();
    });

    async function confirmResetStoreData() {
      const confirmed = confirm("⚠️ ARE YOU ABSOLUTELY SURE?\n\nThis will permanently clear all orders, transaction history, and reset all financial account balances to ₹0 so you can start completely fresh.\n\nClick OK to confirm.");
      if (!confirmed) return;

      try {
        const res = await fetch("/api/admin/reset-data", {
          method: "POST",
          credentials: "include"
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast("🎉 Store data reset successfully! Starting completely fresh.");
          try {
            localStorage.removeItem("cf_orders_cache");
            localStorage.removeItem("cf_last_order_id");
          } catch (e) {}
          fetchOrders();
          fetchFinanceData();
        } else {
          showToast("❌ " + (data.error || "Could not reset data"));
        }
      } catch (err) {
        showToast("❌ Network error resetting data");
      }
    }

    async function adminLogout() {
      try {
        PRE_AUTH_SESSION_ID = null;
        SETUP_PRE_AUTH_SESSION_ID = null;
        localStorage.removeItem("admin_session_token");
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "include"
        });
      } catch (err) {}
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      showLoginScreen("Logged out successfully.");
    }

    function showDashboard() {
      const loginScreen = document.getElementById("admin-login-screen");
      const dashScreen = document.getElementById("admin-dashboard-screen");
      const navActions = document.getElementById("admin-nav-actions");

      if (loginScreen) loginScreen.style.display = "none";
      if (dashScreen) dashScreen.style.display = "block";
      if (navActions) navActions.style.display = "flex";

      fetchOrders();
      fetchFinanceData();
      fetchAdminProducts();

      // Honor URL hash or param if admin was previously on specific tab
      const hash = (window.location.hash || "").replace("#", "").toLowerCase();
      if (hash === "products" || hash === "menu" || hash === "items") {
        switchAdminView("products");
      } else if (hash === "heritage" || hash === "categories") {
        switchAdminView("heritage");
      } else if (hash === "database" || hash === "backup" || hash === "mongo") {
        switchAdminView("database");
      } else if (hash === "finance" || hash === "ledger") {
        switchAdminView("finance");
      }
      fetchDatabaseStatus(); // Refresh MongoDB connection status badge
    }

    function showLoginScreen(reason = "") {
      const loginScreen = document.getElementById("admin-login-screen");
      const dashScreen = document.getElementById("admin-dashboard-screen");
      const navActions = document.getElementById("admin-nav-actions");

      if (loginScreen) loginScreen.style.display = "block";
      const step1 = document.getElementById("login-step-1");
      const step2 = document.getElementById("login-step-2");
      const stepSetup = document.getElementById("login-step-setup");
      const stepRec = document.getElementById("login-step-recovery");
      if (step1) step1.style.display = "block";
      if (step2) step2.style.display = "none";
      if (stepSetup) stepSetup.style.display = "none";
      if (stepRec) stepRec.style.display = "none";
      if (dashScreen) dashScreen.style.display = "none";
      if (navActions) navActions.style.display = "none";

      const userInp = document.getElementById("admin-username-input");
      const passInp = document.getElementById("admin-password-input");
      if (userInp) userInp.value = "";
      if (passInp) passInp.value = "";
      PRE_AUTH_SESSION_ID = null;
      SETUP_PRE_AUTH_SESSION_ID = null;

      if (reason) showToast(reason);
      if (userInp) userInp.focus();
    }

    // View Switcher: Orders vs Products vs Finance vs Heritage vs Database
    function switchAdminView(view) {
      ACTIVE_VIEW = view;
      try {
        if (window.location.hash !== `#${view}`) {
          history.replaceState(null, "", `#${view}`);
        }
      } catch (e) {}

      const ordersSec = document.getElementById("section-orders-view");
      const productsSec = document.getElementById("section-products-view");
      const financeSec = document.getElementById("section-finance-view");
      const heritageSec = document.getElementById("section-heritage-view");
      const databaseSec = document.getElementById("section-database-view");
      const btnOrders = document.getElementById("tab-switch-orders");
      const btnProducts = document.getElementById("tab-switch-products");
      const btnFinance = document.getElementById("tab-switch-finance");
      const btnHeritage = document.getElementById("tab-switch-heritage");
      const btnDatabase = document.getElementById("tab-switch-database");
      const headerBtn = document.getElementById("btn-header-primary-action");

      // Reset active tabs
      if (btnOrders) btnOrders.classList.remove("active");
      if (btnProducts) btnProducts.classList.remove("active");
      if (btnFinance) btnFinance.classList.remove("active");
      if (btnHeritage) btnHeritage.classList.remove("active");
      if (btnDatabase) btnDatabase.classList.remove("active");

      // Hide all sections
      if (ordersSec) ordersSec.style.display = "none";
      if (productsSec) productsSec.style.display = "none";
      if (financeSec) financeSec.style.display = "none";
      if (heritageSec) heritageSec.style.display = "none";
      if (databaseSec) databaseSec.style.display = "none";

      if (view === 'orders') {
        if (ordersSec) ordersSec.style.display = "block";
        if (btnOrders) btnOrders.classList.add("active");
        if (headerBtn) headerBtn.innerHTML = `<span>➕ Add Manual Order</span>`;
      } else if (view === 'products') {
        if (productsSec) productsSec.style.display = "block";
        if (btnProducts) btnProducts.classList.add("active");
        if (headerBtn) headerBtn.innerHTML = `<span>➕ Add Delicacy</span>`;
        fetchAdminProducts();
      } else if (view === 'heritage') {
        if (heritageSec) heritageSec.style.display = "block";
        if (btnHeritage) btnHeritage.classList.add("active");
        if (headerBtn) headerBtn.innerHTML = `<span>💾 Save Heritage</span>`;
        fetchHeritageAdminData();
      } else if (view === 'database') {
        if (databaseSec) databaseSec.style.display = "block";
        if (btnDatabase) btnDatabase.classList.add("active");
        if (headerBtn) headerBtn.innerHTML = `<span>🛡️ Snapshot Now</span>`;
        fetchDatabaseStatus();
      } else {
        if (financeSec) financeSec.style.display = "block";
        if (btnFinance) btnFinance.classList.add("active");
        if (headerBtn) headerBtn.innerHTML = `<span>➕ Record Transaction</span>`;
        fetchFinanceData();
      }
    }

    function handleHeaderPrimaryAction() {
      if (ACTIVE_VIEW === 'orders') {
        openNewOrderModal();
      } else if (ACTIVE_VIEW === 'products') {
        openNewProductModal();
      } else if (ACTIVE_VIEW === 'heritage') {
        saveHeritageData();
      } else if (ACTIVE_VIEW === 'database') {
        createManualSnapshot();
      } else {
        openNewTxnModal();
      }
    }

    function handleHeaderExportAction() {
      if (ACTIVE_VIEW === 'orders') {
        exportOrdersToCSV();
      } else if (ACTIVE_VIEW === 'products') {
        exportProductsToCSV();
      } else if (ACTIVE_VIEW === 'database') {
        downloadDatabaseBackup();
      } else {
        exportFinanceToCSV();
      }
    }

    // =========================================================================
    // ORDERS CONTROLLER
    // =========================================================================
    async function fetchOrders(page) {
      if (page !== undefined && page !== null) {
        CURRENT_PAGE = page;
      }
      try {
        const queryParams = new URLSearchParams({
          page: CURRENT_PAGE,
          limit: PAGE_SIZE,
          status: CURRENT_ORDER_FILTER,
          q: SEARCH_QUERY,
          date: CURRENT_DATE_FILTER
        });

        let res;
        try {
          res = await fetch(`/api/orders?${queryParams.toString()}`, { credentials: "include" });
        } catch (netErr) {
          try { res = await fetch("orders.json"); } catch (e) {}
        }
        if (!res || !res.ok) {
          try { res = await fetch("orders.json"); } catch (e) {}
        }
        if (res && res.status === 401) {
          showLoginScreen("Session expired. Please log in.");
          return;
        }
        if (res && res.ok) {
          const data = await res.json();
          const ordersList = Array.isArray(data) ? data : (data.orders || []);
          if (ordersList.length > 0) {
            ALL_ORDERS = ordersList;

            // Merge locally placed customer orders if present
            try {
              const localCache = localStorage.getItem("cf_orders_cache");
              if (localCache) {
                const locList = JSON.parse(localCache);
                if (Array.isArray(locList)) {
                  locList.forEach(lo => {
                    if (!ALL_ORDERS.some(o => o.id === lo.id)) {
                      ALL_ORDERS.unshift(lo);
                    }
                  });
                }
              }
            } catch (e) {}

            TOTAL_ORDERS = Number(data.total) || ALL_ORDERS.length;
            TOTAL_PAGES = Number(data.totalPages) || 1;
            CURRENT_PAGE = Number(data.page) || 1;

            if (data.stats) {
              updateDashboardStats(data.stats);
            }
            if (data.datesSummary && Array.isArray(data.datesSummary)) {
              AVAILABLE_DATES_SUMMARY = data.datesSummary;
              renderDatesBar();
            }
          }
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        if (!ALL_ORDERS || ALL_ORDERS.length === 0) {
          ALL_ORDERS = [
            {
              id: "CF-20725",
              createdAt: "2026-09-26T17:45:28.855Z",
              customer: {
                name: "Test Customer (Kakinada)",
                phone: "9876543210",
                address: "123 Main St, Near Bridge",
                city: "Kakinada",
                state: "Andhra Pradesh",
                pincode: "533001"
              },
              discount: 0,
              grandTotal: 420,
              items: [
                { id: "bellam-sunnunda", name: "Bellam Sunnunda", weight: "500g", qty: 1, unitPrice: 380 }
              ],
              notes: "Express delivery",
              paymentMethod: "upi",
              paymentReference: "UTR9998887771",
              paymentStatus: "Paid",
              shipping: 40,
              status: "received",
              statusTimeline: [
                { status: "received", time: "2026-09-26T17:45:28.855Z", note: "Prepaid UPI order placed" }
              ],
              subtotal: 380,
              tracking: { courier: "DTDC Express", trackingId: "DTDC9910", trackingUrl: "https://dtdc.in", dispatchedAt: "", estimatedDelivery: "2 Days" }
            },
            {
              id: "CF-84754",
              createdAt: "2026-09-26T15:14:21.938Z",
              customer: {
                name: "Somesh Adigarla",
                phone: "9676698427",
                address: "Balaji Street, Nadakuduru, Karapa Mandal",
                city: "Kakinada",
                state: "Andhra Pradesh",
                pincode: "533016"
              },
              items: [
                { id: "putta-mati", name: "Putta mati", weight: "500g", qty: 1, unitPrice: 350 }
              ],
              discount: 0,
              grandTotal: 390,
              notes: "",
              paymentMethod: "upi",
              paymentReference: "UTR88776655",
              paymentStatus: "Paid",
              shipping: 40,
              status: "dispatched",
              statusTimeline: [
                { status: "received", time: "2026-09-26T15:14:21.938Z", note: "Order placed" },
                { status: "dispatched", time: "2026-09-26T16:00:00.000Z", note: "Handed over to courier" }
              ],
              subtotal: 350,
              tracking: { courier: "Delhivery", trackingId: "DEL12345", trackingUrl: "https://delhivery.com", dispatchedAt: "2026-09-26T16:00:00.000Z", estimatedDelivery: "Tomorrow" }
            }
          ];
          TOTAL_ORDERS = ALL_ORDERS.length;
          TOTAL_PAGES = 1;
          CURRENT_PAGE = 1;
          updateDashboardStats({
            total: 2,
            received: 1,
            processing: 0,
            dispatched: 1,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 810
          });
        }
      }
      renderOrdersList();
      renderSelectedDateBanner();
      updatePaginationControls();
    }

    // =========================================================================
    // DATES BAR & DATE CONTROLLER
    // =========================================================================
    function renderDatesBar() {
      const container = document.getElementById("dates-pills-container");
      const badgeAll = document.getElementById("badge-date-all");
      const pillAll = document.getElementById("pill-date-all");
      const picker = document.getElementById("admin-date-picker");

      const totalCount = AVAILABLE_DATES_SUMMARY.reduce((s, d) => s + (d.count || 0), 0) || TOTAL_ORDERS;
      if (badgeAll) {
        badgeAll.textContent = totalCount;
      }
      if (pillAll) {
        if (CURRENT_DATE_FILTER === 'all') {
          pillAll.classList.add("active");
        } else {
          pillAll.classList.remove("active");
        }
      }
      if (picker && CURRENT_DATE_FILTER !== 'all') {
        picker.value = CURRENT_DATE_FILTER;
      }

      if (!container) return;

      let html = `
        <div class="date-pill-group ${CURRENT_DATE_FILTER === 'all' ? 'active' : ''}">
          <button type="button" class="date-pill-btn" id="pill-date-all" onclick="filterOrdersByDate('all')" title="View orders across all dates">
            <span>🗓️ All Dates</span>
            <span class="date-pill-badge">${totalCount}</span>
          </button>
          <button type="button" class="date-pill-print-btn" onclick="event.stopPropagation(); printOrDownloadDateData('all')" title="🖨️ Print &amp; Download data of all customers">
            🖨️
          </button>
        </div>
      `;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      AVAILABLE_DATES_SUMMARY.forEach(item => {
        const dStr = item.date;
        let displayLabel = dStr;
        try {
          const dObj = new Date(dStr + "T00:00:00");
          if (dStr === todayStr) {
            displayLabel = `⚡ Today (${dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
          } else if (dStr === yesterdayStr) {
            displayLabel = `Yesterday (${dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
          } else {
            displayLabel = dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        } catch (e) {}

        const isActive = CURRENT_DATE_FILTER === dStr;
        html += `
          <div class="date-pill-group ${isActive ? 'active' : ''}">
            <button type="button" class="date-pill-btn" onclick="filterOrdersByDate('${dStr}')" title="Click to view ${item.count} orders on ${dStr}">
              <span>📅 ${displayLabel}</span>
              <span class="date-pill-badge">${item.count}</span>
            </button>
            <button type="button" class="date-pill-print-btn" onclick="event.stopPropagation(); printOrDownloadDateData('${dStr}')" title="🖨️ Print &amp; Download customer data for ${dStr}">
              🖨️
            </button>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function filterOrdersByDate(dateStr) {
      CURRENT_DATE_FILTER = dateStr || 'all';
      window.CURRENT_DATE_FILTER = CURRENT_DATE_FILTER;
      CURRENT_PAGE = 1;
      const picker = document.getElementById("admin-date-picker");
      if (picker) {
        picker.value = CURRENT_DATE_FILTER === 'all' ? '' : CURRENT_DATE_FILTER;
      }
      const headerDateText = document.getElementById("header-date-print-text");
      if (headerDateText) {
        headerDateText.textContent = CURRENT_DATE_FILTER === 'all' ? "Print / Download Customers Data" : `Print / Download (${CURRENT_DATE_FILTER})`;
      }
      fetchOrders(1);
    }

    function handleDatePickerChange(dateVal) {
      if (!dateVal) {
        filterOrdersByDate('all');
        return;
      }
      filterOrdersByDate(dateVal);
    }

    function renderSelectedDateBanner() {
      const banner = document.getElementById("selected-date-banner");
      if (!banner) return;

      if (CURRENT_DATE_FILTER === 'all') {
        banner.style.display = "none";
        return;
      }

      banner.style.display = "flex";
      const heading = document.getElementById("selected-date-heading");
      const sub = document.getElementById("selected-date-sub");
      const tags = document.getElementById("selected-date-tags");

      let formattedDate = CURRENT_DATE_FILTER;
      try {
        const dObj = new Date(CURRENT_DATE_FILTER + "T00:00:00");
        formattedDate = dObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) {}

      const dateItem = AVAILABLE_DATES_SUMMARY.find(d => d.date === CURRENT_DATE_FILTER);
      const count = dateItem ? dateItem.count : ALL_ORDERS.length;
      const revenue = dateItem ? dateItem.totalRevenue : ALL_ORDERS.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

      if (heading) heading.textContent = `📅 Orders for ${formattedDate}`;
      if (sub) sub.textContent = `${count} Orders Placed • ₹${revenue.toLocaleString('en-IN')} Total Sales`;

      if (tags && dateItem) {
        tags.innerHTML = `
          ${dateItem.received ? `<span class="badge-date-stat" style="color:#B45309; border-color:#FDE68A; background:#FEF3C7;">🔔 ${dateItem.received} New</span>` : ''}
          ${dateItem.confirmed ? `<span class="badge-date-stat" style="color:#1D4ED8; border-color:#BFDBFE; background:#EFF6FF;">👍 ${dateItem.confirmed} Confirmed</span>` : ''}
          ${dateItem.packed ? `<span class="badge-date-stat" style="color:#6D28D9; border-color:#DDD6FE; background:#F5F3FF;">🎁 ${dateItem.packed} Packed</span>` : ''}
          ${dateItem.shipped ? `<span class="badge-date-stat" style="color:#C2410C; border-color:#FED7AA; background:#FFF7ED;">🚚 ${dateItem.shipped} Shipped</span>` : ''}
          ${dateItem.delivered ? `<span class="badge-date-stat" style="color:#15803D; border-color:#BBF7D0; background:#F0FDF4;">✅ ${dateItem.delivered} Delivered</span>` : ''}
        `;
      }
    }

    function updateDashboardStats(stats) {
      const total = stats.totalOrders || stats.total || 0;
      const pending = (stats.received || 0) + (stats.confirmed || 0);
      const shipped = stats.shipped || 0;
      const delivered = stats.delivered || 0;
      const revenue = stats.revenue || 0;

      document.getElementById("stat-total-orders").textContent = total.toLocaleString('en-IN');
      document.getElementById("stat-pending-orders").textContent = pending.toLocaleString('en-IN');
      document.getElementById("stat-shipped-orders").textContent = shipped.toLocaleString('en-IN');
      document.getElementById("stat-delivered-orders").textContent = delivered.toLocaleString('en-IN');
      document.getElementById("stat-total-revenue").textContent = `₹${revenue.toLocaleString('en-IN')}`;

      document.getElementById("badge-top-orders-count").textContent = total.toLocaleString('en-IN');
      document.getElementById("badge-all").textContent = total.toLocaleString('en-IN');
      document.getElementById("badge-received").textContent = (stats.received || 0).toLocaleString('en-IN');
      document.getElementById("badge-confirmed").textContent = (stats.confirmed || 0).toLocaleString('en-IN');
      document.getElementById("badge-packed").textContent = (stats.packed || 0).toLocaleString('en-IN');
      document.getElementById("badge-shipped").textContent = (stats.shipped || 0).toLocaleString('en-IN');
      document.getElementById("badge-delivered").textContent = (stats.delivered || 0).toLocaleString('en-IN');
    }

    function updatePaginationControls() {
      const bar = document.getElementById("orders-pagination-bar");
      if (!bar) return;

      const fromItem = TOTAL_ORDERS === 0 ? 0 : (CURRENT_PAGE - 1) * PAGE_SIZE + 1;
      const toItem = Math.min(CURRENT_PAGE * PAGE_SIZE, TOTAL_ORDERS);

      const infoText = document.getElementById("pagination-info-text");
      if (infoText) {
        infoText.innerHTML = `Showing <strong>${fromItem.toLocaleString('en-IN')}</strong> to <strong>${toItem.toLocaleString('en-IN')}</strong> of <strong>${TOTAL_ORDERS.toLocaleString('en-IN')}</strong> orders`;
      }

      const pageText = document.getElementById("pagination-current-page-text");
      if (pageText) {
        pageText.textContent = `Page ${CURRENT_PAGE.toLocaleString('en-IN')} of ${TOTAL_PAGES.toLocaleString('en-IN')}`;
      }

      const btnFirst = document.getElementById("btn-page-first");
      const btnPrev = document.getElementById("btn-page-prev");
      const btnNext = document.getElementById("btn-page-next");
      const btnLast = document.getElementById("btn-page-last");

      if (btnFirst) btnFirst.disabled = CURRENT_PAGE <= 1;
      if (btnPrev) btnPrev.disabled = CURRENT_PAGE <= 1;
      if (btnNext) btnNext.disabled = CURRENT_PAGE >= TOTAL_PAGES;
      if (btnLast) btnLast.disabled = CURRENT_PAGE >= TOTAL_PAGES;
    }

    function goToPage(page) {
      if (page < 1 || page > TOTAL_PAGES || page === CURRENT_PAGE) return;
      fetchOrders(page);
    }

    function changePageLimit(newLimit) {
      PAGE_SIZE = parseInt(newLimit, 10) || 25;
      CURRENT_PAGE = 1;
      fetchOrders(1);
    }

    function filterOrders(filterName, clickedBtn) {
      CURRENT_ORDER_FILTER = filterName;
      CURRENT_PAGE = 1;
      const tabBtns = document.querySelectorAll("#section-orders-view .tab-btn");
      tabBtns.forEach(btn => btn.classList.remove("active"));
      
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.classList.add("active");
      } else if (window.event && window.event.currentTarget && window.event.currentTarget.classList && window.event.currentTarget.classList.contains("tab-btn")) {
        window.event.currentTarget.classList.add("active");
      } else {
        let found = false;
        for (const btn of tabBtns) {
          const onclickAttr = btn.getAttribute("onclick") || "";
          if (onclickAttr.includes(`'${filterName}'`)) {
            btn.classList.add("active");
            found = true;
            break;
          }
        }
        if (!found && filterName === 'pending') {
          const receivedBtn = Array.from(tabBtns).find(b => (b.getAttribute("onclick") || "").includes("'received'"));
          if (receivedBtn) receivedBtn.classList.add("active");
        } else if (!found && tabBtns[0]) {
          tabBtns[0].classList.add("active");
        }
      }
      fetchOrders(1);
    }

    // =========================================================================
    // INTERACTIVE STAT CARDS CONTROLLER (Drilldown, Filtering, and Modals)
    // =========================================================================
    function handleStatCardClick(section, action) {
      if (section === 'orders') {
        switchAdminView('orders');
        if (action === 'all') {
          filterOrders('all');
          scrollToTarget('orders-list-container');
          showToast('📦 Showing all orders');
        } else if (action === 'pending') {
          filterOrders('pending');
          scrollToTarget('orders-list-container');
          showToast('⏳ Filtered: Orders pending kitchen dispatch');
        } else if (action === 'shipped') {
          filterOrders('shipped');
          scrollToTarget('orders-list-container');
          showToast('🚚 Filtered: In transit & shipped orders');
        } else if (action === 'delivered') {
          filterOrders('delivered');
          scrollToTarget('orders-list-container');
          showToast('✅ Filtered: Successfully delivered orders');
        } else if (action === 'revenue') {
          openRevenueAnalyticsModal();
        }
      } else if (section === 'products') {
        switchAdminView('products');
        if (action === 'all') {
          filterProductsCategory('all');
          handleProductStockFilter('all');
          const sel = document.getElementById('prod-stock-filter');
          if (sel) sel.value = 'all';
          scrollToTarget('products-grid-container');
          showToast('🍛 Showing all delicacies catalog');
        } else if (action === 'in_stock') {
          handleProductStockFilter('in_stock');
          const sel = document.getElementById('prod-stock-filter');
          if (sel) sel.value = 'in_stock';
          scrollToTarget('products-grid-container');
          showToast('🟢 Filtered: In-stock delicacies only');
        } else if (action === 'out_of_stock') {
          handleProductStockFilter('out_of_stock');
          const sel = document.getElementById('prod-stock-filter');
          if (sel) sel.value = 'out_of_stock';
          scrollToTarget('products-grid-container');
          showToast('🔴 Filtered: Out of stock / seasonal delicacies');
        } else if (action === 'categories') {
          openCategoriesOverviewModal();
        }
      } else if (section === 'finance') {
        switchAdminView('finance');
        if (action === 'upi') {
          openAccountDetailModal('acc_upi');
        } else if (action === 'bank') {
          openAccountDetailModal('acc_bank');
        } else if (action === 'cash') {
          openAccountDetailModal('acc_cash');
        } else if (action === 'liquid') {
          openTreasuryOverviewModal();
        }
      }
    }

    function scrollToTarget(elementId) {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    function openRevenueAnalyticsModal() {
      const totalRev = Number((document.getElementById('stat-total-revenue')?.textContent || '').replace(/[^0-9]/g, '')) || 0;
      const totalOrders = Number((document.getElementById('stat-total-orders')?.textContent || '').replace(/[^0-9]/g, '')) || 0;
      const deliveredCount = Number((document.getElementById('stat-delivered-orders')?.textContent || '').replace(/[^0-9]/g, '')) || 0;
      const pendingCount = Number((document.getElementById('stat-pending-orders')?.textContent || '').replace(/[^0-9]/g, '')) || 0;
      const shippedCount = Number((document.getElementById('stat-shipped-orders')?.textContent || '').replace(/[^0-9]/g, '')) || 0;

      const aov = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;

      const elTot = document.getElementById('rev-modal-total');
      const elAov = document.getElementById('rev-modal-aov');
      const elOrd = document.getElementById('rev-modal-orders');
      const elDel = document.getElementById('rev-modal-delivered');
      const elPen = document.getElementById('rev-modal-pending');
      const elShp = document.getElementById('rev-modal-shipped');

      if (elTot) elTot.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
      if (elAov) elAov.textContent = `₹${aov.toLocaleString('en-IN')}`;
      if (elOrd) elOrd.textContent = totalOrders.toLocaleString('en-IN');
      if (elDel) elDel.textContent = deliveredCount.toLocaleString('en-IN');
      if (elPen) elPen.textContent = pendingCount.toLocaleString('en-IN');
      if (elShp) elShp.textContent = shippedCount.toLocaleString('en-IN');

      const modal = document.getElementById('revenue-analytics-modal');
      if (modal) modal.classList.add('active');
    }

    function openCategoriesOverviewModal() {
      const catCounts = {
        sweets: { total: 0, inStock: 0, outStock: 0, name: 'Traditional Sweets', icon: '🍯', sample: 'Sunnunda, Laddu, Pootharekulu' },
        savouries: { total: 0, inStock: 0, outStock: 0, name: 'Crispy Savouries', icon: '🥨', sample: 'Chekodilu, Murukulu, Boondi' },
        pickles: { total: 0, inStock: 0, outStock: 0, name: 'Homemade Pickles', icon: '🌶️', sample: 'Avakaya, Gongura, Chicken, Mutton' },
        tandra: { total: 0, inStock: 0, outStock: 0, name: 'Authentic Tandra', icon: '🥭', sample: 'Bellam Mamidi Tandra' }
      };

      (ALL_PRODUCTS || []).forEach(p => {
        const c = catCounts[p.category];
        if (c) {
          c.total++;
          if (p.inStock !== false) c.inStock++;
          else c.outStock++;
        }
      });

      const container = document.getElementById('categories-modal-grid');
      if (container) {
        container.innerHTML = Object.entries(catCounts).map(([catKey, data]) => `
          <div style="background:#FAF6F0; border:1px solid #E2D9CC; border-radius:12px; padding:1.1rem; display:flex; flex-direction:column; justify-content:space-between; gap:0.75rem;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span style="font-size:1.8rem; background:#FFF; width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">${data.icon}</span>
              <div>
                <h4 style="font-size:1.05rem; font-family:var(--font-heading); color:var(--primary-maroon); margin:0;">${data.name}</h4>
                <span style="font-size:0.78rem; color:var(--text-muted);">${data.sample}</span>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#FFF; padding:6px 12px; border-radius:8px; border:1px solid #ECE4D8; font-size:0.82rem;">
              <span><strong>${data.total}</strong> Items</span>
              <span style="color:#059669;">● ${data.inStock} In Stock</span>
              <span style="color:${data.outStock > 0 ? '#DC2626' : '#94A3B8'};">● ${data.outStock} Out of Stock</span>
            </div>
            <button type="button" class="btn-admin-action btn-admin-gold" style="width:100%; justify-content:center; font-size:0.82rem; padding:6px;" onclick="selectCategoryFromModal('${catKey}')">
              <span>View &amp; Manage ${data.name} &rarr;</span>
            </button>
          </div>
        `).join('');
      }

      const modal = document.getElementById('categories-overview-modal');
      if (modal) modal.classList.add('active');
    }

    function selectCategoryFromModal(catKey) {
      closeAdminModal('categories-overview-modal');
      switchAdminView('products');
      filterProductsCategory(catKey);
      scrollToTarget('products-grid-container');
      showToast(`📂 Filtered: ${catKey.toUpperCase()}`);
    }

    function openAccountDetailModal(accId) {
      const accounts = FINANCE_DATA.accounts || [];
      const acc = accounts.find(a => a.id === accId) || {
        id: accId,
        name: accId === 'acc_upi' ? 'UPI Wallet (PhonePe/YBL)' : (accId === 'acc_bank' ? 'SBI Current Account' : 'Cash in Hand (Counter)'),
        identifier: accId === 'acc_upi' ? '9676698427-2@ybl' : (accId === 'acc_bank' ? 'SBI Current A/C (Aditya Inst)' : 'Storefront Cash Register'),
        balance: 0,
        type: accId === 'acc_upi' ? 'upi_wallet' : (accId === 'acc_bank' ? 'bank_account' : 'cash_drawer')
      };

      const titleEl = document.getElementById('acc-modal-title');
      const idEl = document.getElementById('acc-modal-id');
      const balEl = document.getElementById('acc-modal-balance');
      const typeEl = document.getElementById('acc-modal-type-badge');

      if (titleEl) titleEl.textContent = acc.name;
      if (idEl) idEl.textContent = acc.identifier;
      if (balEl) balEl.textContent = `₹${Number(acc.balance || 0).toLocaleString('en-IN')}`;
      if (typeEl) typeEl.textContent = (acc.type || '').replace('_', ' ').toUpperCase();

      const qrBox = document.getElementById('acc-modal-upi-qr-box');
      if (qrBox) {
        qrBox.style.display = accId === 'acc_upi' ? 'block' : 'none';
      }

      const txns = (FINANCE_DATA.transactions || []).filter(t => t.accountId === accId || t.toAccountId === accId).slice(0, 6);
      const txnsList = document.getElementById('acc-modal-recent-txns');
      if (txnsList) {
        if (txns.length === 0) {
          txnsList.innerHTML = `<div style="text-align:center; padding:1.25rem; color:var(--text-muted); font-size:0.85rem;">No recent transactions recorded for this account.</div>`;
        } else {
          txnsList.innerHTML = txns.map(t => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #F1E9DF; font-size:0.85rem;">
              <div>
                <strong>${t.description || t.category}</strong>
                <div style="font-size:0.75rem; color:var(--text-muted);">${new Date(t.date).toLocaleDateString('en-IN')}</div>
              </div>
              <strong style="color:${t.type === 'income' ? '#059669' : '#DC2626'};">${t.type === 'income' ? '+' : '-'}₹${Number(t.amount || 0).toLocaleString('en-IN')}</strong>
            </div>
          `).join('');
        }
      }

      const btnAdjust = document.getElementById('acc-modal-btn-adjust');
      if (btnAdjust) {
        btnAdjust.onclick = () => {
          closeAdminModal('account-details-modal');
          promptAdjustBalance(acc.id, acc.balance || 0);
        };
      }

      const modal = document.getElementById('account-details-modal');
      if (modal) modal.classList.add('active');
    }

    function openTreasuryOverviewModal() {
      const summary = FINANCE_DATA.summary || {};
      const accounts = FINANCE_DATA.accounts || [];
      const liquidTotal = Number(summary.liquidTotal || 0);

      const totEl = document.getElementById('treasury-modal-total');
      if (totEl) totEl.textContent = `₹${liquidTotal.toLocaleString('en-IN')}`;

      const upiAcc = accounts.find(a => a.id === 'acc_upi');
      const bankAcc = accounts.find(a => a.id === 'acc_bank');
      const cashAcc = accounts.find(a => a.id === 'acc_cash');

      const upiBal = Number(upiAcc?.balance || 0);
      const bankBal = Number(bankAcc?.balance || 0);
      const cashBal = Number(cashAcc?.balance || 0);

      const upiValEl = document.getElementById('treasury-modal-upi-val');
      const bankValEl = document.getElementById('treasury-modal-bank-val');
      const cashValEl = document.getElementById('treasury-modal-cash-val');

      if (upiValEl) upiValEl.textContent = `₹${upiBal.toLocaleString('en-IN')}`;
      if (bankValEl) bankValEl.textContent = `₹${bankBal.toLocaleString('en-IN')}`;
      if (cashValEl) cashValEl.textContent = `₹${cashBal.toLocaleString('en-IN')}`;

      const upiPct = liquidTotal > 0 ? Math.round((upiBal / liquidTotal) * 100) : 33;
      const bankPct = liquidTotal > 0 ? Math.round((bankBal / liquidTotal) * 100) : 33;
      const cashPct = liquidTotal > 0 ? (100 - upiPct - bankPct) : 34;

      const barUpi = document.getElementById('treasury-bar-upi');
      const barBank = document.getElementById('treasury-bar-bank');
      const barCash = document.getElementById('treasury-bar-cash');

      if (barUpi) barUpi.style.width = `${upiPct}%`;
      if (barBank) barBank.style.width = `${bankPct}%`;
      if (barCash) barCash.style.width = `${cashPct}%`;

      const modal = document.getElementById('treasury-overview-modal');
      if (modal) modal.classList.add('active');
    }

    function closeAdminModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    }

    function handleAdminSearch() {
      clearTimeout(SEARCH_DEBOUNCE_TIMER);
      SEARCH_DEBOUNCE_TIMER = setTimeout(() => {
        SEARCH_QUERY = document.getElementById("admin-search-input").value.trim().toLowerCase();
        CURRENT_PAGE = 1;
        fetchOrders(1);
      }, 250);
    }

    function getAvatarColor(name) {
      const colors = [
        '#FEE2E2', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FCE7F3', '#FFEDD5', '#E0E7FF'
      ];
      let hash = 0;
      for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    }

    function toggleOrderAccordion(orderId) {
      const body = document.getElementById(`order-body-${orderId}`);
      const card = document.getElementById(`card-${orderId}`);
      const arrow = document.getElementById(`arrow-${orderId}`);
      if (!body) return;

      const isOpen = body.style.display !== "none";
      if (isOpen) {
        body.style.display = "none";
        if (card) card.classList.remove("is-expanded");
        if (arrow) arrow.classList.remove("is-rotated");
        EXPANDED_ORDER_IDS.delete(orderId);
      } else {
        body.style.display = "grid";
        if (card) card.classList.add("is-expanded");
        if (arrow) arrow.classList.add("is-rotated");
        EXPANDED_ORDER_IDS.add(orderId);
      }
    }

    function toggleExpandAllOrders() {
      const allOrders = ALL_ORDERS || [];
      const btnText = document.getElementById("btn-expand-all-text");
      const isAllOpen = allOrders.length > 0 && EXPANDED_ORDER_IDS.size === allOrders.length;

      if (isAllOpen) {
        EXPANDED_ORDER_IDS.clear();
        if (btnText) btnText.textContent = "↕️ Expand All";
      } else {
        allOrders.forEach(o => EXPANDED_ORDER_IDS.add(o.id));
        if (btnText) btnText.textContent = "📁 Collapse All";
      }
      renderOrdersList();
    }

    function renderOrdersList() {
      const container = document.getElementById("orders-list-container");
      let list = ALL_ORDERS;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-admin-state">
            <div class="empty-admin-icon">📭</div>
            <h3 style="font-size:1.2rem; margin-bottom:0.4rem; color:var(--primary-maroon);">No orders found</h3>
            <p style="font-size:0.9rem;">There are no orders matching the selected filter or search term.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(order => createOrderCardHtml(order)).join("");
    }

    function createOrderCardHtml(order) {
      const orderDate = new Date(order.createdAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const cust = order.customer || {};
      const cleanPhone = (cust.phone || '').replace(/[^0-9]/g, '');
      const items = order.items || [];
      const tracking = order.tracking || {};

      const courierList = [
        "India Post (Speed Post)",
        "DTDC Express",
        "Delhivery",
        "Blue Dart",
        "The Professional Couriers",
        "ST Courier",
        "Shadowfax",
        "Other"
      ];

      const isExpanded = EXPANDED_ORDER_IDS.has(order.id);

      return `
        <div class="order-card ${isExpanded ? 'is-expanded' : ''}" id="card-${order.id}">
          <!-- COMPACT SUMMARY ACCORDION BAR (Customer Name, Phone & Print Symbol) -->
          <div class="order-accordion-bar" onclick="toggleOrderAccordion('${order.id}')" title="Click to open customer details &amp; order">
            <div class="order-bar-main">
              <div class="order-bar-cust-info">
                <span class="order-cust-avatar" style="background:${getAvatarColor(cust.name || 'C')};">${escapeHtml((cust.name || 'C').charAt(0).toUpperCase())}</span>
                <div class="order-cust-text">
                  <span class="order-cust-name">${escapeHtml(cust.name || 'Valued Customer')}</span>
                </div>
              </div>

              <div class="order-bar-phone-wrap">
                <span class="order-phone-pill" title="Customer Phone Number">
                  <span>📞</span>
                  <span><strong>${escapeHtml(cust.phone || 'N/A')}</strong></span>
                </span>

                <!-- PRINT SYMBOL RIGHT AT THE SIDE OF THE PHONE NUMBER TO PRINT RECEIPT TO SEND ORDER -->
                <button type="button" class="btn-order-print-symbol" onclick="event.stopPropagation(); printOrderReceipt('${order.id}')" title="🖨️ Print Dispatch Receipt of customer details to send order">
                  <span>🖨️</span>
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            <div class="order-bar-meta">
              <span class="order-badge-id">#${order.id}</span>
              <span class="order-badge-price">₹${order.grandTotal}</span>
              <span class="status-pill status-${order.status}">● ${formatStatusName(order.status)}</span>
              <span class="order-meta-date">${orderDate}</span>
              <button type="button" class="btn-accordion-arrow ${isExpanded ? 'is-rotated' : ''}" id="arrow-${order.id}" aria-label="Toggle details" onclick="event.stopPropagation(); toggleOrderAccordion('${order.id}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>

          <!-- COLLAPSIBLE DETAILS BODY (Opens when bar is clicked) -->
          <div class="order-card-body" id="order-body-${order.id}" style="display: ${isExpanded ? 'grid' : 'none'};">
            
            <div class="order-details-actions-bar">
              <div style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span>Order <strong>#${order.id}</strong> Actions:</span>
                ${order.paymentReference ? `
                  <span style="font-size:0.8rem; font-family:monospace; font-weight:700; color:#1E40AF; background:#DBEAFE; padding:2px 8px; border-radius:4px; border:1px solid #93C5FD; display:inline-flex; align-items:center; gap:5px;" title="12-Digit Bank / UPI UTR Transaction ID">
                    <span>UTR:</span>
                    <strong>${escapeHtml(order.paymentReference)}</strong>
                    <button type="button" onclick="event.stopPropagation(); navigator.clipboard.writeText(this.getAttribute('data-utr')); showToast('Copied UTR!');" data-utr="${escapeHtml(order.paymentReference)}" style="background:none; border:none; cursor:pointer; padding:0 2px; font-size:0.85rem;" title="Copy UTR">📋</button>
                  </span>
                ` : `
                  <span style="font-size:0.75rem; color:#9CA3AF; font-style:italic;">(No UTR)</span>
                `}
              </div>

              <div class="order-actions-buttons">
                <button class="btn-print-slip" onclick="openCustomerModal('${order.id}', '${encodeURIComponent(cust.phone || '')}', '${encodeURIComponent(cust.name || '')}')" title="Click to view Customer Profile, Spend &amp; Previous Orders History" style="background:#EEF2FF; border-color:#818CF8; color:#3730A3; font-weight:700;">
                  <span>👤 Customer History</span>
                </button>
                <button class="btn-print-slip" onclick="printShippingLabel('${order.id}')" title="Print Courier Box Shipping Sticker (4x6 format)" style="background:#FFFBEB; border-color:#F59E0B; color:#92400E; font-weight:700;">
                  <span>🏷️ Box Sticker</span>
                </button>
                <button class="btn-print-slip" onclick="downloadSingleLabelHtml('${order.id}')" title="Download standalone offline HTML shipping label file" style="background:#FDF2F8; border-color:#F472B6; color:#9D174D; font-weight:700;">
                  <span>💾 Save Label</span>
                </button>
                <button class="btn-print-slip" onclick="printTaxInvoice('${order.id}')" title="Print Official Tax Invoice / Bill (PDF)" style="background:#F0FDF4; border-color:#86EFAC; color:#166534; font-weight:700;">
                  <span>🧾 Invoice</span>
                </button>
                <button class="btn-print-slip" onclick="printOrderReceipt('${order.id}')" title="Print Dispatch Receipt to send order" style="background:#FAF5FF; border-color:#C084FC; color:#6B21A8; font-weight:700;">
                  <span>🖨️ Dispatch Receipt</span>
                </button>
                <button class="btn-print-slip" onclick="deleteOrder('${order.id}')" style="color:#DC2626;" title="Delete Test Order">
                  <span>🗑️</span>
                </button>
              </div>
            </div>
            <div class="customer-info-box">
              <div class="box-title">
                <span>👤 Customer &amp; Shipping Destination</span>
              </div>
              <div class="cust-detail-row" style="cursor:pointer;" onclick="openCustomerModal('${order.id}', '${encodeURIComponent(cust.phone || '')}', '${encodeURIComponent(cust.name || '')}')" title="Click to view Customer Profile, Grand Total Amount, and all previous date orders">
                <strong>Customer:</strong>
                <span class="cust-badge-clickable">
                  <span class="cust-name-text">👤 <strong>${escapeHtml(cust.name || 'Valued Customer')}</strong></span>
                  <span class="cust-history-pill">View Profile &amp; Past Orders ➔</span>
                </span>
              </div>
              <div class="cust-detail-row">
                <strong>Phone:</strong>
                <span><strong style="color:var(--primary-maroon); font-size:0.95rem;">📞 ${escapeHtml(cust.phone || 'N/A')}</strong></span>
              </div>
              <div class="cust-detail-row">
                <strong>UPI UTR / Ref:</strong>
                <span><strong style="color:#1D4ED8; font-family:monospace; font-size:0.95rem;">${escapeHtml(order.paymentReference || 'Not provided')}</strong></span>
              </div>
              <div class="cust-detail-row">
                <strong>Address:</strong>
                <span>${escapeHtml(cust.address || '')}, ${escapeHtml(cust.city || '')}, ${escapeHtml(cust.state || '')} - <strong>${escapeHtml(cust.pincode || '')}</strong></span>
              </div>
              ${order.notes ? `
                <div class="cust-detail-row" style="margin-top:0.4rem; padding-top:0.4rem; border-top:1px dashed #eee;">
                  <strong>Notes:</strong>
                  <span style="color:#B45309; font-style:italic;">"${escapeHtml(order.notes)}"</span>
                </div>
              ` : ''}

              <div class="cust-actions-bar">
                ${cleanPhone ? `
                  <a href="https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}" target="_blank" class="btn-cust-wa" title="Open direct WhatsApp chat with customer">
                    <span>💬 Chat on WhatsApp</span>
                  </a>
                  <button type="button" class="btn-cust-wa" onclick="openWhatsAppAlertModal('${order.id}')" style="background:#059669; cursor:pointer;" title="Open WhatsApp Customer Alerts Suite">
                    <span>📲 Send Alert</span>
                  </button>
                  <a href="tel:${cust.phone}" class="btn-cust-call" title="Call customer phone">
                    <span>📞 Call</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <div class="customer-info-box">
              <div class="box-title">
                <span>📦 Ordered Items (${items.length} items)</span>
              </div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item &amp; Pack</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>
                        <strong>${item.name}</strong>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${item.weight || ''}</div>
                      </td>
                      <td style="text-align:center;">${item.qty}</td>
                      <td style="text-align:right;">₹${(item.unitPrice || 0) * (item.qty || 1)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="order-totals-row">
                <span>Items Subtotal:</span>
                <span>₹${order.subtotal || 0}</span>
              </div>
              <div class="order-totals-row" style="margin-top:2px;">
                <span>🚚 Delivery Charges:</span>
                <span>
                  <strong style="color:${order.shipping === 0 ? '#059669' : '#24140E'};">${order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}</strong>
                  <button type="button" onclick="editOrderDeliveryCharge('${order.id}', ${order.shipping || 0})" style="background:none; border:none; color:var(--primary-maroon); font-size:0.75rem; text-decoration:underline; cursor:pointer; margin-left:6px;" title="Click to edit delivery charge for this order">✏️ Edit</button>
                </span>
              </div>
              ${order.discount ? `
                <div class="order-totals-row" style="margin-top:2px; color:#15803D;">
                  <span>Discount:</span>
                  <span>-₹${order.discount}</span>
                </div>
              ` : ''}
              <div class="order-totals-row" style="margin-top:4px; padding-top:4px; border-top:1.5px solid var(--border-color);">
                <strong>Grand Total Amount:</strong>
                <span style="color:var(--primary-maroon); font-size:1.15rem; font-weight:800;">₹${order.grandTotal}</span>
              </div>
            </div>

            <!-- GIVE TRACKING ID SECTION -->
            <div class="order-dispatch-panel">
              <div class="box-title" style="margin-bottom:0.75rem;">
                <span>🚚 Courier &amp; Tracking ID Assignment</span>
              </div>

              <form onsubmit="handleSaveTracking(event, '${order.id}')" class="tracking-form-grid">
                <div class="form-group-admin">
                  <label>Order Status</label>
                  <select id="status-${order.id}" class="input-admin" style="font-weight:700;">
                    <option value="received" ${order.status === 'received' ? 'selected' : ''}>🔔 Order Received</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>👍 Confirmed</option>
                    <option value="packed" ${order.status === 'packed' ? 'selected' : ''}>🎁 Packed & Ready</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>🚚 Dispatched / Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                  </select>
                </div>

                <div class="form-group-admin">
                  <label>Courier Partner</label>
                  <select id="courier-${order.id}" class="input-admin" onchange="autoFillTrackingUrl('${order.id}')">
                    <option value="">-- Select Courier --</option>
                    ${courierList.map(c => `
                      <option value="${c}" ${tracking.courier === c ? 'selected' : ''}>${c}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group-admin">
                  <label>Tracking ID / AWB Number</label>
                  <input type="text" id="track-id-${order.id}" class="input-admin" placeholder="e.g. EP849204910IN" value="${tracking.trackingId || ''}">
                  <input type="hidden" id="track-url-${order.id}" value="${tracking.trackingUrl || ''}">
                </div>

                <div style="display:flex; gap:0.5rem; align-items:flex-end;">
                  <button type="submit" class="btn-save-tracking" title="Save Tracking ID and Status">
                    <span>💾 Save Tracking</span>
                  </button>
                  
                  ${cleanPhone ? `
                    <button type="button" class="btn-notify-wa" onclick="sendWhatsAppQuickAlert('${order.id}', 'dispatched')" title="Send Dispatch Alert directly to Customer's WhatsApp">
                      <span>📲 Send Dispatch</span>
                    </button>
                  ` : ''}
                </div>
              </form>

              ${tracking.trackingId ? `
                <div class="tracking-active-badge">
                  <span>✅ <strong>Dispatched via ${tracking.courier || 'Courier'}:</strong></span>
                  <span style="font-family:monospace; font-weight:700; background:#fff; padding:2px 8px; border-radius:4px; border:1px solid #A5D6A7;">
                    ${tracking.trackingId}
                  </span>
                  ${tracking.trackingUrl ? `
                    <a href="${tracking.trackingUrl}" target="_blank" rel="noopener noreferrer">
                      🌐 Open Live Courier Tracking Page &rarr;
                    </a>
                  ` : ''}
                </div>
              ` : `
                <div style="margin-top:0.5rem; font-size:0.8rem; color:#92400E; background:#FEF3C7; padding:4px 10px; border-radius:6px; display:inline-block;">
                  ⚠️ No tracking ID assigned yet. Enter the consignment number above once dispatched.
                </div>
              `}
            </div>

            <!-- 1-CLICK WHATSAPP CUSTOMER ALERTS SUITE (₹0 COST) -->
            <div class="order-wa-suite-panel">
              <div class="wa-suite-header">
                <div class="wa-suite-title">
                  <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:#25D366; color:#fff; border-radius:50%; font-size:0.8rem; box-shadow:0 1px 4px rgba(37,211,102,0.4);">📲</span>
                  <strong>1-Click WhatsApp Customer Alerts (₹0 Cost)</strong>
                  <span class="wa-tag-free">Free &amp; Instant</span>
                </div>
                ${cleanPhone ? `
                  <div class="wa-suite-phone">
                    <span>Target Phone: <strong>+${cleanPhone.length === 10 ? '91 ' + cleanPhone : cleanPhone}</strong></span>
                  </div>
                ` : `
                  <div class="wa-suite-phone" style="color:#DC2626;">
                    <span>⚠️ No phone number provided</span>
                  </div>
                `}
              </div>

              ${cleanPhone ? `
                <div class="wa-suite-actions">
                  <button type="button" class="btn-wa-chip btn-wa-chip-confirm" onclick="sendWhatsAppQuickAlert('${order.id}', 'confirmed')" title="Send Order Confirmed & Payment Verified alert to customer">
                    <span>✅ 1. Order Confirmed</span>
                  </button>

                  <button type="button" class="btn-wa-chip btn-wa-chip-dispatch" onclick="sendWhatsAppQuickAlert('${order.id}', 'dispatched')" title="Send Dispatch alert with live tracking number & courier details">
                    <span>🚚 2. Dispatch &amp; Tracking</span>
                  </button>

                  <button type="button" class="btn-wa-chip btn-wa-chip-delivered" onclick="sendWhatsAppQuickAlert('${order.id}', 'delivered')" title="Send Delivery Follow-up, Traditional Storage Tips & 10% Coupon">
                    <span>🎉 3. Delivered &amp; Review</span>
                  </button>

                  <button type="button" class="btn-wa-chip btn-wa-chip-preview" onclick="openWhatsAppAlertModal('${order.id}')" title="Preview, edit, or customize alert message before sending">
                    <span>✏️ Preview &amp; Edit Alert</span>
                  </button>
                </div>
              ` : `
                <div style="font-size:0.8rem; color:#6B7280; font-style:italic;">
                  WhatsApp alerts require a valid customer phone number.
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }

    function formatStatusName(status) {
      switch (status) {
        case 'received': return '🔔 Received';
        case 'confirmed': return '👍 Confirmed';
        case 'packed': return '🎁 Packed';
        case 'shipped': return '🚚 Dispatched';
        case 'delivered': return '✅ Delivered';
        case 'cancelled': return '❌ Cancelled';
        default: return status;
      }
    }

    function autoFillTrackingUrl(orderId) {
      const courierSelect = document.getElementById(`courier-${orderId}`);
      const trackingUrlInput = document.getElementById(`track-url-${orderId}`);
      const selectedCourier = courierSelect.value;
      if (COURIER_URL_MAP[selectedCourier]) {
        trackingUrlInput.value = COURIER_URL_MAP[selectedCourier];
      }
    }

    async function handleSaveTracking(e, orderId) {
      e.preventDefault();
      const status = document.getElementById(`status-${orderId}`).value;
      const courier = document.getElementById(`courier-${orderId}`).value;
      const trackingId = document.getElementById(`track-id-${orderId}`).value.trim();
      let trackingUrl = document.getElementById(`track-url-${orderId}`).value.trim();

      if (!trackingUrl && courier && COURIER_URL_MAP[courier]) {
        trackingUrl = COURIER_URL_MAP[courier];
      }

      let finalStatus = status;
      if (trackingId && (status === 'received' || status === 'confirmed' || status === 'packed')) {
        finalStatus = 'shipped';
        document.getElementById(`status-${orderId}`).value = 'shipped';
      }

      const updatePayload = {
        status: finalStatus,
        tracking: {
          courier,
          trackingId,
          trackingUrl,
          dispatchedAt: new Date().toISOString()
        }
      };

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updatePayload)
        });

        if (res.ok) {
          showToast(`✅ Order #${orderId} tracking saved!`);
          fetchOrders(CURRENT_PAGE);
          fetchFinanceData();
        } else {
          showToast("Failed to save tracking.");
        }
      } catch (err) {
        showToast("Error updating order tracking.");
      }
    }

    // Admin 1-Click Order Delivery Charge Editor
    async function editOrderDeliveryCharge(orderId, currentShipping = 0) {
      const input = prompt(`Enter new Delivery Charge (₹) for Order #${orderId}:\n(Enter 0 for Free Delivery)`, currentShipping);
      if (input === null) return; // Admin cancelled
      const newShipping = Math.max(0, parseFloat(String(input).trim()));
      if (isNaN(newShipping)) {
        showToast("⚠️ Invalid delivery charge amount entered.");
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ shipping: newShipping })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`✅ Order #${orderId} delivery charge set to ₹${newShipping}! Total recalculated.`);
          fetchOrders(CURRENT_PAGE);
          fetchFinanceData();
          // If order details modal is open, refresh it
          const modal = document.getElementById("order-details-modal");
          if (modal && modal.classList.contains("active")) {
            openOrderDetailsModal(orderId);
          }
        } else {
          showToast(data.error || "Failed to update order delivery charge.");
        }
      } catch (err) {
        showToast("Error updating order delivery charge.");
      }
    }

    // =========================================================================
    // 1-CLICK WHATSAPP CUSTOMER ALERTS SUITE (₹0 COST / NATIVE CLICK-TO-CHAT)
    // =========================================================================
    function formatCustomerWhatsAppPhone(rawPhone) {
      if (!rawPhone) return '';
      let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = cleaned.substring(1);
      }
      if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
      }
      return cleaned;
    }

    function generateWhatsAppAlertText(order, type) {
      if (!order) return '';
      const cust = order.customer || {};
      const custName = cust.name ? cust.name.trim() : 'Customer';
      const orderId = order.id || 'N/A';
      const items = order.items || [];
      const tracking = order.tracking || {};
      const courier = tracking.courier || 'Express Courier';
      const trackId = tracking.trackingId || '';
      let trackingUrl = tracking.trackingUrl || '';
      if (!trackingUrl && courier && COURIER_URL_MAP[courier]) {
        if (courier === 'Delhivery' && trackId) {
          trackingUrl = `https://www.delhivery.com/track/package/${trackId}`;
        } else {
          trackingUrl = COURIER_URL_MAP[courier];
        }
      }
      const grandTotal = order.grandTotal || 0;
      const utr = order.paymentReference || '';

      if (type === 'confirmed') {
        let msg = `*Namaskaram ${custName} Garu!* 🙏✨\n\n`;
        msg += `Thank you for choosing *Chinnodu Foods*! We are delighted to confirm that your order *#${orderId}* has been received by our kitchen.\n\n`;
        msg += `⚡ *Payment Status:* Verified & Received (Prepaid UPI)\n`;
        if (utr) {
          msg += `🔖 *UPI Ref / UTR:* ${utr}\n`;
        }
        msg += `\n📦 *Ordered Authentic Delicacies:*\n`;
        if (items.length > 0) {
          items.forEach(it => {
            msg += `• ${it.name} (${it.weight || 'Standard'}) x ${it.qty} — ₹${(it.unitPrice || 0) * (it.qty || 1)}\n`;
          });
        } else {
          msg += `• Authentic Andhra Homemade Delicacies\n`;
        }
        msg += `\n💰 *Grand Total:* ₹${grandTotal} (Paid via UPI)\n`;
        if (cust.city || cust.address) {
          msg += `📍 *Delivery Address:* ${cust.address || ''}, ${cust.city || ''}, ${cust.state || ''} - ${cust.pincode || ''}\n`;
        }
        msg += `\n👩‍🍳 *Kitchen Update:* Our home chefs in Andhra are freshly preparing and packing your delicacies using pure cold-pressed groundnut oil, stone-ground spices, and traditional recipes.\n\n`;
        msg += `We will share the courier consignment tracking number with you as soon as your parcel is packed and handed over to dispatch!\n\n`;
        msg += `📞 *Need any customization or help?* Reply to this WhatsApp message or call us at +91 73829 14229 / +91 96766 98427.\n\n`;
        msg += `*Chinnodu Foods — Authentic Andhra Pickles, Sweets & Savouries*\n🌐 https://chinnodufoods.com`;
        return msg;
      }

      if (type === 'dispatched') {
        let msg = `*Namaskaram ${custName} Garu!* 🏺📦\n\n`;
        msg += `Exciting news! Your authentic Andhra food parcel for order *#${orderId}* has been freshly packed and handed over to our delivery partner!\n\n`;
        msg += `🚚 *Courier Partner:* ${courier}\n`;
        if (trackId) {
          msg += `🔖 *Consignment / AWB No.:* *${trackId}*\n`;
        } else {
          msg += `🔖 *Consignment No.:* Being assigned shortly\n`;
        }
        if (trackingUrl) {
          msg += `🔗 *Track Your Parcel Live:* ${trackingUrl}\n`;
        }
        msg += `🌐 *Chinnodu Foods Website:* https://chinnodufoods.com\n\n`;
        msg += `⏱️ *Estimated Delivery:* Usually 2 to 4 business days.\n`;
        msg += `📦 *Freshness Note:* Your parcel is sealed in food-grade leak-proof containers and safety packaging to retain authentic aroma and crispness.\n\n`;
        msg += `Thank you for trusting Chinnodu Foods with your family's authentic taste!\n`;
        msg += `For any assistance, reply directly here or call +91 73829 14229 / +91 96766 98427.\n\n`;
        msg += `*Team Chinnodu Foods*`;
        return msg;
      }

      if (type === 'delivered') {
        let msg = `*Namaskaram ${custName} Garu!* 🍯❤️\n\n`;
        msg += `Our delivery partner confirms that your order *#${orderId}* from *Chinnodu Foods* has been successfully delivered!\n\n`;
        msg += `We hope you and your family enjoy the rich, authentic Andhra flavors!\n\n`;
        msg += `🥄 *Traditional Storage Tips for Maximum Freshness:*\n`;
        msg += `• *Pickles:* Always use a clean, dry spoon (no moisture). Keep the top layer covered with a thin coat of groundnut oil to lock in aroma for 6–12 months of natural freshness.\n`;
        msg += `• *Sweets & Savouries:* Keep in a cool, airtight container away from direct heat.\n\n`;
        msg += `⭐ *How was your experience?*\n`;
        msg += `Did you love the taste, crunch, and authentic spice level? We would deeply appreciate your feedback or a quick photo of your meal! Reply directly to this message.\n\n`;
        msg += `🎁 *Special Treat For You:*\n`;
        msg += `Use coupon code *CHINNODU10* on your next order at https://chinnodufoods.com for 10% OFF!\n\n`;
        msg += `With warm regards & gratitude,\n`;
        msg += `*Team Chinnodu Foods*\n`;
        msg += `📞 +91 73829 14229 / +91 96766 98427`;
        return msg;
      }

      // Custom
      let msg = `*Namaskaram ${custName} Garu!* 🙏\n\n`;
      msg += `This is from *Chinnodu Foods* regarding your order *#${orderId}*.\n\n`;
      msg += `[Your custom update here]\n\n`;
      msg += `Thank you for choosing Chinnodu Foods!\n`;
      msg += `📞 Helpline: +91 73829 14229 / +91 96766 98427\n`;
      msg += `🌐 https://chinnodufoods.com`;
      return msg;
    }

    function sendWhatsAppQuickAlert(orderId, type) {
      const order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order) {
        showToast("⚠️ Order not found.");
        return;
      }

      const cust = order.customer || {};
      const phone = formatCustomerWhatsAppPhone(cust.phone);
      if (!phone) {
        showToast("⚠️ No customer phone number available.");
        return;
      }

      // If dispatched and no tracking ID, prompt admin
      if (type === 'dispatched') {
        const tracking = order.tracking || {};
        if (!tracking.trackingId) {
          const proceed = confirm("⚠️ No tracking ID / AWB number has been saved for this order yet.\n\nWould you like to open the WhatsApp preview to edit or send anyway?");
          if (proceed) {
            openWhatsAppAlertModal(orderId, 'dispatched');
          }
          return;
        }
      }

      const message = generateWhatsAppAlertText(order, type);
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank");

      const typeLabels = {
        confirmed: 'Order Confirmed',
        dispatched: 'Dispatch & Tracking',
        delivered: 'Delivered & Review'
      };
      showToast(`📲 Opening WhatsApp (${typeLabels[type] || 'Alert'}) for #${orderId}`);
    }

    function openWhatsAppAlertModal(orderId, initialType = 'confirmed') {
      const order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order) {
        showToast("⚠️ Order not found.");
        return;
      }

      const cust = order.customer || {};
      const phone = formatCustomerWhatsAppPhone(cust.phone);
      if (!phone) {
        showToast("⚠️ No customer phone number available.");
        return;
      }

      ACTIVE_WA_ORDER = order;
      ACTIVE_WA_TYPE = initialType;

      // Update modal metadata
      const subtitle = document.getElementById("wa-modal-subtitle");
      if (subtitle) {
        subtitle.textContent = `Order #${order.id} • ${new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`;
      }
      const recip = document.getElementById("wa-modal-recipient");
      if (recip) {
        recip.textContent = cust.name ? `${cust.name} Garu` : 'Customer';
      }
      const phEl = document.getElementById("wa-modal-phone");
      if (phEl) {
        phEl.textContent = `+${phone}`;
      }

      // Activate corresponding tab chip
      ['confirmed', 'dispatched', 'delivered', 'custom'].forEach(t => {
        const btn = document.getElementById(`wa-tpl-btn-${t}`);
        if (btn) {
          if (t === initialType) btn.classList.add("active");
          else btn.classList.remove("active");
        }
      });

      const text = generateWhatsAppAlertText(order, initialType);
      const textarea = document.getElementById("wa-modal-textarea");
      if (textarea) {
        textarea.value = text;
      }
      updateWhatsAppCharCount();

      const modal = document.getElementById("whatsapp-preview-modal");
      if (modal) {
        modal.classList.add("active");
      }
    }

    function closeWhatsAppAlertModal() {
      const modal = document.getElementById("whatsapp-preview-modal");
      if (modal) {
        modal.classList.remove("active");
      }
    }

    function switchWhatsAppTemplate(templateType) {
      if (!ACTIVE_WA_ORDER) return;
      ACTIVE_WA_TYPE = templateType;

      ['confirmed', 'dispatched', 'delivered', 'custom'].forEach(t => {
        const btn = document.getElementById(`wa-tpl-btn-${t}`);
        if (btn) {
          if (t === templateType) btn.classList.add("active");
          else btn.classList.remove("active");
        }
      });

      const text = generateWhatsAppAlertText(ACTIVE_WA_ORDER, templateType);
      const textarea = document.getElementById("wa-modal-textarea");
      if (textarea) {
        textarea.value = text;
      }
      updateWhatsAppCharCount();
    }

    function updateWhatsAppCharCount() {
      const textarea = document.getElementById("wa-modal-textarea");
      const countSpan = document.getElementById("wa-modal-char-count");
      if (!textarea || !countSpan) return;
      const len = textarea.value.length;
      const lines = textarea.value.split('\n').length;
      countSpan.textContent = `${len} characters • ${lines} lines`;
    }

    function copyWhatsAppMessage() {
      const textarea = document.getElementById("wa-modal-textarea");
      if (!textarea || !textarea.value) {
        showToast("⚠️ No text to copy.");
        return;
      }
      navigator.clipboard.writeText(textarea.value).then(() => {
        showToast("📋 Message copied to clipboard!");
      }).catch(() => {
        textarea.select();
        document.execCommand('copy');
        showToast("📋 Message copied!");
      });
    }

    function sendWhatsAppModalMessage() {
      if (!ACTIVE_WA_ORDER) return;
      const textarea = document.getElementById("wa-modal-textarea");
      const msg = textarea ? textarea.value : '';
      if (!msg.trim()) {
        showToast("⚠️ Message is empty.");
        return;
      }

      const cust = ACTIVE_WA_ORDER.customer || {};
      const phone = formatCustomerWhatsAppPhone(cust.phone);
      if (!phone) {
        showToast("⚠️ Invalid customer phone number.");
        return;
      }

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
      showToast(`📲 Opened WhatsApp for #${ACTIVE_WA_ORDER.id}`);
      closeWhatsAppAlertModal();
    }

    // Backward-compatible alias for existing calls
    function sendTrackingOnWhatsApp(orderId) {
      sendWhatsAppQuickAlert(orderId, 'dispatched');
    }

    // Number to Words Converter in Indian Numbering System (INR)
    function numberToWordsINR(num) {
      num = Math.floor(Number(num) || 0);
      if (num === 0) return "Zero Rupees Only";
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      function convertUnderThousand(n) {
        let str = '';
        if (n >= 100) {
          str += a[Math.floor(n / 100)] + ' Hundred ';
          n %= 100;
        }
        if (n >= 20) {
          str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
        } else if (n > 0) {
          str += a[n] + ' ';
        }
        return str.trim();
      }

      let words = '';
      const crore = Math.floor(num / 10000000);
      num %= 10000000;
      const lakh = Math.floor(num / 100000);
      num %= 100000;
      const thousand = Math.floor(num / 1000);
      num %= 1000;
      const remainder = num;

      if (crore > 0) words += convertUnderThousand(crore) + ' Crore ';
      if (lakh > 0) words += convertUnderThousand(lakh) + ' Lakh ';
      if (thousand > 0) words += convertUnderThousand(thousand) + ' Thousand ';
      if (remainder > 0) words += convertUnderThousand(remainder) + ' ';

      return words.trim() + ' Rupees Only';
    }

    // Reusable Shipping Box Sticker HTML Generator (4x6 format, bold fonts for delivery couriers)
    function generateShippingLabelHtml(order) {
      if (!order) return '';
      const cust = order.customer || {};
      const tracking = order.tracking || {};
      const items = order.items || [];
      const courierName = tracking.courier || 'India Post (Speed Post)';
      const trackId = tracking.trackingId || `CF${(order.id || '').replace(/\D/g, '')}IN`;
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      const totalItemsCount = items.reduce((s, i) => s + (Number(i.qty) || 1), 0);
      const itemsSummary = items.map(i => `${i.name} (${i.weight || 'Std'}) x${i.qty}`).join(', ');

      return `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 580px; margin: 0 auto; border: 3px solid #000; padding: 16px; background: #fff; color: #000; box-sizing: border-box;">
          
          <!-- TOP BANNER -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 0.5px; color: #000;">CHINNODU FOODS</div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Authentic Homemade Andhra Delicacies • Express Parcel</div>
            </div>
            <div style="background: #000; color: #fff; padding: 6px 12px; font-size: 12px; font-weight: 900; letter-spacing: 1px; border-radius: 4px; text-align: center;">
              PREPAID PARCEL<br>
              <span style="font-size: 10px; font-weight: 700; color: #FCD34D;">DO NOT COLLECT CASH</span>
            </div>
          </div>

          <!-- COURIER & WAYBILL STRIP -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f0f0f0; border: 1.5px solid #000; padding: 8px 12px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #444;">Courier Partner:</div>
              <div style="font-size: 15px; font-weight: 900; color: #000;">${escapeHtml(courierName)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #444;">AWB / Tracking Number:</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; letter-spacing: 1px; color: #000;">${escapeHtml(trackId)}</div>
            </div>
          </div>

          <!-- DESTINATION / SHIP TO SECTION (LARGE & BOLD FOR DELIVERY BOYS) -->
          <div style="border: 2px solid #000; padding: 12px; margin-bottom: 12px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; background: #000; color: #fff; padding: 2px 8px; display: inline-block;">
                SHIP TO (CONSIGNEE)
              </div>
              <div style="border: 2px solid #000; padding: 4px 10px; background: #FFFF00; font-size: 20px; font-weight: 900; letter-spacing: 2px;">
                PIN: ${escapeHtml(cust.pincode || '------')}
              </div>
            </div>

            <div style="font-size: 20px; font-weight: 900; color: #000; margin-bottom: 4px;">
              ${escapeHtml(cust.name || 'Valued Customer')}
            </div>

            <div style="font-size: 16px; font-weight: 900; color: #000; margin-bottom: 8px;">
              📞 Mobile: ${escapeHtml(cust.phone || 'N/A')}
            </div>

            <div style="font-size: 13px; line-height: 1.4; color: #111; font-weight: 600;">
              ${escapeHtml(cust.address || '')}<br>
              ${escapeHtml(cust.city || '')}, ${escapeHtml(cust.state || 'Andhra Pradesh')}
            </div>
          </div>

          <!-- SHIPPER / FROM SECTION -->
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; border: 1.5px solid #000; padding: 10px; margin-bottom: 12px; font-size: 11px; line-height: 1.35;">
            <div>
              <div style="font-weight: 900; text-transform: uppercase; text-decoration: underline; margin-bottom: 4px;">
                RETURN IF UNDELIVERED TO (SHIPPER):
              </div>
              <div style="font-size: 13px; font-weight: 900;">CHINNODU FOODS</div>
              <div>Prop. Somesh Adigarla</div>
              <div>Bhimavaram / Kakinada, West Godavari Dist.</div>
              <div>Andhra Pradesh, PIN: 534201, India</div>
              <div>Phone: <strong>+91 73829 14229 / +91 96766 98427</strong></div>
            </div>
            <div style="border-left: 1.5px solid #000; padding-left: 10px; display: flex; flex-direction: column; justify-content: center;">
              <div><strong>Order ID:</strong> #${escapeHtml(order.id)}</div>
              <div><strong>Booking Date:</strong> ${orderDate}</div>
              <div><strong>Items Count:</strong> ${totalItemsCount} Packs</div>
              <div><strong>Payment:</strong> PREPAID (₹${order.grandTotal})</div>
              ${order.paymentReference ? `<div><strong>UTR:</strong> ${escapeHtml(order.paymentReference)}</div>` : ''}
            </div>
          </div>

          <!-- CONTENTS SUMMARY -->
          <div style="border: 1px dashed #000; padding: 6px 10px; font-size: 11px; margin-bottom: 12px;">
            <strong>Package Contents:</strong> ${escapeHtml(itemsSummary)}
          </div>

          <!-- PERISHABLE / FRAGILE WARNING FOOTER -->
          <div style="border: 2px solid #DC2626; background: #FEF2F2; color: #991B1B; padding: 8px 10px; text-align: center; border-radius: 4px;">
            <div style="font-size: 12px; font-weight: 900; letter-spacing: 0.5px;">
              ⚠️ PERISHABLE HOMEMADE FOOD DELICACY — HANDLE WITH SPECIAL CARE
            </div>
            <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">
              KEEP UPRIGHT ⬆️⬆️ • AVOID DIRECT SUNLIGHT • DO NOT COMPRESS OR DROP
            </div>
          </div>

        </div>
      `;
    }

    // =========================================================================
    // OFFICIAL CUSTOMER DISPATCH & PACKING RECEIPT CONTROLLER
    // =========================================================================
    function generateOrderReceiptHtml(order) {
      if (!order) return '';
      const cust = order.customer || {};
      const items = order.items || [];
      const tracking = order.tracking || {};
      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      return `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 650px; margin: 0 auto; border: 2.5px solid #000; padding: 20px; background: #fff; color: #000; box-sizing: border-box;">
          <!-- STORE HEADER -->
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 14px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #6B1426; letter-spacing: 0.5px;">CHINNODU FOODS</h1>
            <div style="font-size: 12px; font-weight: bold; margin-top: 3px; text-transform: uppercase;">Authentic Andhra Pickles &amp; Traditional Sweets</div>
            <div style="font-size: 11px; color: #333; margin-top: 2px;">
              Website: chinnodufoods.com • Helpline: +91 73829 14229 / +91 78930 06417
            </div>
          </div>

          <!-- RECEIPT TITLE STRIP -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f2f2f2; border: 1.5px solid #000; padding: 6px 12px; margin-bottom: 14px; font-size: 12px;">
            <div>
              <strong>CUSTOMER ORDER &amp; DISPATCH RECEIPT</strong>
            </div>
            <div style="font-weight: bold;">
              ORDER: <span style="font-family: monospace; font-size: 14px;">#${order.id}</span>
            </div>
          </div>

          <!-- ORDER META GRID -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; font-size: 12px;">
            <div style="border: 1px solid #ccc; padding: 8px 10px; border-radius: 4px;">
              <div><strong>Order Date:</strong> ${orderDate}</div>
              <div><strong>Payment Status:</strong> <span style="font-weight: bold; color: #059669;">Prepaid UPI (Paid)</span></div>
              ${order.paymentReference ? `<div><strong>UTR / Ref No:</strong> <span style="font-family: monospace; font-weight: bold;">${order.paymentReference}</span></div>` : ''}
            </div>
            <div style="border: 1px solid #ccc; padding: 8px 10px; border-radius: 4px;">
              <div><strong>Courier Partner:</strong> ${tracking.courier || 'Pending Handover'}</div>
              <div><strong>AWB / Tracking No:</strong> <span style="font-family: monospace; font-weight: bold;">${tracking.trackingId || 'To be updated'}</span></div>
              <div><strong>Order Status:</strong> <span style="font-weight: bold; text-transform: uppercase;">${order.status || 'Received'}</span></div>
            </div>
          </div>

          <!-- CONSIGNEE / CUSTOMER DESTINATION BOX (VERY CLEAR TO SEND ORDER) -->
          <div style="border: 2px solid #000; padding: 12px; margin-bottom: 14px; background: #fdfdfd; font-size: 12.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #999; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-weight: 900; text-transform: uppercase; font-size: 11.5px; background: #000; color: #fff; padding: 2px 8px;">
                DELIVERY DESTINATION (CONSIGNEE)
              </span>
              <span style="border: 2px solid #000; background: #ffff00; font-size: 14px; font-weight: 900; padding: 2px 8px; letter-spacing: 1px;">
                PIN: ${cust.pincode || '------'}
              </span>
            </div>
            <div style="font-size: 16px; font-weight: 900; margin-bottom: 4px; color: #000;">
              👤 ${escapeHtml(cust.name || 'Valued Customer')}
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #000; margin-bottom: 6px;">
              📞 Mobile: ${escapeHtml(cust.phone || 'N/A')}
            </div>
            <div style="line-height: 1.45; color: #222;">
              <strong>Address:</strong> ${escapeHtml(cust.address || '')}, ${escapeHtml(cust.city || '')}, ${escapeHtml(cust.state || '')}
            </div>
            ${order.notes ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dotted #ccc; font-size: 11.5px; color: #854d0e;">
                <strong>Customer Instructions:</strong> "${escapeHtml(order.notes)}"
              </div>
            ` : ''}
          </div>

          <!-- ITEMS ORDERED TABLE -->
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">
            📦 Package Contents &amp; Ordered Items (${items.length} items):
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px;">
            <thead>
              <tr style="background: #e5e5e5;">
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: left;">Item Description</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: center;">Pack Weight</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: center;">Qty</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: right;">Unit Price</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px 8px; font-weight: 600;">${escapeHtml(item.name || '')}</td>
                  <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${escapeHtml(item.weight || 'Std')}</td>
                  <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold;">${item.qty}</td>
                  <td style="border: 1px solid #000; padding: 6px 8px; text-align: right;">₹${item.unitPrice || 0}</td>
                  <td style="border: 1px solid #000; padding: 6px 8px; text-align: right; font-weight: bold;">₹${(item.unitPrice || 0) * (item.qty || 1)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600;">Items Subtotal:</td>
                <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600;">₹${order.subtotal || 0}</td>
              </tr>
              <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600;">Delivery &amp; Packaging:</td>
                <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600;">${order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}</td>
              </tr>
              ${order.discount ? `
                <tr>
                  <td colspan="4" style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600; color: #166534;">Special Discount:</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 600; color: #166534;">-₹${order.discount}</td>
                </tr>
              ` : ''}
              <tr style="background: #f0f0f0; font-size: 13px;">
                <td colspan="4" style="border: 2px solid #000; padding: 6px 8px; text-align: right; font-weight: 900;">GRAND TOTAL PAID:</td>
                <td style="border: 2px solid #000; padding: 6px 8px; text-align: right; font-weight: 900; font-size: 15px; color: #6B1426;">₹${order.grandTotal}</td>
              </tr>
            </tbody>
          </table>

          <!-- PACKING VERIFICATION & SEND-OFF SEAL -->
          <div style="display: flex; justify-content: space-between; align-items: center; border: 1px dashed #000; padding: 8px 12px; margin-top: 10px; font-size: 11px;">
            <div>
              <div>✓ Double sealed food-grade packaging</div>
              <div>✓ Dispatched directly from Andhra kitchen</div>
            </div>
            <div style="text-align: right;">
              <div>Packed &amp; Verified By: <strong>Chinnodu Foods Dispatch</strong></div>
              <div style="font-size: 10px; color: #555;">Handcrafted with traditional care.</div>
            </div>
          </div>
        </div>
      `;
    }

    // Print Individual Order Receipt with Customer Details to Send Order
    function printOrderReceipt(orderId) {
      let order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order && ACTIVE_CUSTOMER_HISTORY && Array.isArray(ACTIVE_CUSTOMER_HISTORY.orders)) {
        order = ACTIVE_CUSTOMER_HISTORY.orders.find(o => o.id === orderId);
      }
      if (!order) {
        showToast("Order not found to print receipt.");
        return;
      }

      const printContainer = document.getElementById("print-container");
      if (!printContainer) return;
      printContainer.innerHTML = generateOrderReceiptHtml(order);
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    // =========================================================================
    // DATE CUSTOMER DATA PRINT & DOWNLOAD SUITE (TOTAL ORDERS & DATA EXPORT)
    // =========================================================================

    // 1. Download Orders as formatted UTF-8 CSV / Excel File
    function downloadOrdersCSV(ordersList, targetDate) {
      const headers = [
        "Order ID",
        "Order Date",
        "Customer Name",
        "Mobile Number",
        "Address",
        "City",
        "State",
        "Pincode",
        "Items Ordered",
        "Items Count",
        "Items Subtotal (INR)",
        "Delivery Fee (INR)",
        "Discount (INR)",
        "Grand Total (INR)",
        "Payment Mode",
        "Payment Status",
        "UTR Reference",
        "Order Status",
        "Courier Partner",
        "Tracking Number",
        "Customer Notes"
      ];

      const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

      const rows = ordersList.map(o => {
        const c = o.customer || {};
        const tr = o.tracking || {};
        const items = o.items || [];
        const itemsSummary = items.map(i => `${i.name || ''} (${i.weight || ''}) x${i.qty || 1}`).join('; ');
        const totalPacks = items.reduce((sum, i) => sum + (Number(i.qty) || 1), 0);

        return [
          escapeCsv(o.id || ''),
          escapeCsv(o.createdAt || ''),
          escapeCsv(c.name || ''),
          escapeCsv(c.phone || ''),
          escapeCsv(c.address || ''),
          escapeCsv(c.city || ''),
          escapeCsv(c.state || ''),
          escapeCsv(c.pincode || ''),
          escapeCsv(itemsSummary),
          totalPacks,
          Number(o.subtotal || 0),
          Number(o.shipping || 0),
          Number(o.discount || 0),
          Number(o.grandTotal || 0),
          escapeCsv(o.paymentMethod || 'Prepaid UPI'),
          escapeCsv(o.paymentStatus || 'Paid'),
          escapeCsv(o.paymentReference || ''),
          escapeCsv(o.status || 'received'),
          escapeCsv(tr.courier || ''),
          escapeCsv(tr.trackingId || ''),
          escapeCsv(o.notes || '')
        ].join(',');
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanDate = targetDate && targetDate !== 'all' ? targetDate : 'all_dates';
      a.download = `chinnodu_orders_${cleanDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // 2. Generate Beautiful Total Orders Printable HTML Document
    function generateDateTotalOrdersPrintHtml(ordersList, targetDate) {
      let displayDate = targetDate;
      try {
        if (targetDate === 'all') {
          displayDate = "All Dates (Complete Store History)";
        } else {
          const dObj = new Date(targetDate + "T00:00:00");
          displayDate = dObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch(e) {}

      const totalRevenue = ordersList.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
      const totalItemsCount = ordersList.reduce((s, o) => s + (o.items || []).reduce((is, it) => is + (Number(it.qty) || 1), 0), 0);

      const statusCounts = {
        received: ordersList.filter(o => (o.status || 'received') === 'received').length,
        confirmed: ordersList.filter(o => o.status === 'confirmed').length,
        packed: ordersList.filter(o => o.status === 'packed').length,
        shipped: ordersList.filter(o => o.status === 'shipped').length,
        delivered: ordersList.filter(o => o.status === 'delivered').length
      };

      const statusSummaryPills = [];
      if (statusCounts.received) statusSummaryPills.push(`🔔 ${statusCounts.received} New`);
      if (statusCounts.confirmed) statusSummaryPills.push(`👍 ${statusCounts.confirmed} Confirmed`);
      if (statusCounts.packed) statusSummaryPills.push(`🎁 ${statusCounts.packed} Packed`);
      if (statusCounts.shipped) statusSummaryPills.push(`🚚 ${statusCounts.shipped} Shipped`);
      if (statusCounts.delivered) statusSummaryPills.push(`✅ ${statusCounts.delivered} Delivered`);

      return `
        <div class="date-orders-print-doc" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; color: #111; background: #fff; max-width: 1000px; margin: 0 auto;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #4A0B18; padding-bottom: 14px; margin-bottom: 18px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="assets/images/brand-logo.jpg" alt="Logo" style="width: 58px; height: 58px; border-radius: 50%; border: 2px solid #C99726; object-fit: cover;" onerror="this.style.display='none'">
              <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #4A0B18; letter-spacing: -0.5px;">CHINNODU FOODS</h1>
                <div style="font-size: 13px; font-weight: 700; color: #C99726; text-transform: uppercase; letter-spacing: 0.5px;">Authentic Homemade Pickles &amp; Traditional Sweets</div>
                <div style="font-size: 11px; color: #555; margin-top: 2px;">chinnodufoods.com • Phone: +91 96766 98427 / +91 73829 14229</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="background: #FDF2F4; border: 1.5px solid #F87171; border-radius: 8px; padding: 6px 12px; display: inline-block;">
                <div style="font-size: 11px; font-weight: 800; color: #991B1B; text-transform: uppercase;">Total Orders Report</div>
                <div style="font-size: 15px; font-weight: 900; color: #4A0B18;">${displayDate}</div>
              </div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Printed on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            </div>
          </div>

          <!-- Executive KPI Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Orders</div>
              <div style="font-size: 22px; font-weight: 900; color: #1E293B;">${ordersList.length}</div>
            </div>
            <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 10px 12px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Revenue</div>
              <div style="font-size: 22px; font-weight: 900; color: #15803D;">₹${totalRevenue.toLocaleString('en-IN')}</div>
            </div>
            <div style="background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 10px 12px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase;">Total Delicacies</div>
              <div style="font-size: 22px; font-weight: 900; color: #B45309;">${totalItemsCount} Packs</div>
            </div>
            <div style="background: #FAF5FF; border: 1.5px solid #D8B4FE; border-radius: 8px; padding: 10px 12px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #6B21A8; text-transform: uppercase;">Payment Policy</div>
              <div style="font-size: 13px; font-weight: 900; color: #7E22CE; margin-top: 4px;">100% Prepaid UPI</div>
            </div>
          </div>

          ${statusSummaryPills.length > 0 ? `
            <div style="background: #F1F5F9; border-radius: 6px; padding: 6px 12px; margin-bottom: 16px; font-size: 12px; font-weight: 700; color: #334155; display: flex; gap: 14px; flex-wrap: wrap;">
              <span>Status Summary:</span>
              ${statusSummaryPills.map(p => `<span>${p}</span>`).join(' • ')}
            </div>
          ` : ''}

          <!-- Orders Detail Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px;">
            <thead>
              <tr style="background: #4A0B18; color: #fff;">
                <th style="border: 1px solid #333; padding: 8px 6px; text-align: center; width: 30px;">#</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: left; width: 85px;">Order ID</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: left; width: 140px;">Customer</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: left;">Delivery Address &amp; PIN</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: left; width: 180px;">Ordered Items</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: left; width: 105px;">Payment / UTR</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: right; width: 75px;">Amount</th>
                <th style="border: 1px solid #333; padding: 8px 8px; text-align: center; width: 75px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${ordersList.map((o, idx) => {
                const c = o.customer || {};
                const tr = o.tracking || {};
                const items = o.items || [];
                const dStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                return `
                  <tr style="background: ${idx % 2 === 0 ? '#fff' : '#FAFAFA'};">
                    <td style="border: 1px solid #ccc; padding: 7px 5px; text-align: center; font-weight: 700;">${idx + 1}</td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px;">
                      <span style="font-weight: 900; color: #4A0B18;">#${escapeHtml(o.id || '')}</span>
                      ${dStr ? `<div style="font-size: 10px; color: #666;">${dStr}</div>` : ''}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px;">
                      <div style="font-weight: 800; color: #000;">${escapeHtml(c.name || 'Valued Customer')}</div>
                      <div style="font-size: 11px; font-weight: 700; color: #1E3A8A; margin-top: 2px;">📞 ${escapeHtml(c.phone || '')}</div>
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px; line-height: 1.35;">
                      <div>${escapeHtml(c.address || '')}</div>
                      <div style="font-weight: 800; color: #000; margin-top: 2px;">
                        ${escapeHtml(c.city || '')}${c.state ? `, ${escapeHtml(c.state)}` : ''}
                        <span style="background: #FEF08A; padding: 1px 5px; border-radius: 3px; border: 1px solid #EAB308; margin-left: 4px; font-size: 11px;">PIN: ${escapeHtml(c.pincode || '')}</span>
                      </div>
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px;">
                      ${items.map(it => `
                        <div style="margin-bottom: 2px;">
                          • <strong>${escapeHtml(it.name || '')}</strong> (${escapeHtml(it.weight || '')}) 
                          <span style="font-weight: 800; color: #4A0B18;">×${it.qty || 1}</span>
                        </div>
                      `).join('')}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px; font-size: 10.5px;">
                      <div style="font-weight: 700; color: #15803D;">✅ UPI Paid</div>
                      ${o.paymentReference ? `<div style="font-family: monospace; font-size: 10px; color: #333; margin-top: 2px;">UTR: ${escapeHtml(o.paymentReference)}</div>` : ''}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px; text-align: right;">
                      <div style="font-weight: 900; font-size: 12.5px; color: #4A0B18;">₹${o.grandTotal || 0}</div>
                      ${o.shipping === 0 ? '<div style="font-size: 9.5px; color: #166534;">Free Delivery</div>' : ''}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 7px 8px; text-align: center;">
                      <span style="display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155;">
                        ${escapeHtml(o.status || 'received')}
                      </span>
                      ${tr.trackingId ? `<div style="font-size: 9.5px; font-family: monospace; margin-top: 3px;">${escapeHtml(tr.courier || '')}: ${escapeHtml(tr.trackingId)}</div>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr style="background: #F8FAFC; font-weight: 900; font-size: 12px;">
                <td colspan="6" style="border: 2px solid #333; padding: 8px 10px; text-align: right;">TOTAL ORDERS (${ordersList.length}) REVENUE:</td>
                <td style="border: 2px solid #333; padding: 8px 10px; text-align: right; color: #4A0B18; font-size: 13.5px;">₹${totalRevenue.toLocaleString('en-IN')}</td>
                <td style="border: 2px solid #333;"></td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures & Verification -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px dashed #999; padding-top: 16px; margin-top: 20px; font-size: 11.5px;">
            <div>
              <div><strong>Store &amp; Dispatch In-Charge:</strong> Somesh Adigarla (Administrator)</div>
              <div style="margin-top: 4px; color: #555;">Chinnodu Foods Traditional Kitchens, Andhra Pradesh</div>
              <div style="margin-top: 16px;">Signature: __________________________________</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Handed Over To Logistics:</strong> India Post / DTDC Courier</div>
              <div style="margin-top: 4px; color: #555;">Packages Inspected &amp; Sealed Airtight</div>
              <div style="margin-top: 16px;">Agent Signature: __________________________________</div>
            </div>
          </div>

        </div>
      `;
    }

    // 3. Primary Controller: Show Total Orders Preview -> Save starts Download
    async function printOrDownloadDateData(targetDate) {
      const chosenDate = targetDate || (typeof CURRENT_DATE_FILTER !== 'undefined' ? CURRENT_DATE_FILTER : (window.CURRENT_DATE_FILTER || 'all'));
      
      let displayDate = chosenDate;
      try {
        if (chosenDate === 'all') {
          displayDate = "All Dates";
        } else {
          const dObj = new Date(chosenDate + "T00:00:00");
          displayDate = dObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch(e) {}

      showToast(`⏳ Loading preview for ${displayDate}...`);

      let ordersList = [];

      // Fetch from server for target date if specific date is requested
      if (chosenDate !== 'all') {
        try {
          const res = await fetch(`/api/orders?limit=500&date=${encodeURIComponent(chosenDate)}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.orders)) {
              ordersList = data.orders;
            }
          }
        } catch (err) {
          console.warn("Date fetch error, using local fallback:", err);
        }
      }

      // If server didn't return or was 'all', filter in-memory orders
      if (ordersList.length === 0) {
        if (chosenDate === 'all') {
          ordersList = ALL_ORDERS;
        } else {
          ordersList = ALL_ORDERS.filter(o => {
            if (!o.createdAt) return false;
            const d = new Date(o.createdAt);
            const isoDate = (o.createdAt || '').slice(0, 10);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return isoDate === chosenDate || localDate === chosenDate;
          });
        }
      }

      // Check if zero orders exist for this date
      if (ordersList.length === 0) {
        showToast(`⚠️ No orders found for ${displayDate} (0 orders placed). Please select a date that has orders or click 'All Dates'.`);
        return;
      }

      // Open the Interactive On-Screen Preview Modal
      openDateOrdersPreviewModal(ordersList, chosenDate);
    }

    // Interactive Preview Modal Handlers
    function openDateOrdersPreviewModal(ordersList, targetDate) {
      CURRENT_PREVIEW_ORDERS = ordersList || [];
      CURRENT_PREVIEW_DATE = targetDate || 'all';

      const modal = document.getElementById("date-orders-preview-modal");
      if (!modal) return;

      let displayDate = targetDate;
      try {
        if (targetDate === 'all') {
          displayDate = "All Dates (Complete Store History)";
        } else {
          const dObj = new Date(targetDate + "T00:00:00");
          displayDate = dObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
      } catch(e) {}

      const titleEl = document.getElementById("date-preview-modal-title");
      const subEl = document.getElementById("date-preview-modal-subtitle");
      const bodyEl = document.getElementById("date-preview-modal-body");
      const footerStatsEl = document.getElementById("date-preview-footer-stats");

      const totalRev = ordersList.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);

      if (titleEl) titleEl.textContent = `📋 Total Orders Preview: ${displayDate}`;
      if (subEl) subEl.textContent = `${ordersList.length} orders found • Total revenue: ₹${totalRev.toLocaleString('en-IN')}. Click "Save / Download" to download the CSV data, or "Print" for paper/PDF.`;
      if (footerStatsEl) footerStatsEl.innerHTML = `<strong>Total Orders:</strong> ${ordersList.length} &nbsp;•&nbsp; <strong>Prepaid Revenue:</strong> ₹${totalRev.toLocaleString('en-IN')}`;

      if (bodyEl) {
        bodyEl.innerHTML = generateDateTotalOrdersPrintHtml(ordersList, targetDate);
      }

      modal.classList.add("active");
      showToast(`📋 Showing preview for ${ordersList.length} orders.`);
    }

    function closeDatePreviewModal() {
      const modal = document.getElementById("date-orders-preview-modal");
      if (modal) modal.classList.remove("active");
    }

    // Triggered when user clicks "Save / Download" on the preview modal
    function triggerDatePreviewDownload() {
      if (!CURRENT_PREVIEW_ORDERS || CURRENT_PREVIEW_ORDERS.length === 0) {
        showToast("No orders available to download.");
        return;
      }
      try {
        downloadOrdersCSV(CURRENT_PREVIEW_ORDERS, CURRENT_PREVIEW_DATE);
        showToast(`✅ Downloaded CSV spreadsheet for ${CURRENT_PREVIEW_ORDERS.length} orders!`);
      } catch (err) {
        console.error("Download error:", err);
        showToast("Error generating download file.");
      }
    }

    // Triggered when user clicks "Print / PDF" on the preview modal
    function triggerDatePreviewPrint() {
      if (!CURRENT_PREVIEW_ORDERS || CURRENT_PREVIEW_ORDERS.length === 0) {
        showToast("No orders available to print.");
        return;
      }
      const printContainer = document.getElementById("print-container");
      if (printContainer) {
        printContainer.innerHTML = generateDateTotalOrdersPrintHtml(CURRENT_PREVIEW_ORDERS, CURRENT_PREVIEW_DATE);
        printContainer.style.display = "block";
        window.print();
        printContainer.style.display = "none";
      }
    }

    function openDateDataModal(targetDate) {
      MODAL_TARGET_DATE = targetDate || CURRENT_DATE_FILTER || 'all';
      const modal = document.getElementById("date-print-download-modal");
      if (!modal) return;

      const dateDisp = document.getElementById("date-modal-date-display");
      const countDisp = document.getElementById("date-modal-count-display");

      let displayTitle = MODAL_TARGET_DATE;
      if (MODAL_TARGET_DATE === 'all') {
        displayTitle = "🗓️ All Dates (Complete Store History)";
      } else {
        try {
          const dObj = new Date(MODAL_TARGET_DATE + "T00:00:00");
          displayTitle = `📅 ${dObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
        } catch(e) {}
      }

      let count = TOTAL_ORDERS;
      if (MODAL_TARGET_DATE !== 'all') {
        const summary = AVAILABLE_DATES_SUMMARY.find(d => d.date === MODAL_TARGET_DATE);
        count = summary ? summary.count : ALL_ORDERS.filter(o => (o.createdAt || '').startsWith(MODAL_TARGET_DATE)).length;
      }

      if (dateDisp) dateDisp.textContent = displayTitle;
      if (countDisp) countDisp.textContent = `${count} Orders / Customers`;

      modal.classList.add("active");
    }

    function closeDateDataModal() {
      const modal = document.getElementById("date-print-download-modal");
      if (modal) modal.classList.remove("active");
    }

    async function executeDateAction(action) {
      const targetDate = MODAL_TARGET_DATE;
      closeDateDataModal();
      if (action === 'total-orders' || action === 'print-download') {
        await printOrDownloadDateData(targetDate);
      } else if (action === 'manifest') {
        await printDateDispatchSheet(targetDate);
      } else if (action === 'csv') {
        exportDateOrdersCSV(targetDate);
      } else if (action === 'labels') {
        await printAllDateLabels(targetDate);
      } else if (action === 'receipts') {
        await printAllDateCustomerReceipts(targetDate);
      }
    }

    // Batch Print All Customer Receipts for Selected Date
    async function printAllDateCustomerReceipts(targetDate) {
      const dateToPrint = targetDate || (CURRENT_DATE_FILTER !== 'all' ? CURRENT_DATE_FILTER : 'All Dates');
      let ordersToPrint = [];

      if (dateToPrint !== 'All Dates' && dateToPrint !== 'all') {
        try {
          const res = await fetch(`/api/orders?limit=500&date=${encodeURIComponent(dateToPrint)}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.orders)) ordersToPrint = data.orders;
          }
        } catch (e) {}
      }

      if (dateToPrint === 'All Dates' || dateToPrint === 'all') {
        if (ordersToPrint.length === 0) ordersToPrint = ALL_ORDERS;
      }
      if (ordersToPrint.length === 0) {
        showToast(`No orders available to print receipts for ${dateToPrint}.`);
        return;
      }

      const printContainer = document.getElementById("print-container");
      if (!printContainer) return;

      const receiptsHtml = ordersToPrint.map((order, idx) => `
        <div style="${idx < ordersToPrint.length - 1 ? 'page-break-after: always; break-after: page;' : ''} margin-bottom: 24px;">
          ${generateOrderReceiptHtml(order)}
        </div>
      `).join('');

      printContainer.innerHTML = receiptsHtml;
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    // Official Courier Box Sticker (4x6 format, bold fonts for delivery couriers)
    function printShippingLabel(orderId) {
      let order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order && ACTIVE_CUSTOMER_HISTORY && Array.isArray(ACTIVE_CUSTOMER_HISTORY.orders)) {
        order = ACTIVE_CUSTOMER_HISTORY.orders.find(o => o.id === orderId);
      }
      if (!order) {
        showToast("Order not found to print label.");
        return;
      }

      const printContainer = document.getElementById("print-container");
      printContainer.innerHTML = generateShippingLabelHtml(order);
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    // Download Individual Shipping Label as Offline HTML File
    function downloadSingleLabelHtml(orderId) {
      let order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order && ACTIVE_CUSTOMER_HISTORY && Array.isArray(ACTIVE_CUSTOMER_HISTORY.orders)) {
        order = ACTIVE_CUSTOMER_HISTORY.orders.find(o => o.id === orderId);
      }
      if (!order) return;

      const singleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chinnodu Foods Label - ${order.id}</title>
  <style>
    @page { size: 4in 6in; margin: 0.2in; }
    body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 12px; }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
    }
    .no-print-bar {
      background: #4A0B18; color: #fff; padding: 12px 20px; margin-bottom: 20px;
      border-radius: 8px; display: flex; justify-content: space-between; align-items: center;
      font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .btn-print-offline {
      background: #C99726; color: #000; border: none; padding: 8px 18px;
      font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="no-print no-print-bar">
    <div><strong>CHINNODU FOODS - SHIPPING LABEL #${order.id}</strong> (${escapeHtml(order.customer?.name || 'Customer')})</div>
    <button class="btn-print-offline" onclick="window.print()">🖨️ Print Label (4x6 / PDF)</button>
  </div>
  ${generateShippingLabelHtml(order)}
</body>
</html>`;

      const blob = new Blob([singleHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chinnodu-label-${order.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded label for Order #${order.id}`);
    }

    // Batch Print ALL Shipping Labels for a Date
    async function printAllDateLabels(targetDate) {
      const dateToPrint = targetDate || (CURRENT_DATE_FILTER !== 'all' ? CURRENT_DATE_FILTER : null);
      let ordersToPrint = [];

      if (dateToPrint) {
        try {
          showToast(`Fetching all orders for ${dateToPrint}...`);
          const res = await fetch(`/api/orders?limit=500&date=${encodeURIComponent(dateToPrint)}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.orders)) {
              ordersToPrint = data.orders;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (dateToPrint === null || dateToPrint === 'all') {
        if (ordersToPrint.length === 0) ordersToPrint = ALL_ORDERS;
      }

      if (ordersToPrint.length === 0) {
        showToast(`No orders found to print labels for ${dateToPrint || 'this date'}.`);
        return;
      }

      const allLabelsHtml = ordersToPrint.map((order, idx) => {
        const isLast = idx === ordersToPrint.length - 1;
        return `
          <div class="box-sticker-page" style="max-width: 580px; margin: 0 auto;">
            ${generateShippingLabelHtml(order)}
            ${!isLast ? '<div class="label-page-break" style="page-break-after: always; break-after: page; height: 1px; visibility: hidden; margin-bottom: 24px;"></div>' : ''}
          </div>
        `;
      }).join("");

      const printContainer = document.getElementById("print-container");
      printContainer.innerHTML = allLabelsHtml;
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    // Download All Labels for a Date as Offline HTML File
    async function downloadDateLabelsFile(targetDate) {
      const dateToPrint = targetDate || (CURRENT_DATE_FILTER !== 'all' ? CURRENT_DATE_FILTER : 'all');
      let ordersToPrint = [];

      try {
        showToast(`Preparing offline labels for ${dateToPrint}...`);
        const res = await fetch(`/api/orders?limit=500&date=${encodeURIComponent(dateToPrint)}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            ordersToPrint = data.orders;
          }
        }
      } catch (e) {}

      if (ordersToPrint.length === 0) ordersToPrint = ALL_ORDERS;
      if (ordersToPrint.length === 0) {
        showToast("No orders found for this date.");
        return;
      }

      const labelsContent = ordersToPrint.map((order, idx) => {
        return `
          <div style="page-break-after: always; break-after: page; margin-bottom: 30px;">
            ${generateShippingLabelHtml(order)}
          </div>
        `;
      }).join("");

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chinnodu Foods - Shipping Labels (${dateToPrint})</title>
  <style>
    @page { size: 4in 6in; margin: 0.2in; }
    body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 12px; }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
    }
    .no-print-bar {
      background: #4A0B18; color: #fff; padding: 12px 20px; margin-bottom: 20px;
      border-radius: 8px; display: flex; justify-content: space-between; align-items: center;
      font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .btn-print-offline {
      background: #C99726; color: #000; border: none; padding: 8px 18px;
      font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="no-print no-print-bar">
    <div>
      <strong>CHINNODU FOODS — COURIER SHIPPING LABELS</strong> | Date: ${dateToPrint} (${ordersToPrint.length} Orders)
    </div>
    <button class="btn-print-offline" onclick="window.print()">🖨️ Print All Labels (PDF / 4x6)</button>
  </div>
  ${labelsContent}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chinnodu-labels-${dateToPrint}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${ordersToPrint.length} labels for ${dateToPrint}`);
    }

    // Print Courier Dispatch Manifest Sheet for a Date
    async function printDateDispatchSheet(targetDate) {
      const dateToPrint = targetDate || (CURRENT_DATE_FILTER !== 'all' ? CURRENT_DATE_FILTER : 'All Dates');
      let ordersToPrint = [];

      if (dateToPrint !== 'All Dates') {
        try {
          const res = await fetch(`/api/orders?limit=500&date=${encodeURIComponent(dateToPrint)}`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.orders)) ordersToPrint = data.orders;
          }
        } catch (e) {}
      }

      if (dateToPrint === 'All Dates' || dateToPrint === 'all') {
        if (ordersToPrint.length === 0) ordersToPrint = ALL_ORDERS;
      }
      if (ordersToPrint.length === 0) {
        showToast(`No orders available to generate manifest for ${dateToPrint}.`);
        return;
      }

      const totalRevenue = ordersToPrint.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0);
      const totalPacks = ordersToPrint.reduce((s, o) => s + (o.items || []).reduce((is, it) => is + (Number(it.qty) || 1), 0), 0);

      const manifestHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:15px;">
            <div>
              <h2 style="margin:0; font-size:22px; font-weight:900;">CHINNODU FOODS — COURIER DISPATCH MANIFEST</h2>
              <div style="font-size:12px; margin-top:3px;">Bhimavaram / Kakinada, AP | Phone: +91 73829 14229 / +91 96766 98427</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; font-weight:bold;">Date: ${dateToPrint}</div>
              <div style="font-size:12px;">Total Shipments: <strong>${ordersToPrint.length}</strong> | Total Packs: <strong>${totalPacks}</strong></div>
              <div style="font-size:12px;">Prepaid Value: <strong>₹${totalRevenue.toLocaleString('en-IN')}</strong></div>
            </div>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px;">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="border:1px solid #000; padding:6px 4px; text-align:center;">#</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:left;">Order ID</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:left;">Consignee &amp; Phone</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:left;">Destination &amp; PIN</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:left;">Contents</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:center;">Amount</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:left;">Tracking / AWB</th>
                <th style="border:1px solid #000; padding:6px 6px; text-align:center;">Sign / Pickup</th>
              </tr>
            </thead>
            <tbody>
              ${ordersToPrint.map((o, idx) => {
                const c = o.customer || {};
                const tr = o.tracking || {};
                const itemsStr = (o.items || []).map(i => `${i.name} x${i.qty}`).join(', ');
                return `
                  <tr>
                    <td style="border:1px solid #000; padding:6px 4px; text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #000; padding:6px 6px; font-weight:bold;">#${o.id}</td>
                    <td style="border:1px solid #000; padding:6px 6px;">
                      <strong>${c.name || ''}</strong><br>
                      📞 ${c.phone || ''}
                    </td>
                    <td style="border:1px solid #000; padding:6px 6px;">
                      ${c.city || ''}, ${c.state || ''}<br>
                      <strong>PIN: ${c.pincode || ''}</strong>
                    </td>
                    <td style="border:1px solid #000; padding:6px 6px;">${itemsStr}</td>
                    <td style="border:1px solid #000; padding:6px 6px; text-align:center;">₹${o.grandTotal} (Paid)</td>
                    <td style="border:1px solid #000; padding:6px 6px; font-family:monospace;">${tr.trackingId || '-'}</td>
                    <td style="border:1px solid #000; padding:6px 6px; text-align:center;">[ &nbsp; ]</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; margin-top:30px; font-size:12px;">
            <div>
              <strong>Dispatch Officer:</strong> Somesh Adigarla<br>
              Signature: __________________________
            </div>
            <div>
              <strong>Courier Pickup Executive:</strong> __________________________<br>
              Partner / Signature: __________________________
            </div>
          </div>
        </div>
      `;

      const printContainer = document.getElementById("print-container");
      printContainer.innerHTML = manifestHtml;
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    // Export Orders CSV for Selected Date
    function exportDateOrdersCSV(targetDate) {
      const dateToExport = targetDate || CURRENT_DATE_FILTER;
      window.location.href = `/api/orders/export?date=${encodeURIComponent(dateToExport)}`;
    }

    // =========================================================================
    // CUSTOMER PROFILE & ORDER HISTORY (PREVIOUS DATES) CONTROLLER
    // =========================================================================
    async function openCustomerModal(orderId, phone, name) {
      ACTIVE_CUSTOMER_ORDER_ID = orderId;
      const modal = document.getElementById("customer-profile-modal");
      if (!modal) return;

      modal.classList.add("active");

      // Find local order first
      let order = ALL_ORDERS.find(o => o.id === orderId);
      let custPhone = phone ? decodeURIComponent(phone) : (order?.customer?.phone || '');
      let custName = name ? decodeURIComponent(name) : (order?.customer?.name || '');

      // Set initial loading state
      document.getElementById("cust-modal-name").textContent = custName || "Loading Customer...";
      document.getElementById("cust-modal-phone").textContent = `📞 ${custPhone || '--'}`;
      document.getElementById("cust-modal-avatar").textContent = (custName || "C").charAt(0).toUpperCase();
      document.getElementById("cust-modal-address-summary").innerHTML = `<span>⏳ Fetching customer history across previous dates...</span>`;

      try {
        const queryParams = new URLSearchParams();
        if (custPhone) queryParams.append("phone", custPhone);
        if (custName) queryParams.append("name", custName);
        if (orderId) queryParams.append("orderId", orderId);

        const res = await fetch(`/api/orders/customer?${queryParams.toString()}`, { credentials: "include" });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            ACTIVE_CUSTOMER_HISTORY = result;
            renderCustomerModalContent(orderId);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching customer history:", err);
      }

      // Fallback to local order data if API was unreachable
      renderCustomerModalFallback(order);
    }

    function closeCustomerModal() {
      const modal = document.getElementById("customer-profile-modal");
      if (modal) modal.classList.remove("active");
      ACTIVE_CUSTOMER_HISTORY = null;
      ACTIVE_CUSTOMER_ORDER_ID = null;
    }

    function switchCustomerModalTab(tab) {
      const btnCurrent = document.getElementById("btn-cust-tab-current");
      const btnHistory = document.getElementById("btn-cust-tab-history");
      const panelCurrent = document.getElementById("cust-tab-content-current");
      const panelHistory = document.getElementById("cust-tab-content-history");

      if (tab === 'current') {
        if (btnCurrent) btnCurrent.classList.add("active");
        if (btnHistory) btnHistory.classList.remove("active");
        if (panelCurrent) panelCurrent.style.display = "block";
        if (panelHistory) panelHistory.style.display = "none";
      } else {
        if (btnCurrent) btnCurrent.classList.remove("active");
        if (btnHistory) btnHistory.classList.add("active");
        if (panelCurrent) panelCurrent.style.display = "none";
        if (panelHistory) panelHistory.style.display = "block";
      }
    }

    function selectCustomerOrder(orderId) {
      ACTIVE_CUSTOMER_ORDER_ID = orderId;
      renderCustomerModalContent(orderId);
      switchCustomerModalTab('current');
    }

    function renderCustomerModalContent(selectedOrderId) {
      if (!ACTIVE_CUSTOMER_HISTORY) return;
      const { customer, metrics, orders = [] } = ACTIVE_CUSTOMER_HISTORY;

      // Identify active order
      const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0] || {};
      const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');

      // Header & Profile Info
      document.getElementById("cust-modal-name").textContent = customer.name || 'Valued Customer';
      document.getElementById("cust-modal-phone").textContent = `📞 ${customer.phone || 'N/A'}`;
      document.getElementById("cust-modal-avatar").textContent = (customer.name || 'C').charAt(0).toUpperCase();

      const repeatBadge = document.getElementById("cust-modal-repeat-badge");
      if (repeatBadge) {
        if (orders.length > 1) {
          repeatBadge.textContent = `⭐ Repeat Buyer (${orders.length} Orders across ${metrics.datesCount || 1} Dates)`;
          repeatBadge.style.background = "#DCFCE7";
          repeatBadge.style.color = "#15803D";
        } else {
          repeatBadge.textContent = `🌱 New Customer (1 Order)`;
          repeatBadge.style.background = "#EFF6FF";
          repeatBadge.style.color = "#1D4ED8";
        }
      }

      // Address Summary
      const addrSummary = document.getElementById("cust-modal-address-summary");
      if (addrSummary) {
        const fullAddr = [customer.address, customer.city, customer.state, customer.pincode ? `PIN: ${customer.pincode}` : ''].filter(Boolean).join(", ");
        addrSummary.innerHTML = `📍 <strong>Delivery Address:</strong> ${escapeHtml(fullAddr || 'Not specified')}`;
      }

      // Contacts bar buttons
      const contactLinks = document.getElementById("cust-modal-contact-links");
      if (contactLinks) {
        contactLinks.innerHTML = `
          ${cleanPhone ? `
            <a href="https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}" target="_blank" class="btn-cust-wa" style="padding:4px 10px; font-size:0.8rem;" title="Chat directly on WhatsApp">
              <span>💬 WhatsApp</span>
            </a>
            <a href="tel:${customer.phone}" class="btn-cust-call" style="padding:4px 10px; font-size:0.8rem;" title="Call Customer">
              <span>📞 Call</span>
            </a>
          ` : ''}
          <button type="button" class="btn-print-slip" onclick="printShippingLabel('${activeOrder.id}')" style="background:#FFFBEB; border-color:#F59E0B; color:#92400E; padding:4px 10px; font-size:0.8rem; font-weight:700;" title="Print Shipping Sticker for active order">
            <span>🏷️ Print Box Sticker</span>
          </button>
        `;
      }

      // Metrics Grid
      document.getElementById("cust-stat-orders").textContent = metrics.totalOrders || orders.length;
      document.getElementById("cust-stat-spend").textContent = `₹${(metrics.totalSpend || 0).toLocaleString('en-IN')}`;
      document.getElementById("cust-stat-avg").textContent = `₹${(metrics.avgOrderValue || 0).toLocaleString('en-IN')}`;
      document.getElementById("cust-stat-dates-count").textContent = metrics.datesCount || (metrics.dates || []).length || 1;

      // History Tab Count
      document.getElementById("cust-tab-history-count").textContent = orders.length;

      // Render Active Order Panel (Tab 1)
      const currentContainer = document.getElementById("cust-current-order-details");
      if (currentContainer && activeOrder && activeOrder.id) {
        const items = activeOrder.items || [];
        const orderDateStr = activeOrder.createdAt ? new Date(activeOrder.createdAt).toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'N/A';

        currentContainer.innerHTML = `
          <div style="background:#FAF6F0; border:1px solid #EADBCC; border-radius:12px; padding:1.15rem; margin-bottom:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem; border-bottom:1px solid #EADBCC; padding-bottom:0.65rem;">
              <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                <span class="order-id-badge" style="font-size:1rem; padding:4px 10px;">#${activeOrder.id}</span>
                <span style="font-size:0.85rem; color:var(--text-muted);">📅 ${orderDateStr}</span>
                <span class="status-pill status-${activeOrder.status}">● ${formatStatusName(activeOrder.status)}</span>
                <span style="font-size:0.8rem; font-weight:700; color:#059669; background:#DCFCE7; padding:2px 8px; border-radius:4px; border:1px solid #A7F3D0;">⚡ Prepaid UPI</span>
                ${activeOrder.paymentReference ? `
                  <span style="font-size:0.8rem; font-family:monospace; font-weight:700; color:#1E40AF; background:#DBEAFE; padding:2px 8px; border-radius:4px; border:1px solid #93C5FD;">
                    UTR: ${escapeHtml(activeOrder.paymentReference)}
                  </span>
                ` : ''}
              </div>

              <!-- Quick Print Actions for This Order -->
              <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                <button class="btn-print-slip" onclick="printShippingLabel('${activeOrder.id}')" title="Print Courier Sticker (4x6)" style="background:#FFFBEB; border-color:#F59E0B; color:#92400E; font-weight:700;">
                  <span>🏷️ Box Sticker</span>
                </button>
                <button class="btn-print-slip" onclick="downloadSingleLabelHtml('${activeOrder.id}')" title="Save offline label file" style="background:#FDF2F8; border-color:#F472B6; color:#9D174D; font-weight:700;">
                  <span>💾 Save Label</span>
                </button>
                <button class="btn-print-slip" onclick="printTaxInvoice('${activeOrder.id}')" title="Print Tax Invoice / Bill" style="background:#F0FDF4; border-color:#86EFAC; color:#166534; font-weight:700;">
                  <span>🧾 Invoice</span>
                </button>
                <button class="btn-print-slip" onclick="printPackingSlip('${activeOrder.id}')" title="Print Packing Slip">
                  <span>🖨️ Slip</span>
                </button>
              </div>
            </div>

            <!-- Items Table -->
            <div style="margin-bottom:0.85rem;">
              <table class="items-table" style="background:#fff; border-radius:8px; overflow:hidden;">
                <thead>
                  <tr>
                    <th>Item &amp; Pack Size</th>
                    <th style="text-align:center;">Qty</th>
                    <th style="text-align:right;">Unit Price</th>
                    <th style="text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(it => `
                    <tr>
                      <td>
                        <strong>${escapeHtml(it.name)}</strong>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(it.weight || '')}</div>
                      </td>
                      <td style="text-align:center;">${it.qty || 1}</td>
                      <td style="text-align:right;">₹${it.unitPrice || 0}</td>
                      <td style="text-align:right;"><strong>₹${(it.unitPrice || 0) * (it.qty || 1)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Financial Summary Rows -->
            <div style="display:flex; justify-content:flex-end;">
              <div style="width:280px; font-size:0.88rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span>Items Subtotal:</span>
                  <span>₹${activeOrder.subtotal || 0}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span>Delivery Charges:</span>
                  <span style="color:${activeOrder.shipping === 0 ? '#059669' : '#000'}; font-weight:700;">${activeOrder.shipping === 0 ? 'FREE' : '₹' + activeOrder.shipping}</span>
                </div>
                ${activeOrder.discount ? `
                  <div style="display:flex; justify-content:space-between; margin-bottom:3px; color:#15803D;">
                    <span>Discount:</span>
                    <span>-₹${activeOrder.discount}</span>
                  </div>
                ` : ''}
                <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1.5px solid #D6C7B7; font-weight:800; font-size:1.05rem; color:var(--primary-maroon);">
                  <span>Grand Total (Paid):</span>
                  <span>₹${activeOrder.grandTotal || 0}</span>
                </div>
              </div>
            </div>

            <!-- Tracking & Status Strip -->
            <div style="margin-top:0.85rem; padding-top:0.75rem; border-top:1px dashed #D6C7B7; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div style="font-size:0.85rem;">
                <span>Courier: <strong>${activeOrder.tracking?.courier || 'India Post (Speed Post)'}</strong></span>
                ${activeOrder.tracking?.trackingId ? ` • <span>Tracking ID: <code style="font-size:0.9rem; color:#1E40AF;">${escapeHtml(activeOrder.tracking.trackingId)}</code></span>` : ''}
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">Quick Status Update:</span>
                <select class="input-admin" style="padding:4px 8px; font-size:0.82rem; font-weight:700;" onchange="updateOrderStatus('${activeOrder.id}', this.value)">
                  <option value="received" ${activeOrder.status === 'received' ? 'selected' : ''}>🔔 Received</option>
                  <option value="confirmed" ${activeOrder.status === 'confirmed' ? 'selected' : ''}>👍 Confirmed</option>
                  <option value="packed" ${activeOrder.status === 'packed' ? 'selected' : ''}>🎁 Packed</option>
                  <option value="shipped" ${activeOrder.status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
                  <option value="delivered" ${activeOrder.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                </select>
              </div>
            </div>
          </div>
        `;
      }

      // Render Complete Orders History Across Previous Dates (Tab 2)
      const historyContainer = document.getElementById("cust-history-list-container");
      if (historyContainer) {
        if (orders.length === 0) {
          historyContainer.innerHTML = `
            <div style="text-align:center; padding:2rem; color:var(--text-muted);">
              No past orders found for this customer.
            </div>
          `;
        } else {
          historyContainer.innerHTML = orders.map((o, idx) => {
            const isCurrentlySelected = o.id === activeOrder.id;
            const pastDateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Unknown date';

            const itemsStr = (o.items || []).map(i => `${i.name} (${i.weight || 'Std'}) x${i.qty}`).join(', ');

            return `
              <div class="cust-history-card" style="${isCurrentlySelected ? 'border: 2px solid var(--accent-gold); background: #FFFDF9;' : ''}">
                <div class="cust-history-card-header">
                  <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                    <span class="order-id-badge">#${o.id}</span>
                    <span style="font-weight:700; font-size:0.85rem; color:#4A0B18;">📅 ${pastDateStr}</span>
                    <span class="status-pill status-${o.status}">● ${formatStatusName(o.status)}</span>
                    ${isCurrentlySelected ? '<span style="font-size:0.75rem; background:#FEF3C7; color:#B45309; padding:2px 8px; border-radius:999px; font-weight:800;">ACTIVE VIEW</span>' : ''}
                  </div>
                  <div style="font-weight:800; font-size:1.1rem; color:var(--primary-maroon);">
                    ₹${(o.grandTotal || 0).toLocaleString('en-IN')} <span style="font-size:0.75rem; font-weight:600; color:#059669;">(Prepaid)</span>
                  </div>
                </div>

                <div style="font-size:0.85rem; color:#333; margin-bottom:0.5rem; line-height:1.4;">
                  <strong>Items Ordered:</strong> ${escapeHtml(itemsStr || 'Delicacies')}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem; padding-top:0.4rem; border-top:1px dashed #eee;">
                  <div style="font-size:0.8rem; color:var(--text-muted);">
                    ${o.paymentReference ? `UTR: <strong style="font-family:monospace; color:#1E40AF;">${escapeHtml(o.paymentReference)}</strong>` : 'Prepaid UPI'}
                    ${o.tracking?.trackingId ? ` • AWB: <code>${escapeHtml(o.tracking.trackingId)}</code>` : ''}
                  </div>
                  <div style="display:flex; gap:0.35rem; align-items:center;">
                    ${!isCurrentlySelected ? `
                      <button type="button" class="btn-print-slip" onclick="selectCustomerOrder('${o.id}')" style="background:#EEF2FF; border-color:#818CF8; color:#3730A3; font-weight:700;" title="View full details of this previous order">
                        <span>👁️ View Order Details</span>
                      </button>
                    ` : ''}
                    <button type="button" class="btn-print-slip" onclick="printShippingLabel('${o.id}')" title="Print Shipping Label for this order" style="background:#FFFBEB; border-color:#F59E0B; color:#92400E; font-weight:700;">
                      <span>🏷️ Sticker</span>
                    </button>
                    <button type="button" class="btn-print-slip" onclick="downloadSingleLabelHtml('${o.id}')" title="Download standalone label file" style="background:#FDF2F8; border-color:#F472B6; color:#9D174D; font-weight:700;">
                      <span>💾 Save Label</span>
                    </button>
                    <button type="button" class="btn-print-slip" onclick="printTaxInvoice('${o.id}')" title="Print Official Tax Invoice" style="background:#F0FDF4; border-color:#86EFAC; color:#166534; font-weight:700;">
                      <span>🧾 Invoice</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }

    function renderCustomerModalFallback(order) {
      if (!order) return;
      ACTIVE_CUSTOMER_HISTORY = {
        customer: order.customer || {},
        metrics: {
          totalOrders: 1,
          totalSpend: order.grandTotal || 0,
          avgOrderValue: order.grandTotal || 0,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          datesCount: 1,
          dates: [(order.createdAt || '').slice(0, 10)]
        },
        orders: [order]
      };
      renderCustomerModalContent(order.id);
    }

    // Official Retail Tax Invoice (with words, storage guidelines, authorized signature)
    function printTaxInvoice(orderId) {
      const order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order) return;
      const cust = order.customer || {};
      const items = order.items || [];
      const tracking = order.tracking || {};
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const invoiceNo = `INV-${order.id}`;
      const amountWords = numberToWordsINR(order.grandTotal);

      const invoiceHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 720px; margin: 0 auto; border: 1.5px solid #4A0B18; padding: 24px; background: #fff; color: #24140E; box-sizing: border-box;">
          
          <!-- INVOICE HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4A0B18; padding-bottom: 14px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 26px; font-weight: 900; color: #4A0B18; letter-spacing: 0.5px;">CHINNODU FOODS</div>
              <div style="font-size: 12px; font-weight: 700; color: #C99726; text-transform: uppercase;">Authentic Homemade Andhra Pickles &amp; Sweets</div>
              <div style="font-size: 11px; color: #555; margin-top: 4px; line-height: 1.4;">
                Main Road, Bhimavaram, West Godavari Dist., Andhra Pradesh - 534201<br>
                Phone: +91 73829 14229 / +91 96766 98427 | Web: chinnodufoods.com
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 20px; font-weight: 900; color: #4A0B18; text-transform: uppercase; letter-spacing: 1px;">TAX INVOICE</div>
              <div style="font-size: 12px; font-weight: 700; color: #333; margin-top: 4px;">Invoice No: <strong>${invoiceNo}</strong></div>
              <div style="font-size: 12px; color: #555;">Date: <strong>${orderDate}</strong></div>
              <div style="font-size: 12px; color: #555;">Order ID: <strong>#${order.id}</strong></div>
            </div>
          </div>

          <!-- BILL TO & PAYMENT SUMMARY -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; font-size: 12px; line-height: 1.45;">
            <div style="background: #FDFBF9; border: 1px solid #E5D5C5; padding: 12px; border-radius: 6px;">
              <div style="font-weight: 800; color: #4A0B18; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #E5D5C5; padding-bottom: 3px;">
                Billed &amp; Shipped To:
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #000;">${cust.name || 'Valued Customer'}</div>
              <div>Phone: <strong>${cust.phone || 'N/A'}</strong></div>
              <div style="margin-top: 4px;">${cust.address || ''}</div>
              <div>${cust.city || ''}, ${cust.state || ''} - <strong>PIN: ${cust.pincode || ''}</strong></div>
            </div>

            <div style="background: #FDFBF9; border: 1px solid #E5D5C5; padding: 12px; border-radius: 6px;">
              <div style="font-weight: 800; color: #4A0B18; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #E5D5C5; padding-bottom: 3px;">
                Payment &amp; Dispatch Status:
              </div>
              <div>Payment Method: <strong>Prepaid UPI (Online)</strong></div>
              <div>Payment State: <strong style="color:#059669;">PAID IN FULL</strong></div>
              <div>UPI Reference / UTR: <strong style="font-family:monospace; color:#1E40AF;">${order.paymentReference || 'VERIFIED'}</strong></div>
              <div style="margin-top: 4px;">Courier Partner: <strong>${tracking.courier || 'Express Courier'}</strong></div>
              <div>Tracking ID: <strong>${tracking.trackingId || 'Generated upon dispatch'}</strong></div>
            </div>
          </div>

          <!-- ITEMS TABLE -->
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
            <thead>
              <tr style="background: #4A0B18; color: #FFFFFF;">
                <th style="padding: 8px 10px; text-align: center; width: 40px;">#</th>
                <th style="padding: 8px 10px; text-align: left;">Item Description &amp; Recipe</th>
                <th style="padding: 8px 10px; text-align: center; width: 80px;">Pack Size</th>
                <th style="padding: 8px 10px; text-align: center; width: 50px;">Qty</th>
                <th style="padding: 8px 10px; text-align: right; width: 90px;">Rate (₹)</th>
                <th style="padding: 8px 10px; text-align: right; width: 90px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr style="border-bottom: 1px solid #E5D5C5; ${idx % 2 === 1 ? 'background: #FAF7F2;' : ''}">
                  <td style="padding: 8px 10px; text-align: center;">${idx + 1}</td>
                  <td style="padding: 8px 10px;">
                    <strong>${item.name}</strong>
                    ${item.teluguName ? `<span style="color:#777; font-size:11px;"> (${item.teluguName})</span>` : ''}
                  </td>
                  <td style="padding: 8px 10px; text-align: center; font-weight: 600;">${item.weight || 'Standard'}</td>
                  <td style="padding: 8px 10px; text-align: center; font-weight: 700;">${item.qty}</td>
                  <td style="padding: 8px 10px; text-align: right;">₹${item.unitPrice || 0}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: 700;">₹${(item.unitPrice || 0) * (item.qty || 1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- TOTALS & AMOUNT IN WORDS -->
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-bottom: 20px;">
            <div style="font-size: 11.5px; line-height: 1.5; color: #444; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 12px; border-radius: 6px;">
              <div style="font-weight: 800; color: #1E293B; margin-bottom: 2px;">Amount in Words:</div>
              <div style="font-size: 13px; font-weight: 800; color: #4A0B18;">${amountWords}</div>
              <div style="margin-top: 8px; font-size: 10.5px; color: #64748B;">
                * 100% Homemade delicacy prepared with pure wood-pressed groundnut/sesame oils and authentic cow ghee. Zero chemical preservatives.
              </div>
            </div>

            <div style="font-size: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #E5D5C5;">
                <span>Items Subtotal:</span>
                <span>₹${order.subtotal || order.grandTotal}</span>
              </div>
              ${order.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #E5D5C5; color: #059669;">
                  <span>Coupon Discount:</span>
                  <span>-₹${order.discount}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #E5D5C5;">
                <span>Delivery Charges:</span>
                <span>
                  ${order.shipping === 0 ? '<strong style="color:#059669;">FREE</strong>' : `₹${order.shipping}`}
                  <button type="button" onclick="editOrderDeliveryCharge('${order.id}', ${order.shipping || 0})" style="background:none; border:none; color:var(--primary-maroon); font-size:0.75rem; text-decoration:underline; cursor:pointer; margin-left:6px;" title="Click to edit delivery charge for this order">✏️ Edit</button>
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; font-weight: 900; color: #4A0B18; border-top: 2px solid #4A0B18;">
                <span>Grand Total:</span>
                <span>₹${order.grandTotal}</span>
              </div>
            </div>
          </div>

          <!-- STORAGE GUIDELINES & SIGNATURE -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px solid #4A0B18; padding-top: 14px; font-size: 11px;">
            <div style="max-width: 420px; color: #555; line-height: 1.4;">
              <strong>Storage &amp; Consumption Guidelines:</strong><br>
              • Always use a clean, completely dry spoon for pickles.<br>
              • Store pickles in airtight ceramic/glass jars; refrigerate for maximum aroma.<br>
              • Sweets are prepared fresh daily in pure ghee — best consumed within 30 days.
            </div>
            <div style="text-align: center; min-width: 180px;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; font-weight: 700; color: #4A0B18; margin-bottom: 25px;">
                Somesh Adigarla
              </div>
              <div style="border-top: 1px solid #333; padding-top: 4px; font-size: 11px; font-weight: 700;">
                Authorized Signatory<br>
                <span style="font-weight: normal; color: #666;">Chinnodu Foods</span>
              </div>
            </div>
          </div>

        </div>
      `;

      const printContainer = document.getElementById("print-container");
      printContainer.innerHTML = invoiceHtml;
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    function printPackingSlip(orderId) {
      const order = ALL_ORDERS.find(o => o.id === orderId);
      if (!order) return;

      const cust = order.customer || {};
      const items = order.items || [];
      const tracking = order.tracking || {};

      const printHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 20px;">
          <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <h1 style="margin: 0; font-size: 24px; color: #6B1426;">CHINNODU FOODS</h1>
            <p style="margin: 4px 0; font-size: 13px;">Authentic Homemade Andhra Pickles & Traditional Sweets</p>
            <p style="margin: 2px 0; font-size: 12px;">Website: chinnodufoods.com | Ph: +91 73829 14229 / 78930 06417</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
            <div>
              <strong>ORDER ID:</strong> #${order.id}<br>
              <strong>DATE:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}<br>
              <strong>PAYMENT:</strong> PREPAID UPI (PAID)${order.paymentReference ? `<br><strong>UTR / REF:</strong> ${order.paymentReference}` : ''}
            </div>
            <div style="text-align: right;">
              <strong>COURIER:</strong> ${tracking.courier || 'Pending'}<br>
              <strong>TRACKING ID:</strong> ${tracking.trackingId || 'N/A'}
            </div>
          </div>

          <div style="background: #f5f5f5; padding: 10px; border: 1px solid #ccc; margin-bottom: 15px; font-size: 13px;">
            <strong style="text-decoration: underline;">DELIVERY ADDRESS (CONSIGNEE):</strong><br>
            <strong>${cust.name}</strong><br>
            Phone: <strong>${cust.phone}</strong><br>
            ${cust.address}, ${cust.city}, ${cust.state} - <strong>PIN: ${cust.pincode}</strong>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 15px;">
            <thead>
              <tr style="background: #eee;">
                <th style="border: 1px solid #000; padding: 6px; text-align: left;">Item Description</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center;">Pack</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center;">Qty</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px;">${item.name}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.weight || ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.qty}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: right;">₹${(item.unitPrice || 0) * (item.qty || 1)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background: #fafafa;">
                <td colspan="3" style="border: 1px solid #000; padding: 6px; text-align: right;">GRAND TOTAL:</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">₹${order.grandTotal}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 11px; text-align: center; color: #555; border-top: 1px dashed #999; padding-top: 8px;">
            Freshly prepared with pure ingredients. Thank you for your support to rural homemakers!
          </div>
        </div>
      `;

      const printContainer = document.getElementById("print-container");
      printContainer.innerHTML = printHtml;
      printContainer.style.display = "block";
      window.print();
      printContainer.style.display = "none";
    }

    async function deleteOrder(orderId) {
      if (!confirm(`Are you sure you want to delete order #${orderId}? This cannot be undone.`)) return;

      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (res.ok) {
          showToast(`Order #${orderId} deleted.`);
          fetchOrders(CURRENT_PAGE);
        }
      } catch (err) {
        showToast("Error deleting order.");
      }
    }

    function exportOrdersToCSV() {
      const queryParams = new URLSearchParams({
        status: CURRENT_ORDER_FILTER,
        search: SEARCH_QUERY
      });
      window.location.href = `/api/orders/export?${queryParams.toString()}`;
      showToast("📥 Exporting orders via ultra-fast streaming CSV...");
    }

    function openNewOrderModal() { document.getElementById("new-order-modal").classList.add("active"); }
    function closeNewOrderModal() { document.getElementById("new-order-modal").classList.remove("active"); }

    async function handleManualOrderSubmit(e) {
      e.preventDefault();
      
      const newOrder = {
        id: `CF-${Math.floor(10000 + Math.random() * 90000)}`,
        customer: {
          name: document.getElementById("manual-name").value.trim(),
          phone: document.getElementById("manual-phone").value.trim(),
          address: document.getElementById("manual-address").value.trim(),
          city: document.getElementById("manual-city").value.trim(),
          state: document.getElementById("manual-state").value.trim(),
          pincode: document.getElementById("manual-pincode").value.trim()
        },
        items: [
          {
            name: document.getElementById("manual-items-text").value.trim(),
            weight: "Custom",
            qty: 1,
            unitPrice: Number(document.getElementById("manual-total").value) || 0
          }
        ],
        subtotal: Number(document.getElementById("manual-total").value) || 0,
        grandTotal: Number(document.getElementById("manual-total").value) || 0,
        paymentMethod: 'upi',
        paymentReference: (document.getElementById("manual-utr")?.value || '').trim(),
        notes: document.getElementById("manual-notes").value.trim()
      };

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newOrder)
        });
        if (res.ok) {
          showToast(`✅ Manual Order #${newOrder.id} created!`);
          closeNewOrderModal();
          document.getElementById("new-order-form").reset();
          fetchOrders(1);
          fetchFinanceData();
        } else {
          showToast("Failed to create manual order.");
        }
      } catch (err) {
        showToast("Error creating manual order.");
      }
    }

    // =========================================================================
    // MONEY & ACCOUNTS DATABASE CONTROLLER
    // =========================================================================
    async function fetchFinanceData() {
      try {
        let sumData, txnData;
        try {
          const [sumRes, txnRes] = await Promise.all([
            fetch("/api/finance/summary", { credentials: "include" }),
            fetch("/api/finance/transactions", { credentials: "include" })
          ]);

          if (sumRes.status === 401 || txnRes.status === 401) {
            showLoginScreen("Session expired. Please log in.");
            return;
          }

          if (sumRes.ok && txnRes.ok) {
            sumData = await sumRes.json();
            txnData = await txnRes.json();
          }
        } catch (netErr) {}

        if (!sumData || !txnData) {
          try {
            const accRes = await fetch("accounts.json");
            if (accRes.ok) {
              const accJson = await accRes.json();
              sumData = { summary: { accounts: accJson.accounts || [] } };
              txnData = { transactions: accJson.transactions || [] };
            }
          } catch (e) {}
        }

        if (sumData && txnData) {
          FINANCE_DATA.summary = sumData.summary || {};
          FINANCE_DATA.accounts = sumData.summary?.accounts || [];
          FINANCE_DATA.transactions = txnData.transactions || [];
        }
      } catch (err) {
        console.error("Error fetching finance data:", err);
        if (!FINANCE_DATA.accounts || FINANCE_DATA.accounts.length === 0) {
          FINANCE_DATA.accounts = [
            { id: "acc_upi", name: "UPI / PhonePe / GPay", identifier: "9676698427-2@ybl", type: "digital_wallet", balance: 811 },
            { id: "acc_bank", name: "Business Current Account", identifier: "SBI - 40289100234 (IFSC: SBIN0001234)", type: "bank", balance: 0 },
            { id: "acc_cash", name: "Kitchen / Store Cash Register", identifier: "Store Cash Register", type: "cash", balance: 0 }
          ];
          FINANCE_DATA.summary = {
            liquidTotal: 811,
            totalIncome: 811,
            totalExpense: 0,
            netProfit: 811,
            accounts: FINANCE_DATA.accounts
          };
          FINANCE_DATA.transactions = [
            { id: "TXN-2649", accountId: "acc_upi", amount: 390, type: "income", category: "Online Order Sale (Prepaid UPI)", date: new Date().toISOString(), reference: "UTR: UTR777888999", description: "Prepaid UPI payment received for order #CF-84754", status: "settled" },
            { id: "TXN-9359", accountId: "acc_upi", amount: 420, type: "income", category: "Online Order Sale (Prepaid UPI)", date: new Date().toISOString(), reference: "UTR: UTR9998887771", description: "Prepaid UPI payment received for order #CF-20725", status: "settled" }
          ];
        }
      }
      renderFinanceDashboard();
    }

    function renderFinanceDashboard() {
      const summary = FINANCE_DATA.summary || {};
      const accounts = FINANCE_DATA.accounts || [];

      const upiAcc = accounts.find(a => a.id === 'acc_upi');
      const bankAcc = accounts.find(a => a.id === 'acc_bank');
      const cashAcc = accounts.find(a => a.id === 'acc_cash');

      document.getElementById("stat-fin-upi").textContent = `₹${(upiAcc?.balance || 0).toLocaleString('en-IN')}`;
      document.getElementById("stat-fin-bank").textContent = `₹${(bankAcc?.balance || 0).toLocaleString('en-IN')}`;
      document.getElementById("stat-fin-cash").textContent = `₹${(cashAcc?.balance || 0).toLocaleString('en-IN')}`;
      document.getElementById("stat-fin-liquid").textContent = `₹${(summary.liquidTotal || 0).toLocaleString('en-IN')}`;

      // Render Account Cards
      const container = document.getElementById("accounts-cards-container");
      container.innerHTML = accounts.map(acc => {
        let cardClass = 'upi-card';
        if (acc.id === 'acc_bank') cardClass = 'bank-card';
        if (acc.id === 'acc_cash') cardClass = 'cash-card';

        return `
          <div class="account-card-box ${cardClass}">
            <div class="acc-header">
              <div>
                <div class="acc-title">${acc.name}</div>
                <div class="acc-id">${acc.identifier}</div>
              </div>
              <span class="txn-badge" style="background:#F3ECE1;">${acc.type.replace('_', ' ')}</span>
            </div>
            <div class="acc-balance-display">₹${Number(acc.balance || 0).toLocaleString('en-IN')}</div>
            <div class="acc-footer-actions">
              <span style="color:var(--text-muted);">Status: <strong style="color:#059669;">Active</strong></span>
              <button type="button" class="btn-print-slip" style="padding:2px 8px; font-size:0.75rem;" onclick="promptAdjustBalance('${acc.id}', ${acc.balance || 0})">
                ⚙️ Adjust Balance
              </button>
            </div>
          </div>
        `;
      }).join('');

      renderLedgerTable();
    }

    function filterTransactions(type, clickedBtn) {
      CURRENT_TXN_FILTER = type;
      const tabBtns = document.querySelectorAll("#section-finance-view .tab-btn");
      tabBtns.forEach(btn => btn.classList.remove("active"));
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.classList.add("active");
      } else if (window.event && window.event.currentTarget && window.event.currentTarget.classList && window.event.currentTarget.classList.contains("tab-btn")) {
        window.event.currentTarget.classList.add("active");
      } else {
        const targetBtn = Array.from(tabBtns).find(b => (b.getAttribute("onclick") || "").includes(`'${type}'`));
        if (targetBtn) targetBtn.classList.add("active");
        else if (tabBtns[0]) tabBtns[0].classList.add("active");
      }
      renderLedgerTable();
    }

    function renderLedgerTable() {
      const tbody = document.getElementById("ledger-table-body");
      let list = FINANCE_DATA.transactions || [];

      if (CURRENT_TXN_FILTER !== 'all') {
        list = list.filter(t => t.type === CURRENT_TXN_FILTER);
      }

      if (list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">
              No transactions recorded for this filter.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map(t => {
        const dateStr = new Date(t.date).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        let typeBadge = `<span class="txn-badge txn-income">● Inflow</span>`;
        let sign = '+';
        let amountColor = '#059669';

        if (t.type === 'expense') {
          typeBadge = `<span class="txn-badge txn-expense">● Outflow</span>`;
          sign = '-';
          amountColor = '#DC2626';
        } else if (t.type === 'transfer') {
          typeBadge = `<span class="txn-badge txn-transfer">🔄 Transfer</span>`;
          sign = '⇄';
          amountColor = '#4338CA';
        }

        const accName = formatAccountName(t.accountId);

        return `
          <tr>
            <td style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</td>
            <td style="font-family:monospace; font-weight:700;">#${t.id}</td>
            <td>${typeBadge}</td>
            <td><strong>${accName}</strong></td>
            <td><span style="font-weight:600; color:var(--text-main);">${t.category || 'General'}</span></td>
            <td>
              <div>${t.description || ''}</div>
              ${t.reference ? `<div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${t.reference}</div>` : ''}
              ${t.orderId ? `<div style="font-size:0.75rem; color:var(--primary-maroon);">Order: #${t.orderId}</div>` : ''}
            </td>
            <td style="text-align:right; font-weight:800; font-size:0.95rem; color:${amountColor};">
              ${sign}₹${Number(t.amount || 0).toLocaleString('en-IN')}
            </td>
            <td style="text-align:center;">
              <span style="font-size:0.75rem; text-transform:capitalize; color:#059669; font-weight:700;">
                ${t.status || 'settled'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    function formatAccountName(accId) {
      switch (accId) {
        case 'acc_upi': return '📱 UPI Wallet';
        case 'acc_bank': return '🏦 Bank (SBI)';
        case 'acc_cash': return '💵 Cash Box';
        default: return accId;
      }
    }

    function openNewTxnModal() { document.getElementById("new-txn-modal").classList.add("active"); }
    function closeNewTxnModal() { document.getElementById("new-txn-modal").classList.remove("active"); }

    function handleTxnTypeChange() {
      const type = document.getElementById("txn-type").value;
      const destGroup = document.getElementById("transfer-destination-group");
      if (type === 'transfer') {
        destGroup.style.display = 'block';
      } else {
        destGroup.style.display = 'none';
      }
    }

    async function handleTransactionSubmit(e) {
      e.preventDefault();

      const type = document.getElementById("txn-type").value;
      const accountId = document.getElementById("txn-account").value;
      const toAccountId = type === 'transfer' ? document.getElementById("txn-to-account").value : null;
      const category = document.getElementById("txn-category").value;
      const amount = Number(document.getElementById("txn-amount").value);
      const desc = document.getElementById("txn-desc").value.trim();
      const ref = document.getElementById("txn-ref").value.trim();

      if (type === 'transfer' && accountId === toAccountId) {
        showToast("⚠️ Source and Destination accounts cannot be the same!");
        return;
      }

      const txnPayload = {
        type,
        accountId,
        toAccountId,
        category,
        amount,
        description: desc,
        reference: ref
      };

      try {
        const res = await fetch("/api/finance/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(txnPayload)
        });

        if (res.ok) {
          showToast("✅ Transaction recorded successfully!");
          closeNewTxnModal();
          document.getElementById("new-txn-form").reset();
          fetchFinanceData();
        } else {
          showToast("Failed to save transaction");
        }
      } catch (err) {
        showToast("❌ Could not save transaction.");
      }
    }

    async function promptAdjustBalance(accId, currentBal) {
      const newBalStr = prompt(`Enter updated balance for ${formatAccountName(accId)} (Current: ₹${currentBal}):`, currentBal);
      if (newBalStr === null) return;
      const newBal = Number(newBalStr);
      if (isNaN(newBal)) {
        showToast("Invalid number entered!");
        return;
      }

      try {
        const res = await fetch(`/api/finance/accounts/${accId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ balance: newBal })
        });
        if (res.ok) {
          showToast("✅ Account balance updated!");
          fetchFinanceData();
        }
      } catch (err) {
        showToast("❌ Error updating balance.");
      }
    }

    function exportFinanceToCSV() {
      const list = FINANCE_DATA.transactions || [];
      if (list.length === 0) {
        showToast("No financial transactions to export!");
        return;
      }

      let csv = "Transaction ID,Date,Type,Account,Category,Amount,Reference,Description,Status\n";
      list.forEach(t => {
        const row = [
          t.id,
          `"${new Date(t.date).toLocaleString('en-IN')}"`,
          t.type,
          `"${formatAccountName(t.accountId)}"`,
          `"${t.category || ''}"`,
          t.amount,
          `"${(t.reference || '').replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.status
        ];
        csv += row.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Chinnodu_Foods_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      showToast("📥 Financial ledger exported to CSV!");
    }

    // =========================================================================
    // PRODUCTS & STOCK CONTROLLER
    // =========================================================================
    async function fetchAdminProducts() {
      const container = document.getElementById("products-grid-container");
      if (container && (!ALL_PRODUCTS || ALL_PRODUCTS.length === 0)) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
            <div style="margin: 0 auto 1rem; width: 36px; height: 36px; border: 3px solid rgba(139,38,53,0.18); border-top-color: var(--primary-maroon); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="font-weight: 600; color: var(--primary-maroon); margin-bottom: 0.25rem;">Loading Delicacies Catalog...</p>
            <p style="font-size: 0.82rem; margin: 0;">Connecting to in-memory catalog index</p>
          </div>
        `;
      }
      try {
        let res;
        try {
          res = await fetch("/api/products", { credentials: "include" });
        } catch (netErr) {
          try { res = await fetch("products.json"); } catch (e) {}
        }
        if (!res || !res.ok) {
          try { res = await fetch("products.json"); } catch (e) {}
        }
        if (res && res.ok) {
          const data = await res.json();
          const prodList = Array.isArray(data) ? data : (data.products || []);
          if (prodList.length > 0) {
            ALL_PRODUCTS = prodList;
            if (data.stats) {
              updateProductsStats(data.stats);
            } else {
              updateProductsStats({
                total: prodList.length,
                inStock: prodList.filter(p => p.inStock !== false).length,
                outOfStock: prodList.filter(p => p.inStock === false).length,
                categoriesCount: new Set(prodList.map(p => p.category)).size
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        if (!ALL_PRODUCTS || ALL_PRODUCTS.length === 0) {
          ALL_PRODUCTS = [
            { id: "bellam-sunnunda", name: "Bellam Sunnunda", teluguName: "బెల్లం సున్నుండ", category: "sweets", categoryLabel: "Traditional Sweets", diet: "veg", inStock: true, rating: 5.0, reviewsCount: 310, spice: "Pure Ghee & Jaggery", image: "assets/images/bellam-sunnunda.jpg", weights: { "500g": 470, "1kg": 900 }, defaultWeight: "500g" },
            { id: "ragi-laddu", name: "Ragi Laddu", teluguName: "రాగి లడ్డు", category: "sweets", categoryLabel: "Traditional Sweets", diet: "veg", inStock: true, rating: 4.9, reviewsCount: 185, spice: "Nutritious & Sweet", image: "assets/images/ragi-laddu.jpg", weights: { "250g": 230, "500g": 450, "1kg": 920 }, defaultWeight: "500g" },
            { id: "nuvvulu-laddu", name: "Nuvvulu Laddu (Sesame)", teluguName: "నువ్వుల లడ్డు (చిమ్మిలి)", category: "sweets", categoryLabel: "Traditional Sweets", diet: "veg", inStock: true, rating: 4.8, reviewsCount: 140, spice: "Iron-Rich & Sweet", image: "assets/images/nuvvulu-laddu.jpg", weights: { "250g": 210, "500g": 400, "1kg": 800 }, defaultWeight: "500g" },
            { id: "avakaya-pickle", name: "Avakaya Pickle", teluguName: "ఆవకాయ పచ్చడి", category: "pickles", categoryLabel: "Authentic Andhra Pickles", diet: "veg", inStock: true, rating: 5.0, reviewsCount: 420, spice: "Traditional Andhra Fiery", image: "assets/images/avakaya.jpg", weights: { "250g": 180, "500g": 350, "1kg": 680 }, defaultWeight: "500g" },
            { id: "saggubiyyam-chekkalu", name: "Saggubiyyam Chekkalu", teluguName: "సగ్గుబియ్యం చెక్కలు", category: "savouries", categoryLabel: "Crispy Savouries", diet: "veg", inStock: true, rating: 4.9, reviewsCount: 310, spice: "Crispy Herb Cracker", image: "assets/images/saggubiyyam-chekkalu.jpg", weights: { "250g": 160, "500g": 320, "1kg": 640 }, defaultWeight: "250g" },
            { id: "mamidi-tandra", name: "Mamidi Tandra (Mango Jelly)", teluguName: "మామిడి తాండ్ర", category: "tandra", categoryLabel: "Heritage Fruit Jellies", diet: "veg", inStock: true, rating: 5.0, reviewsCount: 290, spice: "Naturally Sweet & Tangy", image: "assets/images/mamidi-tandra.jpg", weights: { "250g": 150, "500g": 290, "1kg": 560 }, defaultWeight: "250g" }
          ];
          updateProductsStats({
            total: ALL_PRODUCTS.length,
            inStock: ALL_PRODUCTS.length,
            outOfStock: 0,
            categoriesCount: 4
          });
        }
      }
      renderProductsGrid();
    }

    function updateProductsStats(stats) {
      PRODUCTS_STATS = stats || PRODUCTS_STATS;
      const elTotal = document.getElementById("stat-prod-total");
      const elInStock = document.getElementById("stat-prod-in-stock");
      const elOutStock = document.getElementById("stat-prod-out-stock");
      const elCats = document.getElementById("stat-prod-categories");
      const elTopBadge = document.getElementById("badge-top-products-count");

      if (elTotal) elTotal.textContent = PRODUCTS_STATS.total || ALL_PRODUCTS.length;
      if (elInStock) elInStock.textContent = PRODUCTS_STATS.inStock || 0;
      if (elOutStock) elOutStock.textContent = PRODUCTS_STATS.outOfStock || 0;
      if (elCats) elCats.textContent = PRODUCTS_STATS.categoriesCount || 4;
      if (elTopBadge) elTopBadge.textContent = PRODUCTS_STATS.total || ALL_PRODUCTS.length;

      // Update category badges
      const counts = { all: ALL_PRODUCTS.length, sweets: 0, savouries: 0, pickles: 0, tandra: 0 };
      ALL_PRODUCTS.forEach(p => {
        if (counts[p.category] !== undefined) counts[p.category]++;
      });

      for (const [cat, cnt] of Object.entries(counts)) {
        const badge = document.getElementById(`prod-badge-${cat}`);
        if (badge) badge.textContent = cnt;
      }
    }

    function filterProductsCategory(cat, clickedBtn) {
      CURRENT_PRODUCT_CAT_FILTER = cat;
      const tabs = document.querySelectorAll("#prod-category-tabs .tab-btn");
      tabs.forEach(t => t.classList.remove("active"));
      if (clickedBtn && clickedBtn.classList) {
        clickedBtn.classList.add("active");
      } else if (window.event && window.event.currentTarget && window.event.currentTarget.classList && window.event.currentTarget.classList.contains("tab-btn")) {
        window.event.currentTarget.classList.add("active");
      } else {
        const targetTab = Array.from(tabs).find(t => (t.getAttribute("onclick") || "").includes(`'${cat}'`));
        if (targetTab) targetTab.classList.add("active");
        else if (tabs[0]) tabs[0].classList.add("active");
      }
      renderProductsGrid();
    }

    function handleProductStockFilter(val) {
      CURRENT_PRODUCT_STOCK_FILTER = val;
      renderProductsGrid();
    }

    function handleProductSearch() {
      if (PRODUCT_SEARCH_DEBOUNCE) clearTimeout(PRODUCT_SEARCH_DEBOUNCE);
      PRODUCT_SEARCH_DEBOUNCE = setTimeout(() => {
        PRODUCT_SEARCH_QUERY = (document.getElementById("prod-search-input")?.value || "").trim().toLowerCase();
        renderProductsGrid();
      }, 150);
    }

    function renderProductsGrid() {
      const container = document.getElementById("products-grid-container");
      if (!container) return;

      let list = ALL_PRODUCTS;

      // Category filter
      if (CURRENT_PRODUCT_CAT_FILTER !== "all") {
        list = list.filter(p => p.category === CURRENT_PRODUCT_CAT_FILTER);
      }

      // Stock filter
      if (CURRENT_PRODUCT_STOCK_FILTER === "in_stock") {
        list = list.filter(p => Boolean(p.inStock) === true);
      } else if (CURRENT_PRODUCT_STOCK_FILTER === "out_of_stock") {
        list = list.filter(p => Boolean(p.inStock) === false);
      }

      // Search filter
      if (PRODUCT_SEARCH_QUERY) {
        const q = PRODUCT_SEARCH_QUERY;
        list = list.filter(p => {
          const name = (p.name || "").toLowerCase();
          const telugu = p.teluguName || "";
          const desc = (p.description || "").toLowerCase();
          const tag = (p.tag || "").toLowerCase();
          const spice = (p.spice || "").toLowerCase();
          return name.includes(q) || telugu.includes(q) || desc.includes(q) || tag.includes(q) || spice.includes(q);
        });
      }

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-admin-state" style="grid-column: 1 / -1;">
            <div class="empty-admin-icon">🍲</div>
            <h3 style="font-family:var(--font-heading); color:var(--primary-maroon); margin-bottom:0.4rem;">No Delicacies Found</h3>
            <p style="font-size:0.88rem; max-width:400px; margin:0 auto 1.25rem;">
              No items match your active filters or search query. You can add a new delicacy or clear your search.
            </p>
            <button class="btn-admin-action btn-admin-gold" onclick="openNewProductModal()">
              <span>➕ Add New Delicacy</span>
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map(prod => {
        const isInStock = prod.inStock !== false;
        const weights = prod.weights || {};
        const weightKeys = Object.keys(weights);

        return `
          <div class="product-admin-card ${isInStock ? '' : 'out-of-stock'}" id="prod-card-${prod.id}">
            <div>
              <div class="prod-card-header">
                <img src="${prod.image || 'assets/images/brand-logo.jpg'}" alt="${prod.name}" class="prod-card-thumb" onerror="this.src='assets/images/brand-logo.jpg'">
                <div class="prod-card-meta">
                  <h4 class="prod-title">${prod.name}</h4>
                  ${prod.teluguName ? `<div class="prod-telugu">${prod.teluguName}</div>` : ''}
                  
                  <div class="prod-pill-row">
                    <span class="prod-pill prod-pill-cat">${prod.categoryLabel || prod.category}</span>
                    <span class="prod-pill ${prod.diet === 'non-veg' ? 'prod-pill-nonveg' : 'prod-pill-veg'}">
                      ${prod.dietLabel || (prod.diet === 'non-veg' ? '🔴 Non-Veg' : '🟢 Veg')}
                    </span>
                    ${prod.tag ? `<span class="prod-pill prod-pill-tag">✦ ${prod.tag}</span>` : ''}
                  </div>
                  <div class="prod-admin-desc-box" style="margin-top:6px; font-size:0.75rem; line-height:1.35; color:var(--text-muted); background:#FAF7F2; padding:5px 8px; border-radius:6px; border:1px dashed #E5D5C5;">
                    ${prod.description && prod.description.trim() ? `
                      <span><strong>Desc:</strong> ${escapeHtml(prod.description)}</span>
                    ` : `
                      <span style="color:#D97706; font-style:italic;">📝 No description yet • Click Edit to add anytime</span>
                    `}
                  </div>
                </div>
              </div>

              <!-- Interactive Stock Switch Box -->
              <div class="stock-toggle-box ${isInStock ? 'in-stock' : 'out-of-stock'}">
                <span id="stock-label-${prod.id}">
                  ${isInStock ? '🟢 In Stock (Available Online)' : '🔴 Out of Stock / Seasonal'}
                </span>
                <label class="toggle-switch" title="Toggle In-Stock / Out-of-Stock for customers">
                  <input type="checkbox" ${isInStock ? 'checked' : ''} onchange="toggleProductStock('${prod.id}', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Pricing Variants -->
              <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">
                Pack Sizes &amp; Prices:
              </div>
              <div class="prod-prices-grid">
                ${weightKeys.length > 0 ? weightKeys.map(w => `
                  <div class="prod-price-chip">
                    <span>${w}:</span>
                    <strong>₹${weights[w]}</strong>
                  </div>
                `).join('') : '<span style="font-size:0.8rem; color:#888;">No prices configured</span>'}
              </div>

              <!-- Delivery Charge Display Badge -->
              <div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between; background:#FAF3EA; border:1px solid #EBDCCB; padding:5px 10px; border-radius:8px; font-size:0.78rem;">
                <span style="font-weight:700; color:var(--primary-maroon);">🚚 Delivery Charge:</span>
                <strong style="color:${(prod.deliveryCharge || 0) === 0 ? '#15803D' : '#92400E'}; font-size:0.85rem;">
                  ${Number(prod.deliveryCharge || 0) === 0 ? 'FREE DELIVERY' : `₹${prod.deliveryCharge || 40}`}
                </strong>
              </div>

              <!-- Spice / Shelf Life Notes -->
              <div style="font-size:0.78rem; color:var(--text-muted); display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">
                ${prod.spice ? `<span>${prod.spice}</span>` : ''}
                ${prod.shelfLife ? `<span>⏳ ${prod.shelfLife}</span>` : ''}
              </div>
            </div>

            <!-- Card Actions -->
            <div class="prod-card-footer">
              <button type="button" class="btn-edit-prod" onclick="openEditProductModal('${prod.id}')">
                <span>✏️ Edit Recipe &amp; Prices</span>
              </button>
              <button type="button" class="btn-delete-prod" onclick="deleteProductItem('${prod.id}', '${encodeURIComponent(prod.name)}')" title="Remove delicacy">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    // Fast 1-Click Stock Toggle
    async function toggleProductStock(id, newStatus) {
      const prod = ALL_PRODUCTS.find(p => p.id === id);
      if (prod) {
        prod.inStock = newStatus;
        // Optimistic UI update
        const card = document.getElementById(`prod-card-${id}`);
        const label = document.getElementById(`stock-label-${id}`);
        if (card) {
          card.classList.toggle("out-of-stock", !newStatus);
          const box = card.querySelector(".stock-toggle-box");
          if (box) {
            box.className = `stock-toggle-box ${newStatus ? 'in-stock' : 'out-of-stock'}`;
          }
        }
        if (label) {
          label.textContent = newStatus ? '🟢 In Stock (Available Online)' : '🔴 Out of Stock / Seasonal';
        }
      }

      try {
        const res = await fetch(`/api/products/${id}/stock`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ inStock: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.stats) updateProductsStats(data.stats);
          showToast(`⚡ ${prod ? prod.name : 'Delicacy'} is now ${newStatus ? 'IN STOCK' : 'OUT OF STOCK'}`);
        } else {
          showToast("❌ " + (data.error || "Failed to update stock"));
          fetchAdminProducts();
        }
      } catch (err) {
        showToast("❌ Network error updating stock");
        fetchAdminProducts();
      }
    }

    // Category & Dietary Preset Helper Handlers
    function handleAdminCategoryChange(val) {
      const labelInput = document.getElementById("edit-prod-category-label");
      if (!labelInput) return;
      const presetLabels = {
        "pickles": "Homemade Pickles",
        "sweets": "Traditional Sweets",
        "savouries": "Crispy Savouries",
        "tandra": "Authentic Tandra",
        "podis": "Aromatic Podis",
        "ghee": "Pure Desi Ghee & Jaggery"
      };
      if (val === "custom") {
        labelInput.focus();
        labelInput.select();
      } else if (presetLabels[val]) {
        labelInput.value = presetLabels[val];
      }
    }

    function handleAdminDietChange(val) {
      const labelInput = document.getElementById("edit-prod-diet-label");
      if (!labelInput) return;
      if (val === "veg") {
        labelInput.value = "Pure Vegetarian";
      } else if (val === "non-veg") {
        labelInput.value = "Non-Vegetarian";
      } else {
        labelInput.focus();
        labelInput.select();
      }
    }

    function getCategoryPresetLabel(catKey) {
      const presetLabels = {
        "pickles": "Homemade Pickles",
        "sweets": "Traditional Sweets",
        "savouries": "Crispy Savouries",
        "tandra": "Authentic Tandra",
        "podis": "Aromatic Podis",
        "ghee": "Pure Desi Ghee & Jaggery"
      };
      return presetLabels[catKey] || (catKey ? catKey.charAt(0).toUpperCase() + catKey.slice(1) : "Special Delicacies");
    }

    // Modal Helpers for Products
    function openNewProductModal() {
      document.getElementById("product-edit-form").reset();
      document.getElementById("edit-prod-id").value = "";
      document.getElementById("product-modal-title").textContent = "➕ Add New Delicacy";
      document.getElementById("btn-save-product").textContent = "Save Delicacy";

      // Default category & custom category label
      document.getElementById("edit-prod-category").value = "pickles";
      document.getElementById("edit-prod-category-label").value = "Homemade Pickles";

      // Default dietary & custom dietary label
      document.getElementById("edit-prod-diet").value = "veg";
      document.getElementById("edit-prod-diet-label").value = "Pure Vegetarian";

      // Description field is empty and fully available
      document.getElementById("edit-prod-desc").value = "";

      // Reset weights container with standard variants
      const container = document.getElementById("weight-variants-container");
      container.innerHTML = "";
      addWeightVariantRow("250g", "199");
      addWeightVariantRow("500g", "389");
      addWeightVariantRow("1kg", "749");
      document.getElementById("edit-prod-delivery-charge").value = "40";

      // Reset 4K Photo Dropzone
      removeSelectedProductPhoto();

      document.getElementById("product-edit-modal").classList.add("active");
    }

    function openEditProductModal(id) {
      const prod = ALL_PRODUCTS.find(p => p.id === id);
      if (!prod) return;

      document.getElementById("product-edit-form").reset();
      document.getElementById("edit-prod-id").value = prod.id;
      document.getElementById("product-modal-title").textContent = `✏️ Edit: ${prod.name}`;
      document.getElementById("btn-save-product").textContent = "Update Delicacy";

      document.getElementById("edit-prod-name").value = prod.name || "";
      document.getElementById("edit-prod-telugu").value = prod.teluguName || "";

      // Populate Category Selection & Manual Text Field
      const knownCats = ["pickles", "sweets", "savouries", "tandra", "podis", "ghee"];
      const prodCat = (prod.category || "pickles").toLowerCase();
      const catSelect = document.getElementById("edit-prod-category");
      if (knownCats.includes(prodCat)) {
        catSelect.value = prodCat;
      } else {
        catSelect.value = "custom";
      }
      document.getElementById("edit-prod-category-label").value = prod.categoryLabel || getCategoryPresetLabel(prodCat);

      // Populate Dietary Type Selection & Manual Text Field
      const dietSelect = document.getElementById("edit-prod-diet");
      if (prod.diet === "non-veg") {
        dietSelect.value = "non-veg";
      } else if (prod.diet === "veg") {
        dietSelect.value = "veg";
      } else {
        dietSelect.value = "custom";
      }
      document.getElementById("edit-prod-diet-label").value = prod.dietLabel || (prod.diet === "non-veg" ? "Non-Vegetarian" : "Pure Vegetarian");

      document.getElementById("edit-prod-stock").value = String(prod.inStock !== false);
      document.getElementById("edit-prod-tag").value = prod.tag || "";
      document.getElementById("edit-prod-spice").value = prod.spice || "";
      document.getElementById("edit-prod-shelflife").value = prod.shelfLife || "";
      document.getElementById("edit-prod-delivery-charge").value = prod.deliveryCharge !== undefined ? prod.deliveryCharge : 40;
      document.getElementById("edit-prod-image").value = prod.image || "";

      // Description field is always available to add or edit whenever required
      document.getElementById("edit-prod-desc").value = prod.description || "";
      document.getElementById("edit-prod-ingredients").value = prod.ingredients || "";

      // Populate 4K Photo Preview if image exists
      SELECTED_4K_FILE = null;
      SELECTED_4K_BASE64 = null;
      if (prod.image) {
        const idleBox = document.getElementById("dropzone-idle-content");
        const previewBox = document.getElementById("dropzone-preview-content");
        const previewImg = document.getElementById("preview-photo-img");
        const resText = document.getElementById("preview-photo-res");
        const nameText = document.getElementById("preview-photo-name");
        const sizeText = document.getElementById("preview-photo-size");
        const resBadge = document.getElementById("preview-photo-badge");

        if (idleBox) idleBox.style.display = "none";
        if (previewBox) previewBox.style.display = "block";
        if (previewImg) previewImg.src = prod.image;
        if (resText) resText.textContent = "High-Res Studio Photo";
        if (nameText) nameText.textContent = prod.image;
        if (sizeText) sizeText.textContent = "Current Catalog Asset";
        if (resBadge) {
          resBadge.textContent = "📸 ACTIVE PHOTO";
          resBadge.style.background = "#DCFCE7";
          resBadge.style.color = "#15803D";
        }
      } else {
        removeSelectedProductPhoto();
      }

      // Render weight variants
      const container = document.getElementById("weight-variants-container");
      container.innerHTML = "";
      const weights = prod.weights || {};
      const keys = Object.keys(weights);
      if (keys.length > 0) {
        keys.forEach(k => addWeightVariantRow(k, weights[k]));
      } else {
        addWeightVariantRow("500g", "350");
      }

      document.getElementById("product-edit-modal").classList.add("active");
    }

    function closeProductModal() {
      document.getElementById("product-edit-modal").classList.remove("active");
    }

    // =========================================================================
    // 4K ULTRA-HD PHOTO PROCESSING & SUPER-SAMPLING ENGINE
    // =========================================================================
    let SELECTED_4K_FILE = null;
    let SELECTED_4K_BASE64 = null;

    function handleProductPhotoFileSelect(input) {
      if (!input.files || input.files.length === 0) return;
      const file = input.files[0];
      process4KPhotoFile(file);
    }

    function process4KPhotoFile(file) {
      if (!file.type.startsWith("image/")) {
        showToast("⚠️ Please upload a valid image file (JPEG, PNG, WEBP, HEIC)");
        return;
      }

      SELECTED_4K_FILE = file;
      const reader = new FileReader();

      reader.onload = (e) => {
        const rawBase64 = e.target.result;
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          // 4K Ultra-HD Super-Sampling Canvas Pipeline (Max 3840 UHD)
          const canvas = document.createElement("canvas");
          let targetW = w;
          let targetH = h;
          const maxDim = 3840;

          if (targetW > maxDim || targetH > maxDim) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            } else {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }

          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Export at crisp 0.95 high-resolution JPEG
          const optimized4KBase64 = canvas.toDataURL("image/jpeg", 0.95);
          SELECTED_4K_BASE64 = optimized4KBase64;

          // Update Preview Card
          const idleBox = document.getElementById("dropzone-idle-content");
          const previewBox = document.getElementById("dropzone-preview-content");
          const previewImg = document.getElementById("preview-photo-img");
          const resBadge = document.getElementById("preview-photo-badge");
          const resText = document.getElementById("preview-photo-res");
          const nameText = document.getElementById("preview-photo-name");
          const sizeText = document.getElementById("preview-photo-size");

          if (idleBox) idleBox.style.display = "none";
          if (previewBox) previewBox.style.display = "block";
          if (previewImg) previewImg.src = optimized4KBase64;

          if (resText) resText.textContent = `${targetW} × ${targetH} px`;
          if (nameText) nameText.textContent = file.name;

          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          if (sizeText) sizeText.textContent = `${sizeMB} MB • 4K Quality Preserved`;

          if (resBadge) {
            if (targetW >= 3840 || targetH >= 2160) {
              resBadge.textContent = "✨ 4K UHD ULTRA RESOLUTION";
              resBadge.style.background = "#DCFCE7";
              resBadge.style.color = "#15803D";
            } else if (targetW >= 2560) {
              resBadge.textContent = "🌟 2K QHD STUDIO QUALITY";
              resBadge.style.background = "#FEF3C7";
              resBadge.style.color = "#92400E";
            } else {
              resBadge.textContent = "💎 FULL HD 1080p";
              resBadge.style.background = "#EDE9FE";
              resBadge.style.color = "#6D28D9";
            }
          }

          const cleanName = (document.getElementById("edit-prod-name")?.value || file.name.replace(/\.[^/.]+$/, ""))
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
          document.getElementById("edit-prod-image").value = `assets/images/${cleanName}-4k.jpg`;

          showToast(`📸 4K Photo processed: ${targetW}×${targetH}px (${sizeMB} MB)`);
        };
        img.src = rawBase64;
      };

      reader.readAsDataURL(file);
    }

    function removeSelectedProductPhoto() {
      SELECTED_4K_FILE = null;
      SELECTED_4K_BASE64 = null;
      const fileInput = document.getElementById("edit-prod-file-input");
      if (fileInput) fileInput.value = "";

      const idleBox = document.getElementById("dropzone-idle-content");
      const previewBox = document.getElementById("dropzone-preview-content");
      if (idleBox) idleBox.style.display = "flex";
      if (previewBox) previewBox.style.display = "none";

      const imgInput = document.getElementById("edit-prod-image");
      if (imgInput) imgInput.value = "";
    }

    function applySample4KImage() {
      const cat = document.getElementById("edit-prod-category")?.value || "pickles";
      let sample = "assets/images/avakaya-pickle.jpg";
      if (cat === "sweets") sample = "assets/images/bellam-sunnunda.jpg";
      else if (cat === "savouries") sample = "assets/images/chegodilu.jpg";
      else if (cat === "tandra") sample = "assets/images/mango-thandra-bellam.jpg";

      document.getElementById("edit-prod-image").value = sample;
      
      const idleBox = document.getElementById("dropzone-idle-content");
      const previewBox = document.getElementById("dropzone-preview-content");
      const previewImg = document.getElementById("preview-photo-img");
      const resText = document.getElementById("preview-photo-res");
      const resBadge = document.getElementById("preview-photo-badge");

      if (idleBox) idleBox.style.display = "none";
      if (previewBox) previewBox.style.display = "block";
      if (previewImg) previewImg.src = sample;
      if (resText) resText.textContent = "3840 × 2160 px";
      if (resBadge) {
        resBadge.textContent = "✨ 4K UHD PRESET";
        resBadge.style.background = "#DCFCE7";
        resBadge.style.color = "#15803D";
      }

      showToast(`✨ Selected 4K catalog photo: ${sample}`);
    }

    // Drag and Drop listeners
    window.addEventListener("DOMContentLoaded", () => {
      const dropzone = document.getElementById("photo-upload-dropzone");
      if (!dropzone) return;

      ["dragenter", "dragover"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("dragover");
        }, false);
      });

      ["dragleave", "drop"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("dragover");
        }, false);
      });

      dropzone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          process4KPhotoFile(files[0]);
        }
      }, false);
    });

    function addWeightVariantRow(weight = "", price = "") {
      const container = document.getElementById("weight-variants-container");
      if (!container) return;

      const row = document.createElement("div");
      row.className = "weight-variant-row";
      row.innerHTML = `
        <input type="text" class="input-admin var-weight-input" placeholder="Size (e.g. 500g)" value="${weight}" required>
        <div style="display:flex; align-items:center; gap:4px;">
          <span style="font-weight:700; color:var(--primary-maroon);">₹</span>
          <input type="number" min="1" class="input-admin var-price-input" placeholder="Price" value="${price}" required style="width:100%;">
        </div>
        <button type="button" onclick="this.closest('.weight-variant-row').remove()" style="background:#FEE2E2; color:#DC2626; border:1px solid #FCA5A5; border-radius:6px; height:36px; cursor:pointer;" title="Remove size">&times;</button>
      `;
      container.appendChild(row);
    }

    async function handleProductFormSubmit(e) {
      if (e) e.preventDefault();
      const id = document.getElementById("edit-prod-id").value.trim();
      const name = document.getElementById("edit-prod-name").value.trim();
      const teluguName = document.getElementById("edit-prod-telugu").value.trim();
      const categorySelectVal = document.getElementById("edit-prod-category").value;
      const categoryLabel = (document.getElementById("edit-prod-category-label")?.value || "").trim() || "Homemade Pickles";
      const category = categorySelectVal === "custom" 
        ? categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom"
        : categorySelectVal;

      const dietSelectVal = document.getElementById("edit-prod-diet").value;
      const dietLabel = (document.getElementById("edit-prod-diet-label")?.value || "").trim() || (dietSelectVal === "non-veg" ? "Non-Vegetarian" : "Pure Vegetarian");
      const diet = (dietSelectVal === "non-veg" || dietLabel.toLowerCase().includes("non-veg")) ? "non-veg" : "veg";

      const inStock = document.getElementById("edit-prod-stock").value === "true";
      const tag = document.getElementById("edit-prod-tag").value.trim();
      const spice = document.getElementById("edit-prod-spice").value.trim();
      const shelfLife = document.getElementById("edit-prod-shelflife").value.trim();
      let image = document.getElementById("edit-prod-image").value.trim() || "assets/images/brand-logo.jpg";
      const description = (document.getElementById("edit-prod-desc")?.value || "").trim();
      const ingredients = document.getElementById("edit-prod-ingredients").value.trim();

      // Collect weights
      const rows = document.querySelectorAll(".weight-variant-row");
      const weightsObj = {};
      rows.forEach(r => {
        const w = (r.querySelector(".var-weight-input")?.value || "").trim();
        const p = Number(r.querySelector(".var-price-input")?.value) || 0;
        if (w && p > 0) {
          weightsObj[w] = p;
        }
      });

      if (Object.keys(weightsObj).length === 0) {
        showToast("⚠️ Please add at least one weight size and price (e.g. 500g: ₹350)");
        return;
      }

      const defaultWeight = Object.keys(weightsObj)[0] || "500g";

      const btn = document.getElementById("btn-save-product");
      const origText = btn.textContent;
      btn.disabled = true;

      // 4K Photo Upload Step (If new file was selected)
      if (SELECTED_4K_BASE64) {
        btn.textContent = "📸 Saving 4K Photo...";
        try {
          const uploadRes = await fetch("/api/upload-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              filename: SELECTED_4K_FILE ? SELECTED_4K_FILE.name : `${name}.jpg`,
              data: SELECTED_4K_BASE64,
              name: name
            })
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              image = uploadData.url;
              document.getElementById("edit-prod-image").value = uploadData.url;
              showToast(`📸 4K Photo uploaded (${uploadData.sizeFormatted})`);
            }
          }
        } catch (uploadErr) {
          console.warn("4K photo upload warning:", uploadErr);
        }
      }

      btn.textContent = "Saving Delicacy...";

      const deliveryCharge = Math.max(0, Number(document.getElementById("edit-prod-delivery-charge")?.value) || 0);

      const payload = {
        name,
        teluguName,
        category,
        categoryLabel,
        diet,
        dietLabel,
        inStock,
        tag,
        spice,
        shelfLife,
        deliveryCharge,
        image,
        description,
        ingredients,
        weights: weightsObj,
        defaultWeight
      };

      try {
        const isEdit = Boolean(id);
        const url = isEdit ? `/api/products/${id}` : "/api/products";
        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload)
        });
        if (res.status === 404) {
          throw new Error("API not present on static host");
        }
        const data = await res.json();

        if (res.ok && data.success) {
          showToast(`🎉 Delicacy "${name}" saved successfully!`);
          closeProductModal();
          fetchAdminProducts();
        } else {
          showToast("❌ " + (data.error || "Could not save delicacy"));
        }
      } catch (err) {
        // Fallback for static hosts (GitHub Pages) -> Update in-memory & LocalStorage
        const prodId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const updatedProd = Object.assign({ id: prodId }, payload);

        const existingIdx = ALL_PRODUCTS.findIndex(p => p.id === prodId);
        if (existingIdx !== -1) {
          ALL_PRODUCTS[existingIdx] = Object.assign(ALL_PRODUCTS[existingIdx], updatedProd);
        } else {
          ALL_PRODUCTS.unshift(updatedProd);
        }

        try {
          localStorage.setItem("cf_products_override", JSON.stringify(ALL_PRODUCTS));
        } catch (e) {}

        showToast(`🎉 Delicacy "${name}" updated successfully!`);
        closeProductModal();
        renderAdminProducts(ALL_PRODUCTS);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    }

    async function deleteProductItem(id, encodedName) {
      const name = decodeURIComponent(encodedName);
      if (!confirm(`Are you sure you want to delete "${name}" from the catalog? This will remove it from the online store.`)) {
        return;
      }

      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (res.status === 404) throw new Error("API not present on static host");
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`🗑️ "${name}" removed from catalog.`);
          fetchAdminProducts();
          return;
        }
      } catch (err) {
        ALL_PRODUCTS = ALL_PRODUCTS.filter(p => p.id !== id);
        try {
          localStorage.setItem("cf_products_override", JSON.stringify(ALL_PRODUCTS));
        } catch (e) {}
        showToast(`🗑️ "${name}" removed from catalog.`);
        renderAdminProducts(ALL_PRODUCTS);
      }
    }

    function exportProductsToCSV() {
      if (ALL_PRODUCTS.length === 0) {
        showToast("No products in catalog to export!");
        return;
      }

      let csv = "Product ID,Name,Telugu Name,Category,Diet,In Stock,Price Variants,Shelf Life,Spice Note\n";
      ALL_PRODUCTS.forEach(p => {
        const weightsStr = Object.entries(p.weights || {}).map(([w, pr]) => `${w}: Rs.${pr}`).join(" | ");
        const row = [
          p.id,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.teluguName || '').replace(/"/g, '""')}"`,
          `"${p.categoryLabel || p.category}"`,
          p.diet,
          p.inStock !== false ? "In Stock" : "Out of Stock",
          `"${weightsStr}"`,
          `"${p.shelfLife || ''}"`,
          `"${(p.spice || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Chinnodu_Foods_Catalog_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      showToast("📥 Delicacy catalog exported to CSV!");
    }

    function downloadUpdatedProductsJson() {
      if (!ALL_PRODUCTS || ALL_PRODUCTS.length === 0) {
        showToast("⚠️ No products to export.");
        return;
      }
      const jsonStr = JSON.stringify(ALL_PRODUCTS, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "products.json";
      link.click();
      showToast("📥 Downloaded products.json! Replace it in your project folder & run push-to-github.bat to update live store for all users.");
    }

    function showToast(message) {
      const container = document.getElementById("toast-container");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = "toast-message";
      toast.innerHTML = `<span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    // =========================================================================
    // HERITAGE & SPECIALTIES CMS FUNCTIONS
    // =========================================================================
    let HERITAGE_ADMIN_DATA = {
      sectionTag: "Explore Traditional Ruchulu",
      sectionTitle: "Our Heritage Specialities",
      sectionDesc: "Select a category below to browse our freshly prepared homemade delicacies",
      categories: [],
      storyTag: "Our Heritage & Roots",
      storyTitle: "From Our Village Kitchen to Your Dining Table",
      storyImage: "assets/images/hero-banner.jpg",
      storyBadgeYears: "15+",
      storyBadgeText: "Years of Village Culinary Tradition",
      storyPara1: "",
      storyPara2: ""
    };

    async function fetchHeritageAdminData() {
      try {
        const res = await fetch("/api/heritage", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.heritage) {
            HERITAGE_ADMIN_DATA = Object.assign({}, HERITAGE_ADMIN_DATA, data.heritage);
            if (!Array.isArray(HERITAGE_ADMIN_DATA.categories)) {
              HERITAGE_ADMIN_DATA.categories = [];
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch heritage data:", err);
      }

      // Populate Form Fields
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
      };

      setVal("heritage-section-tag", HERITAGE_ADMIN_DATA.sectionTag);
      setVal("heritage-section-title", HERITAGE_ADMIN_DATA.sectionTitle);
      setVal("heritage-section-desc", HERITAGE_ADMIN_DATA.sectionDesc);

      setVal("heritage-story-tag", HERITAGE_ADMIN_DATA.storyTag);
      setVal("heritage-story-title", HERITAGE_ADMIN_DATA.storyTitle);
      setVal("heritage-story-image", HERITAGE_ADMIN_DATA.storyImage);
      setVal("heritage-story-badge-years", HERITAGE_ADMIN_DATA.storyBadgeYears);
      setVal("heritage-story-badge-text", HERITAGE_ADMIN_DATA.storyBadgeText);
      setVal("heritage-story-para1", HERITAGE_ADMIN_DATA.storyPara1);
      setVal("heritage-story-para2", HERITAGE_ADMIN_DATA.storyPara2);

      updateHeritageStoryImagePreview();
      renderHeritageCardsEditor();
    }

    function renderHeritageCardsEditor() {
      const container = document.getElementById("heritage-cards-editor-list");
      const badge = document.getElementById("heritage-cards-count-badge");
      if (!container) return;

      const cats = HERITAGE_ADMIN_DATA.categories || [];
      if (badge) badge.textContent = `${cats.length} Cards`;

      if (cats.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:2rem; background:#FAF6F0; border:1px dashed #D4C5B3; border-radius:10px; color:var(--text-muted);">
            <p style="margin:0 0 0.5rem 0;">No category slide cards configured yet.</p>
            <button type="button" class="btn-primary" onclick="addHeritageCardItem()" style="padding:0.4rem 1rem; font-size:0.82rem;">➕ Add First Category Card</button>
          </div>
        `;
        return;
      }

      container.innerHTML = cats.map((cat, idx) => `
        <div style="background:#FFFDF9; border:1.5px solid #E5D8C7; border-radius:12px; padding:1.25rem; box-shadow:0 2px 6px rgba(0,0,0,0.02); position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px dashed #E2D5C3; padding-bottom:0.5rem;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:var(--primary-maroon); color:#FFF; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px;">Card #${idx + 1}</span>
              <strong style="font-size:0.95rem; color:var(--text-main);">${escapeHtml(cat.name || 'Unnamed Category')}</strong>
              <span style="font-size:0.78rem; color:var(--accent-gold); font-weight:600;">(${escapeHtml(cat.id || 'all')})</span>
            </div>
            <button type="button" onclick="removeHeritageCardItem(${idx})" style="background:#FEE2E2; color:#DC2626; border:1px solid #FCA5A5; border-radius:6px; padding:3px 8px; font-size:0.75rem; font-weight:700; cursor:pointer;" title="Delete this slide card">
              🗑️ Delete
            </button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Category Title *</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.name || '')}" oninput="updateHeritageCardField(${idx}, 'name', this.value)" placeholder="e.g. Traditional Sweets">
            </div>
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Telugu Subtitle</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.telugu || '')}" oninput="updateHeritageCardField(${idx}, 'telugu', this.value)" placeholder="e.g. సాంప్రదాయ మిఠాయిలు (10)">
            </div>
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Catalog Filter ID *</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.id || '')}" oninput="updateHeritageCardField(${idx}, 'id', this.value)" placeholder="e.g. sweets / savouries / pickles">
            </div>
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Badge Tag</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.tag || '')}" oninput="updateHeritageCardField(${idx}, 'tag', this.value)" placeholder="e.g. Pure Ghee / Crispy">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:100px 1fr; gap:0.75rem; align-items:center; margin-bottom:0.75rem;">
            <div style="width:100px; height:80px; border-radius:8px; overflow:hidden; border:1px solid #D8C7B0; background:#FAF6F0; display:flex; align-items:center; justify-content:center;">
              <img src="${cat.image || 'assets/images/brand-logo.jpg'}" alt="Preview" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/images/brand-logo.jpg'">
            </div>
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Card Image URL or Path</label>
              <div style="display:flex; gap:6px;">
                <input type="text" class="input-admin" value="${escapeHtml(cat.image || '')}" oninput="updateHeritageCardField(${idx}, 'image', this.value)" placeholder="assets/images/bellam-sunnunda.jpg">
                <label class="btn-secondary" style="margin:0; padding:6px 10px; cursor:pointer; font-size:0.76rem; white-space:nowrap; display:flex; align-items:center;">
                  <span>Upload</span>
                  <input type="file" accept="image/*" style="display:none;" onchange="handleHeritageCardImageUpload(this, ${idx})">
                </label>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:2fr 1fr; gap:0.75rem;">
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Card Delicacies Highlights / Description</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.info || '')}" oninput="updateHeritageCardField(${idx}, 'info', this.value)" placeholder="Bellam Sunnunda, Ragi Laddu, Nuvvulu Laddu...">
            </div>
            <div class="form-group-admin">
              <label style="font-size:0.76rem; font-weight:700;">Button CTA Text</label>
              <input type="text" class="input-admin" value="${escapeHtml(cat.buttonText || '')}" oninput="updateHeritageCardField(${idx}, 'buttonText', this.value)" placeholder="e.g. View Sweets →">
            </div>
          </div>
        </div>
      `).join("");
    }

    function addHeritageCardItem() {
      if (!HERITAGE_ADMIN_DATA.categories) HERITAGE_ADMIN_DATA.categories = [];
      HERITAGE_ADMIN_DATA.categories.push({
        id: "new-category",
        name: "New Delicacy Category",
        telugu: "కొత్త వంటకాలు",
        tag: "Special",
        tagClass: "sweet-tag",
        image: "assets/images/brand-logo.jpg",
        info: "Freshly prepared authentic delicacies",
        buttonText: "Explore More →"
      });
      renderHeritageCardsEditor();
      showToast("➕ Added new category slide card. Fill details and save.");
    }

    function removeHeritageCardItem(index) {
      if (!confirm("Are you sure you want to delete this category slide card?")) return;
      HERITAGE_ADMIN_DATA.categories.splice(index, 1);
      renderHeritageCardsEditor();
      showToast("🗑️ Card removed.");
    }

    function updateHeritageCardField(index, field, value) {
      if (!HERITAGE_ADMIN_DATA.categories[index]) return;
      HERITAGE_ADMIN_DATA.categories[index][field] = value;
      if (field === 'image') {
        renderHeritageCardsEditor();
      }
    }

    async function handleHeritageCardImageUpload(input, index) {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];

      try {
        const formData = new FormData();
        formData.append("photo", file);
        const res = await fetch("/api/upload-photo", {
          method: "POST",
          credentials: "include",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            updateHeritageCardField(index, 'image', data.url);
            showToast("📷 Image uploaded successfully!");
            return;
          }
        }
      } catch (e) {
        console.warn("Server upload failed, converting to DataURL:", e);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        updateHeritageCardField(index, 'image', e.target.result);
        showToast("📷 Image loaded!");
      };
      reader.readAsDataURL(file);
    }

    async function handleHeritageStoryImageUpload(input) {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];

      try {
        const formData = new FormData();
        formData.append("photo", file);
        const res = await fetch("/api/upload-photo", {
          method: "POST",
          credentials: "include",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            document.getElementById("heritage-story-image").value = data.url;
            updateHeritageStoryImagePreview();
            showToast("📷 Story banner image uploaded!");
            return;
          }
        }
      } catch (e) {
        console.warn("Upload fallback to DataURL:", e);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("heritage-story-image").value = e.target.result;
        updateHeritageStoryImagePreview();
        showToast("📷 Story banner loaded!");
      };
      reader.readAsDataURL(file);
    }

    function updateHeritageStoryImagePreview() {
      const imgInput = document.getElementById("heritage-story-image");
      const previewBox = document.getElementById("heritage-story-img-preview-box");
      if (!imgInput || !previewBox) return;
      const url = imgInput.value.trim();
      if (url) {
        previewBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px; background:#FAF6F0; padding:8px 12px; border-radius:8px; border:1px solid #ECE2D2;">
            <img src="${url}" alt="Story Preview" style="width:80px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #D8C7B0;" onerror="this.src='assets/images/hero-banner.jpg'">
            <div>
              <span style="font-size:0.75rem; font-weight:700; color:var(--primary-maroon);">Story Banner Preview</span>
              <p style="font-size:0.72rem; color:var(--text-muted); margin:0; word-break:break-all;">${escapeHtml(url.slice(0, 60))}...</p>
            </div>
          </div>
        `;
      } else {
        previewBox.innerHTML = '';
      }
    }

    async function saveHeritageData() {
      const statusEl = document.getElementById("heritage-save-status");
      if (statusEl) statusEl.textContent = "⏳ Saving...";

      const payload = {
        sectionTag: document.getElementById("heritage-section-tag")?.value || "",
        sectionTitle: document.getElementById("heritage-section-title")?.value || "",
        sectionDesc: document.getElementById("heritage-section-desc")?.value || "",
        categories: HERITAGE_ADMIN_DATA.categories || [],
        storyTag: document.getElementById("heritage-story-tag")?.value || "",
        storyTitle: document.getElementById("heritage-story-title")?.value || "",
        storyImage: document.getElementById("heritage-story-image")?.value || "",
        storyBadgeYears: document.getElementById("heritage-story-badge-years")?.value || "",
        storyBadgeText: document.getElementById("heritage-story-badge-text")?.value || "",
        storyPara1: document.getElementById("heritage-story-para1")?.value || "",
        storyPara2: document.getElementById("heritage-story-para2")?.value || ""
      };

      try {
        const res = await fetch("/api/heritage", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
          HERITAGE_ADMIN_DATA = data.heritage || payload;
          if (statusEl) statusEl.innerHTML = `<span style="color:#15803D;">✅ Saved Live to Storefront!</span>`;
          showToast("🏛️ Traditional Specialties & Heritage content saved live!");
          setTimeout(() => {
            if (statusEl) statusEl.textContent = "";
          }, 4000);
        } else {
          if (statusEl) statusEl.innerHTML = `<span style="color:#DC2626;">❌ Failed: ${escapeHtml(data.error || 'Server error')}</span>`;
          showToast("❌ " + (data.error || "Could not save heritage content"));
        }
      } catch (err) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#DC2626;">❌ Network error</span>`;
        showToast("❌ Network error saving heritage content");
      }
    }

    // =========================================================================
    // DATABASE & CLOUD SAFETY CONTROLLER (MONGODB + BACKUP VAULT)
    // =========================================================================
    let CURRENT_DB_STATUS = null;

    async function fetchDatabaseStatus() {
      try {
        const res = await fetch("/api/admin/db/status", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success) return;
        CURRENT_DB_STATUS = data;

        // Top tab badge
        const topBadge = document.getElementById("badge-top-db-status");
        if (topBadge) {
          if (data.connected) {
            topBadge.textContent = "Mongo Active";
            topBadge.style.background = "#15803D";
          } else {
            topBadge.textContent = "Local WAL";
            topBadge.style.background = "#B45309";
          }
        }

        // Section status pill
        const pill = document.getElementById("db-live-status-pill");
        if (pill) {
          if (data.connected) {
            pill.innerHTML = `🟢 Connected to MongoDB (${escapeHtml(data.database)})`;
            pill.style.background = "#DCFCE7";
            pill.style.color = "#15803D";
            pill.style.borderColor = "#86EFAC";
          } else {
            pill.innerHTML = `⚡ High-Speed Local Atomic Engine Active`;
            pill.style.background = "#FEF3C7";
            pill.style.color = "#B45309";
            pill.style.borderColor = "#FCD34D";
          }
        }

        // Metrics values
        const elMode = document.getElementById("db-stat-mode");
        const elOrders = document.getElementById("db-stat-orders");
        const elProds = document.getElementById("db-stat-products");
        const elSnaps = document.getElementById("db-stat-snapshots");

        if (elMode) elMode.textContent = data.connected ? "MongoDB Active" : "Local Atomic Engine";
        if (elOrders) elOrders.textContent = data.counts?.orders || 0;
        if (elProds) elProds.textContent = data.counts?.products || 0;
        if (elSnaps) elSnaps.textContent = data.counts?.snapshots || 0;

        // Details list
        const elDetailStatus = document.getElementById("db-detail-status");
        const elDetailDb = document.getElementById("db-detail-dbname");
        const elDetailUri = document.getElementById("db-detail-uri");
        const elDetailLast = document.getElementById("db-detail-last-backup");

        if (elDetailStatus) {
          elDetailStatus.textContent = data.connected ? "Active & Synchronized" : "Local Standalone (Atomic WAL)";
          elDetailStatus.style.color = data.connected ? "#15803D" : "#B45309";
        }
        if (elDetailDb) elDetailDb.textContent = data.database || "chinnodu_foods";
        if (elDetailUri) elDetailUri.textContent = data.mongoUri || "mongodb://127.0.0.1:27017/chinnodu_foods";
        if (elDetailLast) {
          elDetailLast.textContent = data.lastBackup ? new Date(data.lastBackup).toLocaleString() : "Just now";
        }

        // Render Snapshots Table
        renderSnapshotsTable(data.snapshots || []);
      } catch (err) {
        console.error("Error fetching DB status:", err);
      }
    }

    function renderSnapshotsTable(snapshots) {
      const tbody = document.getElementById("db-snapshots-tbody");
      if (!tbody) return;

      if (!snapshots || snapshots.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No snapshots saved yet. Snapshots are created automatically on launch.</td></tr>`;
        return;
      }

      tbody.innerHTML = snapshots.map(s => {
        const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString() : "Recent";
        return `
          <tr style="border-bottom:1px solid #F3E8D8;">
            <td style="padding:0.6rem 0.75rem; font-family:monospace; font-weight:600; color:var(--primary-maroon);">
              📄 ${escapeHtml(s.filename)}
            </td>
            <td style="padding:0.6rem 0.75rem; color:var(--text-muted);">${dateStr}</td>
            <td style="padding:0.6rem 0.75rem; font-weight:600;">${s.sizeFormatted || 'Auto'}</td>
            <td style="padding:0.6rem 0.75rem; text-align:right;">
              <span style="background:#DCFCE7; color:#15803D; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:999px;">
                Verified Immutable
              </span>
            </td>
          </tr>
        `;
      }).join("");
    }

    function downloadDatabaseBackup() {
      window.location.href = "/api/admin/db/export";
    }

    async function createManualSnapshot() {
      try {
        const res = await fetch("/api/admin/db/snapshot", {
          method: "POST",
          credentials: "include"
        });
        const data = await res.json();
        if (data.success) {
          showToast("🛡️ Point-in-time backup snapshot saved safely to /backups/!");
          fetchDatabaseStatus();
        } else {
          showToast("❌ " + (data.error || "Failed to create snapshot"));
        }
      } catch (err) {
        showToast("❌ " + err.message);
      }
    }

    async function triggerSyncToMongo() {
      try {
        showToast("⏳ Synchronizing all records to MongoDB...");
        const res = await fetch("/api/admin/db/sync-mongo", {
          method: "POST",
          credentials: "include"
        });
        const data = await res.json();
        if (data.success) {
          showToast("✅ All records 100% saved into MongoDB!");
          fetchDatabaseStatus();
        } else {
          showToast("⚠️ " + (data.error || "Failed to sync to MongoDB"));
        }
      } catch (err) {
        showToast("❌ " + err.message);
      }
    }

    async function handleBackupFileImport(input) {
      const file = input?.files?.[0];
      if (!file) return;

      if (!confirm(`Restore Database from "${file.name}"?\n\nWARNING: This will safely restore and overwrite orders, products, and financial ledgers with this backup file.`)) {
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const payload = JSON.parse(e.target.result);
          const res = await fetch("/api/admin/db/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
          });
          const result = await res.json();
          if (result.success) {
            alert(`✅ Database restored successfully!\n- Products: ${result.productsCount}\n- Orders: ${result.ordersCount}\n- Transactions: ${result.txnCount}\n\nRefreshing portal...`);
            window.location.reload();
          } else {
            alert("Restore error: " + (result.error || "Failed to restore backup"));
          }
        } catch (err) {
          alert("Invalid backup file: " + err.message);
        } finally {
          input.value = "";
        }
      };
      reader.readAsText(file);
    }
