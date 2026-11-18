
const APP_NAME = "Restaurant Orders"; 
const OWNER = "Muhammad Hashir"; 
const CONTACT_EMAIL = "support@example.com"; 
const EFFECTIVE_DATE = "18 November 2026";


const css = `
  :root { --brand:#4e5c4a; --dark:#2c3329; --light:#6f7d6a; --mist:#e0e1df; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
         color:var(--dark); background:var(--mist); line-height:1.6; }
  header { background:var(--brand); color:#fff; padding:28px 20px; }
  header h1 { margin:0; font-size:26px; }
  header p { margin:4px 0 0; opacity:.85; font-size:14px; }
  main { max-width:760px; margin:0 auto; padding:20px; }
  section { background:#fff; border-radius:18px; padding:18px 20px; margin-bottom:14px; }
  h2 { font-size:18px; margin:0 0 8px; color:var(--brand); }
  ul { padding-left:20px; margin:6px 0; }
  li { margin:4px 0; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:8px 6px; border-bottom:1px solid var(--mist); vertical-align:top; }
  th { color:var(--light); font-weight:600; }
  a { color:var(--brand); }
  footer { text-align:center; color:var(--light); font-size:13px; padding:10px 0 30px; }
`;

export const privacyPolicyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacy Policy · ${APP_NAME}</title>
<style>${css}</style>
</head>
<body>
<header>
  <h1>Privacy Policy</h1>
  <p>${APP_NAME} · Effective ${EFFECTIVE_DATE}</p>
</header>
<main>

<section>
  <h2>Who we are</h2>
  <p>${APP_NAME} is a food ordering app run by ${OWNER}. It lets customers order from
  partner restaurants for dine-in, takeaway or delivery, and lets restaurant staff manage
  those orders. This policy explains what information the app collects, why, and the
  choices you have. Questions: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
</section>

<section>
  <h2>Information we collect</h2>
  <table>
    <tr><th>What</th><th>Why we use it</th></tr>
    <tr><td><b>Phone number and/or email</b></td><td>To sign you in with a one-time code, and so the restaurant or rider can contact you about an order.</td></tr>
    <tr><td><b>Name, date of birth, profile photo</b></td><td>To set up your profile. Your name is shown to the restaurant on your orders. The photo is optional.</td></tr>
    <tr><td><b>Location</b> (only while you use the app)</td><td>When you tap “Use my current location”, turn on “Nearest”, or check if a restaurant delivers to you: to fill in your address, show distances, check the delivery area and work out the delivery fee. We never track your location in the background.</td></tr>
    <tr><td><b>Delivery addresses</b></td><td>To deliver your order, and (if you choose) to save Home / Work addresses for next time.</td></tr>
    <tr><td><b>Orders, reviews and favourites</b></td><td>To place and track orders, show your order history, let you rate orders, and keep your favourite restaurants.</td></tr>
    <tr><td><b>Device push token</b></td><td>To send notifications about your orders (for example “Your order is ready”).</td></tr>
    <tr><td><b>IP address and sign-in attempts</b></td><td>To protect accounts: limiting how many codes can be requested and blocking repeated wrong passwords. These records are deleted automatically within 24 hours.</td></tr>
  </table>
  <p>Payments are <b>cash only</b>. The app does not collect or store card or bank details.</p>
</section>

<section>
  <h2>Who we share it with</h2>
  <ul>
    <li><b>The restaurant you order from</b> sees your name, phone number, order details and,
      for delivery, your address and map pin so the rider can find you.</li>
    <li><b>Service providers</b> that run parts of the app for us, only for that purpose:
      cloud database hosting (MongoDB Atlas), image storage for photos (Cloudinary),
      SMS codes (Twilio), email delivery, and push notifications (Expo and Google Firebase
      Cloud Messaging). Turning GPS coordinates into a street address uses your phone's
      built-in location service.</li>
    <li><b>When the law requires it</b>, for example a valid request from authorities.</li>
  </ul>
  <p>We do <b>not</b> sell your personal information, and we do not use it for advertising.</p>
</section>

<section>
  <h2>How long we keep it</h2>
  <ul>
    <li>Account and profile information: until you delete your account.</li>
    <li>Saved addresses and favourites: until you remove them or delete your account.</li>
    <li>Orders: kept as business records for the restaurant (sales and tax). If you delete your
      account, your name and contact details are removed from them.</li>
    <li>Notifications in the app: deleted after 90 days.</li>
    <li>Sign-in codes: expire within minutes. Security logs (code requests, wrong passwords): deleted within 24 hours.</li>
  </ul>
</section>

<section>
  <h2>Your choices</h2>
  <ul>
    <li><b>Location:</b> you can deny or turn off location permission at any time in your
      phone's settings. You can still order by typing your address, but some restaurants
      need a location to check their delivery area.</li>
    <li><b>Notifications:</b> you can turn them off in your phone's settings.</li>
    <li><b>Edit your details:</b> change your name, photo, phone, email and saved addresses in the app.</li>
    <li><b>Delete your account:</b> email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
      from your registered email, or with your registered phone number, and we will delete your
      account and personal information within 30 days.</li>
  </ul>
</section>

<section>
  <h2>Security</h2>
  <p>Data is sent over encrypted connections (HTTPS). Staff passwords are stored as secure hashes,
  sign-in codes are stored hashed and expire quickly, and repeated attempts are blocked.
  No system is perfectly secure, but we work to protect your information.</p>
</section>

<section>
  <h2>Children</h2>
  <p>The app is not meant for children under 13, and we do not knowingly collect their information.
  If you believe a child has given us personal information, contact us and we will delete it.</p>
</section>

<section>
  <h2>Changes to this policy</h2>
  <p>If we change this policy, we will update the date at the top of this page. Important changes
  will also be shown in the app.</p>
</section>

<section>
  <h2>Contact</h2>
  <p>${OWNER} · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
</section>

</main>
<footer>© ${new Date().getFullYear()} ${APP_NAME}</footer>
</body>
</html>`;