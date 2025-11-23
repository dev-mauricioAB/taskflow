// handle-prisma-errors.ts
import { mapPrismaToDomainError } from "../prisma-error-mapper";

// Method decorator (keep your existing one)
export function HandlePrismaErrors<T extends (...args: any[]) => any>(
  _target: Object,
  _propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> | void {
  const originalMethod = descriptor.value;

  if (!originalMethod) {
    return;
  }

  descriptor.value = async function (this: any, ...args: Parameters<T>) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      throw mapPrismaToDomainError(error);
    }
  } as T;

  return descriptor;
}

// Class decorator - applies HandlePrismaErrors to all methods
export function HandleAllPrismaErrors<T extends { new(...args: any[]): {} }>(
  constructor: T,
) {
  // Get all property names from the prototype
  const prototype = constructor.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  propertyNames.forEach((propertyName) => {
    // Skip constructor
    if (propertyName === "constructor") {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);

    // Check if it's a method
    if (descriptor && typeof descriptor.value === "function") {
      const originalMethod = descriptor.value;

      // Wrap the method
      descriptor.value = async function (this: any, ...args: any[]) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          throw mapPrismaToDomainError(error);
        }
      };

      Object.defineProperty(prototype, propertyName, descriptor);
    }
  });

  return constructor;
}
