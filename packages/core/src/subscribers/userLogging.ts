import { eventBus } from "@repo/infra";
import { USER_CREATED, USER_UPDATED } from "@repo/shared";

export function registerUserLoggingSubscribers() {
  eventBus.register(USER_CREATED, (e) => {
    console.log(`[event] ${USER_CREATED}`, JSON.stringify(e));
  });
  eventBus.register(USER_UPDATED, (e) => {
    console.log(`[event] ${USER_UPDATED}`, JSON.stringify(e));
  });
}
