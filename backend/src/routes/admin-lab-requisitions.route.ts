import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  confirmRequisitionItems,
  createSelfPayOrder,
  fetchMethods,
  getLabRequisition,
  LabConsentMissingError,
  LabRequisitionNotFoundError,
  LabRequisitionStateError,
  listLabRequisitions,
  mintFormToken,
  mintResultListUrl,
  setRequisitionStatus,
  WeblimsNotConfiguredError,
} from "../modules/lab-orders/lab-requisitions.service.js";
import {
  LabPatientDataIncompleteError,
  LabPatientIdentifierMissingError,
} from "../modules/lab-orders/weblims-payload.js";
import { isWeblimsConfigured } from "../lib/weblims/client.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  adminLabRequisitionConfirmBodySchema,
  adminLabRequisitionsQuerySchema,
  adminLabRequisitionStatusBodySchema,
  labRequisitionIdParamsSchema,
} from "../validations/admin-lab-requisitions.schema.js";

/**
 * Admin queue for external-laboratory requisitions (Synlab CZ / WebLIMS 2).
 *
 *   GET   /api/admin/lab-requisitions            → the queue
 *   GET   /api/admin/lab-requisitions/:id        → one case, with items
 *   POST  /api/admin/lab-requisitions/:id/confirm       → outcome of the patient call
 *   POST  /api/admin/lab-requisitions/:id/payment-link  → self-pay order + pay link
 *   POST  /api/admin/lab-requisitions/:id/weblims-form  → URL for the operator to open
 *   POST  /api/admin/lab-requisitions/:id/methods       → read back what was ordered
 *   POST  /api/admin/lab-requisitions/:id/result-list   → WebLIMS result view (interim)
 *   PATCH /api/admin/lab-requisitions/:id/status        → manual status control
 *
 * The two `weblims-*` actions are the only ones that talk to Synlab, and they
 * 503 when the integration is unconfigured — the queue itself works without any
 * laboratory credentials at all.
 */

function handleError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof LabRequisitionNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof WeblimsNotConfiguredError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  if (
    error instanceof LabConsentMissingError ||
    error instanceof LabPatientIdentifierMissingError ||
    error instanceof LabPatientDataIncompleteError ||
    error instanceof LabRequisitionStateError
  ) {
    // All four are "fix the record, then retry" — the message is written for
    // the admin who has the patient on the phone.
    return reply.status(422).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(502).send(errorResponse("The laboratory request could not be completed"));
}

const adminLabRequisitionsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/lab-requisitions", async (request, reply) => {
    const query = adminLabRequisitionsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid lab requisition query", query.error.flatten()));
    }
    try {
      const { items, pagination } = await listLabRequisitions(query.data);
      return okResponse({
        requisitions: items,
        pagination,
        // Drives the UI: the handoff buttons render disabled with an
        // explanation instead of failing on click.
        weblimsConfigured: isWeblimsConfigured(),
      });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.get("/api/admin/lab-requisitions/:id", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    try {
      const requisition = await getLabRequisition(params.data.id);
      if (!requisition) {
        return reply.status(404).send(errorResponse("Lab requisition not found"));
      }
      return okResponse({ requisition, weblimsConfigured: isWeblimsConfigured() });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Outcome of the confirmation call with the patient.
  app.post("/api/admin/lab-requisitions/:id/confirm", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    const body = adminLabRequisitionConfirmBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid confirmation payload", body.error.flatten()));
    }
    try {
      const requisition = await confirmRequisitionItems(
        params.data.id,
        {
          acceptedItemIds: body.data.acceptedItemIds,
          testCenterId: body.data.testCenterId ?? null,
          collectionDate: body.data.collectionDate ? new Date(body.data.collectionDate) : null,
          priority: body.data.priority ?? null,
          adminNotes: body.data.adminNotes ?? null,
        },
        { userId: resolveAdminSessionActor(request)?.userId ?? null },
      );
      return okResponse({ requisition }, "Exams confirmed with the patient");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.post("/api/admin/lab-requisitions/:id/payment-link", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    try {
      const result = await createSelfPayOrder(params.data.id, {
        userId: resolveAdminSessionActor(request)?.userId ?? null,
      });
      return okResponse(result, "Self-pay order created");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  /**
   * Mint the WebLIMS form token and hand back the URL.
   *
   * The response deliberately carries the `show` URL and not the raw token: the
   * token is a capability that opens a form pre-filled with this patient's
   * identity, and the browser is the only thing that needs it.
   */
  app.post("/api/admin/lab-requisitions/:id/weblims-form", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    try {
      const result = await mintFormToken(params.data.id, {
        userId: resolveAdminSessionActor(request)?.userId ?? null,
      });
      return okResponse(result, "Open this URL to complete the requisition in WebLIMS");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.post("/api/admin/lab-requisitions/:id/methods", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    try {
      const result = await fetchMethods(params.data.id, {
        userId: resolveAdminSessionActor(request)?.userId ?? null,
      });
      return okResponse(
        result,
        result.methodsText
          ? "Ordered methods retrieved"
          : "Nothing saved in WebLIMS for this requisition yet",
      );
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.post("/api/admin/lab-requisitions/:id/result-list", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    try {
      const result = await mintResultListUrl(params.data.id);
      return okResponse(result, "Open this URL to view the patient's results in WebLIMS");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.patch("/api/admin/lab-requisitions/:id/status", async (request, reply) => {
    const params = labRequisitionIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid requisition id"));
    }
    const body = adminLabRequisitionStatusBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid status", body.error.flatten()));
    }
    try {
      const requisition = await setRequisitionStatus(params.data.id, body.data.status, {
        userId: resolveAdminSessionActor(request)?.userId ?? null,
      });
      return okResponse({ requisition }, "Status updated");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });
};

export default adminLabRequisitionsRoute;
