# Chinnodu Foods — Admin Access, 2FA & Deployment Guide

## 1. Owner & Administrator Credentials

Your admin portal is protected by **Two-Factor Authentication (2FA)** with server-side `HttpOnly` sessions and cryptographically secure (CSPRNG) salted OTP verification.

| Field | Value / Setting | Notes |
| :--- | :--- | :--- |
| **Owner Name** | **Somesh Adigarla** | Chinnodu Foods Administrator |
| **Admin Email** | `someshadigarla@gmail.com` | Primary login email |
| **Admin Mobile** | `9676698427` *(or `+91 9676698427`)* | Accepted as login identifier |
| **Admin Password** | Set via `ADMIN_PASSWORD` env variable | Kept private, never committed to public repositories |
| **2FA Method** | **CSPRNG 6-Digit OTP** | Generated with `crypto.randomInt` and verified via salted SHA-256 hash |
| **OTP Expiry** | 5 Minutes | 60-second resend cooldown timer |

---

## 2. Two-Factor (2FA) Sign-In Flow

1. Open your admin portal: `http://localhost:8080/admin.html` (or your live Render URL).
2. **Step 1 — Credentials**:
   - Enter your email (`someshadigarla@gmail.com`) **OR** registered mobile number (`9676698427`).
   - Enter your admin password.
   - Click **"Continue to 2-Step OTP ➡️"**.
3. **Step 2 — OTP Verification**:
   - A cryptographically secure 6-digit OTP code is generated using CSPRNG and hashed with a random cryptographic salt.
   - The OTP is dispatched to your registered phone number (`+91 96766 98427`).
   - Enter the 6 digits on the screen and click **"Verify OTP"**.
   - Upon timing-safe verification, the OTP is immediately marked as used and deleted, and the server issues a cryptographically signed 24-hour `HttpOnly` session cookie!

---

## 3. How to Run Locally

In your project folder, start the Node.js server:
```powershell
node server.js
```
Then visit:
- **Customer Storefront**: `http://localhost:8080/`
- **Admin Control Center**: `http://localhost:8080/admin.html`

> **Note on Local OTP Testing**: In local development without an external SMS gateway API key, dispatched OTP notices are written to `.otp_dispatch.json` in your project folder (mode 0600, blocked from web access) for immediate testing.

---

## 4. Deploying to Render (Free Tier)

1. Sign up or log into [render.com](https://render.com).
2. Connect your GitHub repository containing the project files.
3. Click **New + → Web Service**.
4. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: *(Leave empty — zero dependencies needed)*
   - **Start Command**: `node server.js`
5. Under **Environment Variables**, add:
   - `ADMIN_EMAIL` = `someshadigarla@gmail.com`
   - `ADMIN_PHONE` = `9676698427`
   - `ADMIN_PASSWORD` = `<Your_Secret_Admin_Password>`
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/chinnodu_foods?retryWrites=true&w=majority` *(Recommended for 100% Zero-Data-Loss across Render container restarts)*
6. Click **Create Web Service**. Your store will be live in 1-2 minutes!

---

## 5. Free MongoDB Atlas Setup (Zero Data Loss)

To ensure customer orders, financial transactions, and catalog edits are preserved across cloud container redeployments:

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 (Shared Free)** cluster (free forever, 512MB storage).
3. Under **Database Access**, create a user (e.g., `chinnodu_admin`) and set a strong password.
4. Under **Network Access**, click **Add IP Address** → choose **"Allow Access from Anywhere" (`0.0.0.0/0`)** so Render can connect.
5. Click **Connect** → choose **"Drivers" (Node.js)** and copy your connection string:
   ```
   mongodb+srv://chinnodu_admin:<password>@cluster0.abcde.mongodb.net/chinnodu_foods?retryWrites=true&w=majority
   ```
6. Add this string as `MONGODB_URI` in Render / Railway environment variables. The server will automatically connect, create indexes, seed catalog items, and dual-write every order with zero latency!
