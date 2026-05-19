import type { FastifyReply, FastifyBaseLogger } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse } from "./response.js";

/**
 * One-call error → reply mapper. Replaces the ~60 hand-written
 * `if (err instanceof DatabaseUnavailableError) … else app.log.error …`
 * ladders that ended every route's catch block.
 *
 * Convention: throw a typed error class for anything the caller might
 * want to differentiate (e.g. `SlotAlreadyTakenError` → 409); fall
 * through to this helper for the catch-all.
 *
 * Returns the reply so callers can `return replyWithError(...)`.
 */
export function replyWithError(
  reply: FastifyReply,
  log: Pick<FastifyBaseLogger, "error">,
  error: unknown,
  fallbackMessage = "Unexpected error",
): FastifyReply {
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  log.error(error);
  return reply.status(500).send(errorResponse(fallbackMessage));
}
