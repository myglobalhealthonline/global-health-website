import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./index.js";
import {
  signAdminSession,
  verifyAdminSession,
} from "../lib/auth/session.js";
import { writeAudit } from "../lib/audit/log.js";
import { createPresignedPut } from "../lib/storage/presign.js";

const DEFAULT_PORT = 4000;
const MAX_JSON_BYTES = 128 * 1024;

const allowedContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

const presignSchema = z.object({
  kind: z.enum(["doctor", "service", "country", "category"]),
  filename: z.string().min(1).max(200),
  contentType: z.enum(allowedContentTypes),
  size: z.number().int().positive().max(5 * 1024 * 1024),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

function allowedOrigins(): Set<string> {
  const configured = [
    process.env.FRONTEND_ORIGIN,
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
  return new Set(configured.filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/+$/, "")));
}

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin.replace(/\/+$/, ""))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBearerToken(req: IncomingMessage) {
  const value = req.headers.authorization;
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim() || null;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_JSON_BYTES) {
      throw new Error("Payload too large");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "global-health-backend" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/auth/login") {
    try {
      const body = await readJson(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { ok: false, message: "Invalid email or password" });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          role: true,
          active: true,
        },
      });
      if (!user || !user.active) {
        sendJson(res, 401, { ok: false, message: "Invalid email or password" });
        return;
      }
      if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
        sendJson(res, 403, { ok: false, message: "Account is not authorised for the admin area" });
        return;
      }

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) {
        sendJson(res, 401, { ok: false, message: "Invalid email or password" });
        return;
      }

      const token = await signAdminSession({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      await writeAudit({
        userId: user.id,
        action: "auth.login",
        entity: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      });

      sendJson(res, 200, {
        ok: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      sendJson(res, 500, { ok: false, message });
      return;
    }
  }

  if (req.method === "GET" && url.pathname === "/api/admin/auth/session") {
    const token = readBearerToken(req);
    if (!token) {
      sendJson(res, 401, { ok: false, message: "Not authenticated" });
      return;
    }

    const payload = await verifyAdminSession(token);
    if (!payload) {
      sendJson(res, 401, { ok: false, message: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user || !user.active || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      sendJson(res, 401, { ok: false, message: "Not authenticated" });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/auth/logout") {
    const token = readBearerToken(req);
    if (token) {
      const payload = await verifyAdminSession(token);
      if (payload) {
        await writeAudit({
          userId: payload.sub,
          action: "auth.logout",
          entity: "User",
          entityId: payload.sub,
          metadata: { email: payload.email },
        });
      }
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/media/presign") {
    try {
      const body = await readJson(req);
      const parsed = presignSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { ok: false, message: "Invalid payload", details: parsed.error.flatten() });
        return;
      }
      const result = await createPresignedPut(parsed.data);
      sendJson(res, 200, { ok: true, ...result, expiresIn: 300 });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Presign failed";
      sendJson(res, message === "Payload too large" ? 413 : 500, { ok: false, message });
      return;
    }
  }

  sendJson(res, 404, { ok: false, message: "Not found" });
}

const port = Number(process.env.PORT ?? DEFAULT_PORT);

createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("[server] unhandled request error", err);
    sendJson(res, 500, { ok: false, message: "Internal server error" });
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`[backend] listening on ${port}`);
});
