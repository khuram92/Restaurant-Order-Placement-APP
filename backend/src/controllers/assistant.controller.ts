import * as Sentry from "@sentry/node";
import type { Request, Response } from "express";
import { z } from "zod";
import { AssistantUsage } from "../models/AssistantUsage.js";
import { chatWithTools } from "../utils/aiProvider.js";
import {
  ASSISTANT_TOOLS,
  runAssistantTool,
  type AssistantCard,
} from "../utils/assistantTools.js";

const DAILY_LIMIT = Number(process.env.ASSISTANT_DAILY_LIMIT) || 30;

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z
          .string()
          .trim()
          .min(1)
          .max(500, "Keep your message under 500 characters"),
      }),
    )
    .min(1)
    .max(12),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

const firstIssue = (error: { issues: { message: string }[] }) =>
  error.issues[0]?.message ?? "Invalid input";

/** "2026-11-23" in Pakistan time */
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

const systemPrompt = () => {
  const now = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  return `You are the friendly food assistant inside a Pakistani food ordering app. It is ${now} (Pakistan time).

What you do:
- Help customers find dishes and restaurants, check if a restaurant is open, and check their own orders.
- ALWAYS use the tools for menus, prices, opening status and orders. Never invent dishes, prices, restaurants or order details.
- The app shows tappable cards for everything your tools found, so mention at most 3 items in your text and keep it short (under 80 words).
- Reply in the customer's language and style: English, Urdu, or Roman Urdu.
- Prices are in Pakistani rupees, written like "Rs 650".

What you can't do:
- You can't place, change or cancel orders. Tell the customer how: tap a card to open the restaurant and add to cart; to cancel, open the order in My bookings (only before the restaurant accepts it).
- Politely decline anything not about food, restaurants, orders or this app.

App facts (for help questions):
- Payment is cash only: on delivery, at pickup, or at the restaurant for dine-in.
- Customers can cancel only while the restaurant hasn't accepted the order. After that, call the restaurant from the order screen.
- If a restaurant doesn't confirm an order within 20 minutes, it's cancelled automatically. The customer isn't charged.
- Delivery fee = the restaurant's base fee + a charge per km. The exact fee shows at checkout.
- A restaurant may be closed outside its hours, or closed for a short while (the app shows when it's back).
- Customers can rate an order once it's completed; restaurants can reply.
- Delete account: Profile → Delete account; a code is sent to the phone and email.
- Other problems: Profile → Help & support (call, WhatsApp or email).`;
};

/** POST /api/assistant/chat   { messages: [{ role, text }], location? } */
export const chat = async (req: Request, res: Response) => {
  const parsed = chatSchema.safeParse(req.body ?? {});
  if (!parsed.success)
    return res.status(400).json({ message: firstIssue(parsed.error) });

  // Drop any assistant greeting before the first customer message, and require the last one to be the customer's
  const messages = parsed.data.messages.slice(
    parsed.data.messages.findIndex((m) => m.role === "user"),
  );
  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return res.status(400).json({ message: "Send a message first" });
  }

  // Daily limit per customer (counted atomically)
  const usage = await AssistantUsage.findOneAndUpdate(
    { userId: req.user!._id, day: todayKey() },
    { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true },
  );
  if (usage.count > DAILY_LIMIT) {
    return res.status(429).json({
      message: `You've used today's ${DAILY_LIMIT} assistant messages. Try again tomorrow, or browse the app as usual.`,
    });
  }

  const cards: AssistantCard[] = [];
  const ctx = { userId: req.user!._id, location: parsed.data.location, cards };

  try {
    const reply = await chatWithTools({
      system: systemPrompt(),
      history: messages,
      tools: ASSISTANT_TOOLS,
      runTool: (name, args) => runAssistantTool(ctx, name, args),
    });
    res.json({
      reply,
      cards,
      remaining: Math.max(0, DAILY_LIMIT - usage.count),
    });
  } catch (error) {
    console.error("❌ Assistant failed:", (error as Error).message);
    Sentry.captureException(error, { tags: { feature: "assistant" } });
    // Don't count a failed answer against the customer
    await AssistantUsage.updateOne(
      { _id: usage._id },
      { $inc: { count: -1 } },
    ).catch(() => {});
    res.status(503).json({
      message: "The assistant is busy right now. Please try again in a moment.",
    });
  }
};
