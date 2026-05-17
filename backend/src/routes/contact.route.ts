import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sendContactFormEmail } from "../lib/email/templates.js";
import { errorResponse, okResponse } from "../utils/response.js";

const CONTACT_EMAIL = "info@myglobalhealth.online";

const contactBodySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().trim().min(20, "Message must be at least 20 characters").max(2000),
});

const contactRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/contact",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const parsed = contactBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid form data", parsed.error.flatten()));
      }

      const { name, email, subject, message } = parsed.data;

      try {
        await sendContactFormEmail({
          to: CONTACT_EMAIL,
          senderName: name,
          senderEmail: email,
          subject,
          message,
        });
        return okResponse({ ok: true });
      } catch (err) {
        app.log.error(err, "contact form email failed");
        return reply.status(500).send(errorResponse("Failed to send message. Please try again."));
      }
    },
  );
};

export default contactRoute;
