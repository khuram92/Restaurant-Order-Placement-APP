export type Channel = "email" | "phone";

/** Returns the normalized value + channel, or null if invalid */
export const parseIdentifier = (raw: string): { identifier: string; channel: Channel } | null => {
  const value = raw.trim();

  if (value.includes("@")) {
    const email = value.toLowerCase();
    return /^\S+@\S+\.\S+$/.test(email) ? { identifier: email, channel: "email" } : null;
  }

  let phone = value.replace(/[\s-]/g, "");
  if (phone.startsWith("+92")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("92")) phone = "0" + phone.slice(2);

  return /^03\d{9}$/.test(phone) ? { identifier: phone, channel: "phone" } : null;
};