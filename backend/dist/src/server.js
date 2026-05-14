import { createServer } from "node:http";
import { z } from "zod";
import { createPresignedPut } from "../lib/storage/presign.js";
const DEFAULT_PORT = 4000;
const MAX_JSON_BYTES = 128 * 1024;
const allowedContentTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/svg+xml",
];
const presignSchema = z.object({
    kind: z.enum(["doctor", "service", "country", "category"]),
    filename: z.string().min(1).max(200),
    contentType: z.enum(allowedContentTypes),
    size: z.number().int().positive().max(5 * 1024 * 1024),
});
function allowedOrigins() {
    const configured = [
        process.env.FRONTEND_ORIGIN,
        process.env.NEXT_PUBLIC_SITE_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ];
    return new Set(configured.filter((value) => Boolean(value)).map((value) => value.replace(/\/+$/, "")));
}
function applyCors(req, res) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins().has(origin.replace(/\/+$/, ""))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}
function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}
async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_JSON_BYTES) {
            throw new Error("Payload too large");
        }
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function handleRequest(req, res) {
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
        }
        catch (err) {
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
//# sourceMappingURL=server.js.map