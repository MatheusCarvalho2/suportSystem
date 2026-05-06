type TicketSocketEmitter = (
  ticketId: string,
  event: string,
  data: unknown
) => void;

const g = globalThis as typeof globalThis & {
  __emitTicketSocketEvent?: TicketSocketEmitter;
};

export function registerTicketSocketEmitter(fn: TicketSocketEmitter): void {
  g.__emitTicketSocketEvent = fn;
}

export function emitTicketSocketEvent(
  ticketId: string,
  event: string,
  data: unknown
): void {
  g.__emitTicketSocketEvent?.(ticketId, event, data);
}
