import { ErrorCode } from "@repo/shared";

export type DomainErrorProps = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
};

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(props: DomainErrorProps) {
    super(props.message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.name = "DomainError";
    this.code = props.code;
    this.details = props.details;
    this.cause = props.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
