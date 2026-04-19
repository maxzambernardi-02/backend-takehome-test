import { describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../app.js";
import { createInMemoryStore } from "../../storage/index.js";

const buildApp = () => createApp({ store: createInMemoryStore() });

describe("GET /individuals", () => {
  it("returns an empty list when no individuals exist", async () => {
    const res = await request(buildApp()).get("/individuals");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ individuals: [] });
  });

  it("lists ids after creation, preserving insertion order", async () => {
    const app = buildApp();

    await request(app).post("/individuals").send({ id: "alice" });
    await request(app).post("/individuals").send({ id: "bob" });

    const res = await request(app).get("/individuals");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ individuals: ["alice", "bob"] });
  });
});

describe("POST /individuals", () => {
  it("creates an individual and returns 201 with the id", async () => {
    const res = await request(buildApp())
      .post("/individuals")
      .send({ id: "individual123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "individual123" });
  });

  it("returns 409 when the individual already exists", async () => {
    const app = buildApp();

    const first = await request(app)
      .post("/individuals")
      .send({ id: "dup" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/individuals")
      .send({ id: "dup" });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/already exists/);
  });

  it("returns 400 when body is missing 'id'", async () => {
    const res = await request(buildApp()).post("/individuals").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/'id'/);
  });

  it("returns 400 when 'id' is not a string", async () => {
    const res = await request(buildApp())
      .post("/individuals")
      .send({ id: 123 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'id' contains invalid characters", async () => {
    const res = await request(buildApp())
      .post("/individuals")
      .send({ id: "bad id!" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'id' is empty after trim", async () => {
    const res = await request(buildApp())
      .post("/individuals")
      .send({ id: "   " });
    expect(res.status).toBe(400);
  });
});
