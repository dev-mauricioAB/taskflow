export interface Registry {
  unregister: () => void;
}

export interface Callable {
  [key: string]: (arg?: unknown) => void;
}

export interface Subscriber {
  [event: string]: Callable;
}

export interface IEventBus {
  dispatch<T>(event: string, arg?: T): void;
  register(event: string, callback: (arg?: unknown) => void): Registry;
}

export class EventBus implements IEventBus {
  private subscribers: Subscriber;
  private static nextId = 0;

  constructor() {
    this.subscribers = {};
  }

  public dispatch<T>(event: string, arg?: T): void {
    const subscriber = this.subscribers[event];
    if (subscriber === undefined) return;
    Object.keys(subscriber).forEach((key) => subscriber[key]?.(arg));
  }

  public register(event: string, callback: (arg?: unknown) => void): Registry {
    const id = this.getNextId();
    if (!this.subscribers[event]) this.subscribers[event] = {};
    this.subscribers[event][id] = callback;

    return {
      unregister: () => {
        delete this.subscribers[event]?.[id];
        if (Object.keys(this.subscribers[event] || {}).length === 0) {
          delete this.subscribers[event];
        }
      },
    };
  }

  private getNextId(): number {
    return EventBus.nextId++;
  }
}
