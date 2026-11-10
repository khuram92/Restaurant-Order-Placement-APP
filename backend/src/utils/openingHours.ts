import type { Day, IOpeningHour } from "../models/Restaurant.js";

const TIMEZONE = "Asia/Karachi"; // all restaurants are in Pakistan
const DAY_ORDER: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Current day ("mon") and minutes since midnight in Pakistan time */
const nowInPakistan = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as Day;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
};

/**
 * Is the restaurant open right now?
 * close earlier than open = closes after midnight (e.g. 18:00 → 02:00).
 */
export const isOpenNow = (hours: IOpeningHour[], now = new Date()) => {
  const { day, minutes } = nowInPakistan(now);
  const todayIndex = DAY_ORDER.indexOf(day);
  const yesterday = DAY_ORDER[(todayIndex + 6) % 7];

  const today = hours.find((h) => h.day === day);
  if (today && !today.closed) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true;
  }

  // Yesterday's late-night hours that run past midnight into today
  const prev = hours.find((h) => h.day === yesterday);
  if (prev && !prev.closed) {
    const open = toMinutes(prev.open);
    const close = toMinutes(prev.close);
    if (close <= open && minutes < close) return true;
  }

  return false;
};