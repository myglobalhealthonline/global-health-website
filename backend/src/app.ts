import "dotenv/config";

import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import compress from "@fastify/compress";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import healthRoute from "./routes/health.route.js";
import authRoute from "./routes/auth.route.js";
import appointmentsRoute from "./routes/appointments.route.js";
import countriesRoute from "./routes/countries.route.js";
import doctorsRoute from "./routes/doctors.route.js";
import servicesRoute from "./routes/services.route.js";
import healthTestsRoute from "./routes/health-tests.route.js";
import assetsRoute from "./routes/assets.route.js";
import contactRoute from "./routes/contact.route.js";
import newsletterRoute from "./routes/newsletter.route.js";
import adminAppointmentsRoute from "./routes/admin-appointments.route.js";
import adminCountriesRoute from "./routes/admin-countries.route.js";
import adminServicesRoute from "./routes/admin-services.route.js";
import adminDoctorsRoute from "./routes/admin-doctors.route.js";
import adminHealthTestsRoute from "./routes/admin-health-tests.route.js";
import adminAssetsRoute from "./routes/admin-assets.route.js";
import adminUsersRoute from "./routes/admin-users.route.js";
import doctorRoute from "./routes/doctor.route.js";
import doctorAvailabilityRoute from "./routes/doctor-availability.route.js";
import consultationsRoute from "./routes/consultations.route.js";
import examResultsRoute from "./routes/exam-results.route.js";
import internalMessagesRoute from "./routes/internal-messages.route.js";
import formsRoute from "./routes/forms.route.js";
import consultationServicesRoute from "./routes/consultation-services.route.js";
import doctorInvoicesRoute from "./routes/doctor-invoices.route.js";
import doctorReportsRoute from "./routes/doctor-reports.route.js";
import notificationsRoute from "./routes/notifications.route.js";
import shareLinksRoute from "./routes/share-links.route.js";
import accountAppointmentsRoute from "./routes/account-appointments.route.js";
import accountPaymentsRoute from "./routes/account-payments.route.js";
import mediaPublicRoute from "./routes/media-public.route.js";
import adminMediaUploadRoute from "./routes/admin-media-upload.route.js";
import pagesRoute from "./routes/pages.route.js";
import adminPagesRoute from "./routes/admin-pages.route.js";
import countryScopedRoute from "./routes/country-scoped.route.js";
import paymentsRoute from "./routes/payments.route.js";
import reviewsConfigRoute from "./routes/reviews-config.route.js";
import adminSettingsRoute from "./routes/admin-settings.route.js";
import remindersRoute from "./routes/reminders.route.js";
import chatRoute from "./routes/chat.route.js";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({ logger: true, bodyLimit: 1_048_576, trustProxy: true });

  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProd = env.NODE_ENV === "production";

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (!isProd) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length === 0) {
        callback(new Error("CORS origin denied"), false);
        return;
      }
      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(cookie);
  // gzip/brotli/deflate on responses ≥ 1 KB. Public reads (doctors list,
  // services list, countries) shrink ~70% on the wire. Matters most for the
  // /portugal/pt / /ireland/en SSR fetches which can run 5+ parallel reads.
  await app.register(compress, {
    encodings: ["br", "gzip", "deflate"],
    threshold: 1024,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  // Global rate limiter. `global: false` means each route is opt-in via
  // route-level config; routes that don't opt-in are not limited. This
  // keeps the admin/internal endpoints free of accidental 429s while
  // capping the public-facing brute-force surface (login, forgot-password,
  // booking submission, payment intent creation). IP is the default key;
  // the X-Forwarded-For from Railway is trusted because we set trustProxy.
  await app.register(rateLimit, {
    global: false,
    timeWindow: "15 minutes",
    max: 100, // default ceiling used by per-route configs
    skipOnError: true, // never 500 because Redis is down etc.
  });

  await app.register(healthRoute);
  await app.register(authRoute);
  await app.register(appointmentsRoute);
  await app.register(accountAppointmentsRoute);
  await app.register(accountPaymentsRoute);
  await app.register(countriesRoute);
  await app.register(doctorsRoute);
  await app.register(servicesRoute);
  await app.register(healthTestsRoute);
  await app.register(assetsRoute);
  await app.register(contactRoute);
  await app.register(newsletterRoute);
  await app.register(adminAppointmentsRoute);
  await app.register(adminCountriesRoute);
  await app.register(adminServicesRoute);
  await app.register(adminDoctorsRoute);
  await app.register(adminHealthTestsRoute);
  await app.register(adminAssetsRoute);
  await app.register(adminUsersRoute);
  await app.register(doctorRoute);
  await app.register(doctorAvailabilityRoute);
  await app.register(consultationsRoute);
  await app.register(examResultsRoute);
  await app.register(internalMessagesRoute);
  await app.register(formsRoute);
  await app.register(consultationServicesRoute);
  await app.register(doctorInvoicesRoute);
  await app.register(doctorReportsRoute);
  await app.register(notificationsRoute);
  await app.register(shareLinksRoute);
  await app.register(mediaPublicRoute);
  await app.register(adminMediaUploadRoute);
  await app.register(pagesRoute);
  await app.register(countryScopedRoute);
  await app.register(adminPagesRoute);

  // Raw-body parser scoped to the Stripe webhook only — signature verification
  // requires the unmodified request bytes. Registered after JSON content-type
  // parser so it overrides only when the matcher hits.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    function (request, body, done) {
      // Stash the raw Buffer for Stripe webhook signature verification. We
      // detect via URL because Fastify hasn't set the route binding at
      // parser time. JSON parsing still happens so non-webhook routes get
      // their normal body shape.
      if (request.url?.startsWith("/api/payments/webhook")) {
        (request as typeof request & { rawBody: Buffer }).rawBody = body as Buffer;
      }
      try {
        done(null, body.length ? JSON.parse((body as Buffer).toString("utf8")) : {});
      } catch (err) {
        done(err as Error);
      }
    },
  );
  await app.register(paymentsRoute);
  await app.register(reviewsConfigRoute);
  await app.register(adminSettingsRoute);
  await app.register(remindersRoute);
  await app.register(chatRoute);

  return app;
}
