import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

// Created on first use, so .env is already loaded
const getClient = () => {
  if (client) return client;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio settings are missing in .env");
  }

  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
};

/** 03001234567 → +923001234567 (Twilio needs international format) */
export const toInternationalPK = (phone: string): string => "+92" + phone.slice(1);

export const sendSms = async (to: string, body: string) => {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("TWILIO_PHONE_NUMBER is missing in .env");

  await getClient().messages.create({
    to: toInternationalPK(to),
    from,
    body,
  });
};