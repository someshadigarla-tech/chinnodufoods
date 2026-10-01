# Security Policy & Architecture Guide — Chinnodu Foods

## 1. Overview & Threat Model
Chinnodu Foods is an e-commerce platform dedicated to authentic Andhra homemade pickles and sweets. 
The architecture consists of:
- **Client Frontend**: Static storefront hosted on GitHub Pages or custom domain, communicating over HTTPS.
- **Backend Application**: High-scale Node.js server running in cloud container environments (Render).
- **Primary Database**: Cloud MongoDB Atlas cluster using TLS encryption and authenticated role-based access control.
- **In-Memory Cache**: High-concurrency RAM indexing for sub-millisecond catalog and status lookups.

---

## 2. Reporting a Vulnerability
We take the security of our customers, financial records, and operational infrastructure with the utmost seriousness.

If you believe you have discovered a security vulnerability in the Chinnodu Foods website or API:
1. **Do NOT publicly disclose the issue** on GitHub issues, social media, or forums.
2. Email full technical details, proof-of-concept steps, and affected endpoints to:
   - **Security Contact**: `someshadigarla@gmail.com`
   - **Emergency WhatsApp**: `+91 96766 98427`
3. We will acknowledge receipt of your report within 24 hours and provide an estimated remediation timeline.

---

## 3. Secret Management & Environment Security
- **No Hardcoded Secrets**: Under no circumstances should database connection strings, JWT secrets, admin passwords, or SMS gateway keys be committed to source code or git history.
- **Server-Side Only**: All API keys and secrets reside strictly in server environment variables on Render.
- **Local Development**: Copy `.env.example` to `.env` for local work. `.env` is permanently excluded from git via `.gitignore`.
- **Credential Rotation Policy**: Any credential accidentally checked into git history must be assumed compromised and revoked immediately at the provider level (MongoDB Atlas, SMS gateway, etc.).

---

## 4. Authentication & Access Control
- **Two-Factor Authentication (2FA)**:
  - Admin sign-in is a strictly enforced 2-step process: Credentials (Email/Phone + Password) -> 6-Digit Cryptographic OTP.
  - OTPs are generated using CSPRNG (`crypto.randomInt`), stored strictly as salted hashes (`crypto.createHash('sha256')`), and expire after 5 minutes.
  - OTP verification employs timing-safe comparisons (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
  - Rate limiting and 15-minute temporary lockouts are enforced after 5 failed attempts.
- **Session Security**:
  - Authenticated admin sessions are cryptographically randomized 256-bit hexadecimal tokens.
  - Sessions are transmitted via `HttpOnly; Secure; SameSite=Strict` cookies (with `SameSite=None` enabled for cross-origin admin management under HTTPS).
- **Authorization**:
  - Every mutating endpoint (`POST`, `PUT`, `PATCH`, `DELETE`) for orders, finance, catalog products, and database snapshots verifies server-side authentication (`isAuthenticated`).
  - Public order tracking requires an exact 10-digit phone number or exact Order ID to prevent customer data enumeration.

---

## 5. Financial & Order Data Integrity
- **Authoritative Server Pricing**:
  - The client-side browser is never trusted for financial totals (`subtotal`, `grandTotal`, `shipping`, `discount`).
  - The server recalculates prices authoritatively from `productsDb` for each item and chosen pack weight.
- **Payment Verification**:
  - Storefront orders default to `paymentStatus: 'Pending Verification'`.
  - Financial ledger balance auto-crediting occurs only when an administrator reviews and approves the bank UTR reference.

---

## 6. Input Validation & Content Security
- **HTML Sanitization**: All user-controlled text strings (customer names, addresses, phone numbers, UPI UTR numbers, product descriptions) are escaped via HTML entity encoding before rendering.
- **Upload Hardening**: The `/api/upload-photo` endpoint requires admin authentication, restricts files to genuine JPEG, PNG, or WebP formats via magic byte validation, and enforces a strict 5MB limit.
- **HTTP Security Headers**:
  - `Content-Security-Policy`: Restricts script and resource origins.
  - `Strict-Transport-Security`: Enforces TLS across all connections (`max-age=31536000`).
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `X-Frame-Options: SAMEORIGIN`: Protects against clickjacking.
  - `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 7. Automated Scanning & Maintenance
- **Dependabot**: Automatically monitors dependencies for emerging vulnerabilities.
- **Git Pre-commit Audit**: Regularly verify that no `.json` session files or live customer data files are committed to git.
