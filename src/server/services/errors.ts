/**
 * Error raised by the domain layer. `code` maps to a translated message
 * under the `errors` namespace, so services stay locale-agnostic.
 */
export type DomainErrorCode =
  | "notFound"
  | "forbidden"
  | "dateTooSoon"
  | "invalidParticipants"
  | "capacityExceeded"
  | "invalidTransition"
  | "notCancellable"
  | "slugTaken"
  | "notPayable"
  | "alreadyPaid"
  | "paymentUnavailable"
  | "paymentGateway";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DomainError";
  }
}

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
