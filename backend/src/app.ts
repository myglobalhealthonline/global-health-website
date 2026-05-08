import "dotenv/config";

import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import healthRoute from "./routes/health.route.js";
import authRoute from "./routes/auth.route.js";
import appointmentsRoute from "./routes/appointments.route.js";
import countriesRoute from "./routes/countries.route.js";
import doctorsRoute from "./routes/doctors.route.js";
import servicesRoute from "./routes/services.route.js";
import pricingRoute from "./routes/pricing.route.js";
import assetsRoute from "./routes/assets.route.js";
import contactRoute from "./routes/contact.route.js";
import newsletterRoute from "./routes/newsletter.route.js";
import adminAppointmentsRoute from "./routes/admin-appointments.route.js";
import adminCountriesRoute from "./routes/admin-countries.route.js";
import adminServicesRoute from "./routes/admin-services.route.js";
import adminDoctorsRoute from "./routes/admin-doctors.route.js";
import adminPricingRoute from "./routes/admin-pricing.route.js";
import adminAssetsRoute from "./routes/admin-assets.route.js";
import adminBlogPostsRoute from "./routes/admin-blog-posts.route.js";
import blogPostsRoute from "./routes/blog-posts.route.js";
import adminFaqsRoute from "./routes/admin-faqs.route.js";
import adminContentPagesRoute from "./routes/admin-content-pages.route.js";
import accountAppointmentsRoute from "./routes/account-appointments.route.js";
import mediaPublicRoute from "./routes/media-public.route.js";
import adminMediaUploadRoute from "./routes/admin-media-upload.route.js";
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
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(healthRoute);
  await app.register(authRoute);
  await app.register(appointmentsRoute);
  await app.register(accountAppointmentsRoute);
  await app.register(countriesRoute);
  await app.register(doctorsRoute);
  await app.register(servicesRoute);
  await app.register(pricingRoute);
  await app.register(assetsRoute);
  await app.register(contactRoute);
  await app.register(newsletterRoute);
  await app.register(adminAppointmentsRoute);
  await app.register(adminCountriesRoute);
  await app.register(adminServicesRoute);
  await app.register(adminDoctorsRoute);
  await app.register(adminPricingRoute);
  await app.register(adminAssetsRoute);
  await app.register(mediaPublicRoute);
  await app.register(adminMediaUploadRoute);
  await app.register(adminBlogPostsRoute);
  await app.register(blogPostsRoute);
  await app.register(adminFaqsRoute);
  await app.register(adminContentPagesRoute);

  return app;
}
