import { eventBus } from "@repo/infra";
import {
  TASK_COMPLETED,
  TASK_CREATED,
  TASK_STATUS_CHANGED,
} from "@repo/shared";

export function registerTaskLoggingSubscribers() {
  eventBus.register(TASK_CREATED, (e) => {
    console.log(`[event] ${TASK_CREATED}`, JSON.stringify(e));
  });
  eventBus.register(TASK_COMPLETED, (e) => {
    console.log(`[event] ${TASK_COMPLETED}`, JSON.stringify(e));
  });
  eventBus.register(TASK_STATUS_CHANGED, (e) => {
    console.log(`[event] ${TASK_STATUS_CHANGED}`, JSON.stringify(e));
  });
}
