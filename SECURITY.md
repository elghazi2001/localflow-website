# Security operations

## Scope and current architecture

This is a static site hosted on GitHub Pages. The contact form currently uses the public Web3Forms browser endpoint unless `SR_CONFIG.requestEndpoint` is configured. The Apps Script source is maintained in this repository, but editing `apps-script/Code.gs` here does **not** update an already-deployed Google Apps Script web app: publish a new Apps Script version separately.

## Controls in the repository

- Content Security Policy and Referrer Policy meta tags in `index.html`.
- Server-side input validation, length caps, HTML escaping, honeypot handling, and serialized rate-limit counters in `apps-script/Code.gs`.
- The frontend does not automatically send a second copy through Web3Forms after an uncertain Apps Script transport failure.
- A lightweight GitHub Actions workflow checks JavaScript syntax on pushes and pull requests.

## Required production configuration

1. In the Web3Forms dashboard, restrict the access key to the production domain if supported, rotate it if abuse is suspected, and review usage/notifications. A key embedded in a public HTML form is not a secret.
2. If Apps Script is enabled, copy the reviewed `apps-script/Code.gs` into the Apps Script project, run `setup` if needed, then **Deploy → Manage deployments → Edit → New version → Deploy**. Confirm the deployment URL remains configured in `js/config.js`.
3. Add server-verified Cloudflare Turnstile (or equivalent) validation. Keep the secret only in server-side configuration such as Apps Script Script Properties; never place it in `js/` or HTML. Reject missing/invalid tokens on the server.
4. Put a CDN/WAF such as Cloudflare in front of the site and configure rate limits for form submissions. GitHub Pages does not let this repository set arbitrary HTTP response headers.
5. Configure HTTP response headers at the hosting/CDN layer: HSTS (after HTTPS is confirmed), `X-Content-Type-Options: nosniff`, a restrictive `Permissions-Policy`, and CSP with `frame-ancestors 'none'`. A CSP meta tag cannot enforce `frame-ancestors`.
6. Enable GitHub secret scanning/push protection and Dependabot security updates in repository settings. Review Google Drive document sharing and account MFA; define a retention/deletion period for submitted personal data.

## Verification before release

- Check the production page and form from a clean browser session.
- Submit a test request and confirm exactly one notification/record arrives.
- Verify invalid email, missing consent, oversized fields, and honeypot handling.
- Test concurrent requests and verify rate limiting does not admit more than the configured global bucket limit.
- Inspect deployed HTTP response headers with a header scanner; do not infer them from HTML meta tags.
- Run an external scan (for example OWASP ZAP baseline) and manually review findings before claiming a score.

## Reporting

Do not publish credentials, access keys, customer submissions, or personal data in issues. Rotate any credential that has been committed to the repository and remove it from repository history where appropriate.
