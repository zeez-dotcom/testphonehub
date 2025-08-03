import { db } from "./db";
import { userEvents } from "@shared/schema";
import { and, eq, gt } from "drizzle-orm";

const EVENT_WEIGHTS = {
  view: 1,
  cart_add: 3,
  purchase: 5,
};

export async function getRecommendations(userId: string, limit = 5) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
  const events = await db
    .select()
    .from(userEvents)
    .where(and(eq(userEvents.userId, userId), gt(userEvents.createdAt, since)));

  const scores: Record<string, number> = {};
  for (const event of events) {
    const weight = EVENT_WEIGHTS[event.eventType as keyof typeof EVENT_WEIGHTS] || 0;
    scores[event.productId] = (scores[event.productId] || 0) + weight;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId);
}
