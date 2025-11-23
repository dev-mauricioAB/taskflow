import { ErrorCode } from "@repo/shared";

export type DomainErrorProps = {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
  status?: number; // optional; web layer can fallback using ERROR_CODE_TO_STATUS
};

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: unknown;
  public readonly status?: number;

  constructor(props: DomainErrorProps) {
    super(props.message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "DomainError";
    this.code = props.code;
    this.details = props.details;
    this.cause = props.cause;
    this.status = props.status;
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
