import { eventBus } from ".";
import { IEventPublisher } from "../interfaces/IEventPublisher";

export class EventBusPublisher implements IEventPublisher {
  publish<T>(eventName: string, payload: T): void {
    eventBus.dispatch<T>(eventName, payload);
  }
}
