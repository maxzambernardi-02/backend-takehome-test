import { describe, expect, it } from "vitest";
import request from "supertest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { createApp } from "../app.js";
import { createInMemoryStore } from "../../storage/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const SAMPLE_PATH = resolve(repoRoot, "individual123.sano");
const SAMPLE_BYTES = readFileSync(SAMPLE_PATH);

const buildApp = () => createApp({ store: createInMemoryStore() });

async function createIndividual(app: ReturnType<typeof buildApp>, id: string) {
  const res = await request(app).post("/individuals").send({ id });
  expect(res.status).toBe(201);
}

describe("POST /individuals/:id/genetic-data", () => {
  it("parses the uploaded .sano file and stores 4 variants", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");

    const res = await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano");

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ individualId: "individual123", count: 4 });
  });

  it("returns 404 when the individual does not exist", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/individuals/ghost/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano");

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it("returns 400 when 'file' field is missing", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");

    const res = await request(app).post(
      "/individuals/individual123/genetic-data",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/file/i);
  });

  it("returns 400 with parser details on invalid .sano content", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");

    const bad = Buffer.from(
      "#Variant ID,Chromosome,Position on chromosome,Reference allele,Alternate allele,Alternate allele frequency\nrs1,23,100,A,G,0.1\n",
      "utf8",
    );
    const res = await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", bad, "bad.sano");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/parse/i);
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.line).toBe(2);
  });

  it("replaces previous variants when uploaded twice", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");

    await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano")
      .expect(201);

    const smaller = Buffer.from(
      "#Variant ID,Chromosome,Position on chromosome,Reference allele,Alternate allele,Alternate allele frequency\nrsOnly,1,100,A,G,0.1\n",
      "utf8",
    );
    const second = await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", smaller, "smaller.sano");

    expect(second.status).toBe(201);
    expect(second.body.count).toBe(1);

    const get = await request(app).get(
      "/individuals/individual123/genetic-data",
    );
    expect(get.status).toBe(200);
    expect(get.body.variants.map((v: { variantId: string }) => v.variantId)).toEqual([
      "rsOnly",
    ]);
  });
});

describe("GET /individuals/:id/genetic-data", () => {
  it("returns empty variants when none uploaded", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");

    const res = await request(app).get(
      "/individuals/individual123/genetic-data",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ individualId: "individual123", variants: [] });
  });

  it("returns all variants after upload", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");
    await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano")
      .expect(201);

    const res = await request(app).get(
      "/individuals/individual123/genetic-data",
    );

    expect(res.status).toBe(200);
    expect(res.body.individualId).toBe("individual123");
    expect(res.body.variants).toHaveLength(4);
    expect(
      res.body.variants.map((v: { variantId: string }) => v.variantId),
    ).toEqual(["rs12345", "rs67890", "rs13579", "rs24680"]);
  });

  it("filters to the requested variant IDs", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");
    await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano")
      .expect(201);

    const res = await request(app).get(
      "/individuals/individual123/genetic-data?variants=rs12345,rs24680",
    );

    expect(res.status).toBe(200);
    expect(
      res.body.variants.map((v: { variantId: string }) => v.variantId),
    ).toEqual(["rs12345", "rs24680"]);
  });

  it("returns 404 when the individual does not exist", async () => {
    const res = await request(buildApp()).get(
      "/individuals/ghost/genetic-data",
    );
    expect(res.status).toBe(404);
  });

  it("returns empty list when filter matches nothing", async () => {
    const app = buildApp();
    await createIndividual(app, "individual123");
    await request(app)
      .post("/individuals/individual123/genetic-data")
      .attach("file", SAMPLE_BYTES, "individual123.sano")
      .expect(201);

    const res = await request(app).get(
      "/individuals/individual123/genetic-data?variants=rsNope",
    );
    expect(res.status).toBe(200);
    expect(res.body.variants).toEqual([]);
  });
});
