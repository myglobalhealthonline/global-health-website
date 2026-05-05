import "dotenv/config";

import cors from "@fastify/cors";
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

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(healthRoute);
  await app.register(authRoute);
  await app.register(appointmentsRoute);
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

  return app;
}
