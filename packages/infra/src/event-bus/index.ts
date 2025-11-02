import { EventBus } from "./EventBus";
import { EventBusPublisher } from "./EventBusPublisher";

export const eventBus = new EventBus();
export const eventBusPublisher = new EventBusPublisher();
