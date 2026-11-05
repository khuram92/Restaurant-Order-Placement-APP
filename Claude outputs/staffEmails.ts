import { sendEmail } from "./mailer.js";

type CredentialsEmail = {
  to: string;
  firstName: string;
  password: string;
  restaurantName: string;
  kind: "welcome" | "reset";
};

/** Emails a manager their login details (new account or password reset) */
export const sendManagerCredentials = async ({ to, firstName, password, restaurantName, kind }: CredentialsEmail) => {
  const isWelcome = kind === "welcome";
  const subject = isWelcome ? `You're the manager of ${restaurantName}` : "Your password has been reset";
  const intro = isWelcome
    ? `You've been added as the manager of <b>${restaurantName}</b>.`
    : `Your password for <b>${restaurantName}</b> has been reset by the admin.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:460px;margin:auto;padding:24px;border:1px solid #e0e1df;border-radius:12px">
      <h2 style="color:#4e5c4a;margin:0 0 12px">Hi ${firstName},</h2>
      <p style="color:#2c3329">${intro}</p>
      <p style="color:#2c3329">Log in with <b>Staff Login</b> in the app:</p>
      <table style="background:#f0f1ef;border-radius:8px;padding:12px;width:100%">
        <tr><td style="color:#6b7466">Email</td><td style="color:#2c3329"><b>${to}</b></td></tr>
        <tr><td style="color:#6b7466">Password</td><td style="color:#2c3329;font-family:monospace;font-size:16px"><b>${password}</b></td></tr>
      </table>
      <p style="color:#6b7466;font-size:13px;margin-top:16px">
        You'll be asked to choose your own password the first time you log in. Don't share this email.
      </p>
    </div>
  `;
  const text = `Hi ${firstName}, ${isWelcome ? `you're the manager of ${restaurantName}` : "your password was reset"}. Email: ${to}  Password: ${password}  (you'll be asked to change it when you log in)`;

  await sendEmail(to, subject, html, text);
};
