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

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(healthRoute);
  app.register(authRoute);
  app.register(appointmentsRoute);
  app.register(countriesRoute);
  app.register(doctorsRoute);
  app.register(servicesRoute);
  app.register(pricingRoute);
  app.register(assetsRoute);
  app.register(contactRoute);
  app.register(newsletterRoute);

  return app;
}
