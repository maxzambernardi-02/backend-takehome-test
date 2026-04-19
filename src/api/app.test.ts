import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "./app.js";
import { createInMemoryStore } from "../storage/index.js";

const buildApp = () => createApp({ store: createInMemoryStore() });

describe("express app", () => {
  it("responds to GET /health", async () => {
    const res = await request(buildApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(buildApp()).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Not Found" } });
  });
});
