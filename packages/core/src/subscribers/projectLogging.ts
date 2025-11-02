import { eventBus } from "@repo/infra";
import { PROJECT_CREATED, PROJECT_UPDATED } from "@repo/shared";

export function registerProjectLoggingSubscribers() {
  eventBus.register(PROJECT_CREATED, (e) => {
    console.log(`[event] ${PROJECT_CREATED}`, JSON.stringify(e));
  });
  eventBus.register(PROJECT_UPDATED, (e) => {
    console.log(`[event] ${PROJECT_UPDATED}`, JSON.stringify(e));
  });
}
