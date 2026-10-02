/**
 * Error raised by the domain layer. `code` maps to a translated message
 * under the `errors` namespace, so services stay locale-agnostic.
 */
export type DomainErrorCode =
  | "notFound"
  | "forbidden"
  | "cannotChangeSelf"
  | "lastAdmin"
  | "dateTooSoon"
  | "invalidParticipants"
  | "capacityExceeded"
  | "dateClosed"
  | "closureRange"
  | "invalidTransition"
  | "notCancellable"
  | "slugTaken"
  | "notPayable"
  | "alreadyPaid"
  | "paymentUnavailable"
  | "paymentGateway"
  | "notRefundable"
  // Traveller self-service (cancel / reschedule).
  | "notReschedulable"
  | "rescheduleLimit"
  | "rescheduleTooLate"
  | "sameDate"
  | "refundChanged";

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
