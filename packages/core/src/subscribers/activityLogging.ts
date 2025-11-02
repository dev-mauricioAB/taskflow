// app/subscribers/activityLogging.ts
import { eventBus } from "@repo/infra";
import { ACTIVITY_CREATED, ACTIVITY_UPDATED } from "@repo/shared";

export function registerActivityLoggingSubscribers() {
  eventBus.register(ACTIVITY_CREATED, (e) => {
    console.log(`[event] ${ACTIVITY_CREATED}`, JSON.stringify(e));
  });
  eventBus.register(ACTIVITY_UPDATED, (e) => {
    console.log(`[event] ${ACTIVITY_UPDATED}`, JSON.stringify(e));
  });
}
