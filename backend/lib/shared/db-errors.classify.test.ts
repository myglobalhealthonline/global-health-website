import assert from "node:assert/strict";
import test from "node:test";
import { classifyDatabaseConnectivityError } from "./db-errors.js";

test("classifyDatabaseConnectivityError maps errno codes", () => {
  assert.equal(classifyDatabaseConnectivityError({ code: "ECONNREFUSED" }), "ECONNREFUSED");
  assert.equal(classifyDatabaseConnectivityError({ code: "ENOTFOUND" }), "ENOTFOUND");
});

test("classifyDatabaseConnectivityError maps auth failure message", () => {
  assert.equal(
    classifyDatabaseConnectivityError(new Error("password authentication failed for user \"x\"")),
    "AUTH_FAILED",
  );
});

test("classifyDatabaseConnectivityError maps missing relation", () => {
  assert.equal(
    classifyDatabaseConnectivityError(new Error('relation "Country" does not exist')),
    "SCHEMA_NOT_MIGRATED",
  );
});

test("classifyDatabaseConnectivityError maps Prisma unreachable message", () => {
  assert.equal(
    classifyDatabaseConnectivityError(new Error(`Can't reach database server at localhost:5432`)),
    "UNREACHABLE",
  );
});
