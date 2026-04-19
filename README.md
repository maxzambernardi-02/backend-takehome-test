# Sano Genetic Data — Backend Take-home Submission

A small TypeScript backend that parses a proprietary `.sano` genetic-data
format and exposes a REST API to upload and query results per individual.

The original assignment brief is preserved in [ASSIGNMENT.md](./ASSIGNMENT.md).

**Loom video:** _TODO_ — paste URL here before submitting.

---

## Contents

- [Stack](#stack)
- [Project layout](#project-layout)
- [Run it locally](#run-it-locally)
- [Tests](#tests)
- [API reference](#api-reference)
- [End-to-end walkthrough (the four README use cases)](#end-to-end-walkthrough-the-four-readme-use-cases)
- [Design notes and tradeoffs](#design-notes-and-tradeoffs)
- [What I would add with more time](#what-i-would-add-with-more-time)
- [AI usage](#ai-usage)

---

## Stack

- **Language:** TypeScript (strict mode).
- **Runtime:** Node.js 20+.
- **HTTP:** Express 4.
- **File uploads:** Multer (`memoryStorage`, 5 MB limit, one file per request).
- **Testing:** Vitest + Supertest.

No database. A `Store` interface defines the persistence boundary and the
current implementation is an in-memory `Map`. Swapping in SQLite or Postgres
would be a new module behind the same interface — no route changes.

## Project layout

```
src/
  parser/        # Part 1: .sano parser (pure, no I/O)
  storage/       # Store interface + in-memory implementation
  api/
    app.ts       # Express factory (middleware, routes, error handler)
    server.ts    # Entry point: builds store, listens on PORT
    routes/
      individuals.ts     # POST / GET /individuals
      geneticData.ts     # POST / GET /individuals/:id/genetic-data
```

## Run it locally

Prerequisites: **Node.js 20+** and **npm**.

```bash
npm install
npm run build
npm start
```

The server listens on **http://localhost:3000** by default. Override with
`PORT` / `HOST` environment variables.

Quick sanity check:

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

## Tests

```bash
npm test
```

50 tests covering the parser, app setup, individuals routes, and
genetic-data routes (including round-tripping the provided
`individual123.sano` sample).

---

## API reference

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/individuals` | Create an individual. JSON body `{ "id": "<id>" }`. |
| `GET`  | `/individuals` | List individual IDs. |
| `POST` | `/individuals/:id/genetic-data` | Upload a `.sano` file (multipart field `file`). Parses and **replaces** stored variants. |
| `GET`  | `/individuals/:id/genetic-data?variants=rs1,rs2` | Return stored variants, optionally filtered by variant IDs. |

**Error shape** (consistent across the API):

```json
{ "error": { "message": "<human readable>", "details": { "...": "optional" } } }
```

Status codes:

- `400` — bad JSON body, bad file upload, parser validation failure.
- `404` — individual does not exist.
- `409` — individual with that ID already exists.
- `201` — created (individual) / upload accepted.
- `200` — list / read success.

`id` constraints (documented choice, easy to relax): 1–64 characters of
`[A-Za-z0-9_-]`.

---

## End-to-end walkthrough (the four README use cases)

Start the server in one terminal (`npm start`), then run the commands below
in another.

### 1. Create `individual123`

```bash
curl -s -X POST http://localhost:3000/individuals \
  -H 'Content-Type: application/json' \
  -d '{"id":"individual123"}'
```

Expected: `201 Created`

```json
{"id":"individual123"}
```

### 2. List individuals

```bash
curl -s http://localhost:3000/individuals
```

Expected: `200 OK`

```json
{"individuals":["individual123"]}
```

### 3. Upload the sample `.sano` file

```bash
curl -s -X POST http://localhost:3000/individuals/individual123/genetic-data \
  -F "file=@individual123.sano"
```

Expected: `201 Created`

```json
{"individualId":"individual123","count":4}
```

> Note: the upload field **must** be named `file` and the request must be
> `multipart/form-data` (that is what `-F` does in curl).

### 4a. Read all genetic data for `individual123`

```bash
curl -s http://localhost:3000/individuals/individual123/genetic-data
```

Expected: `200 OK`, a payload containing the four parsed rows:

```json
{
  "individualId": "individual123",
  "variants": [
    { "variantId": "rs12345", "chromosome": 1, "position": 1234567, "referenceAllele": "A", "alternateAllele": "G", "alternateAlleleFrequency": 0.12 },
    { "variantId": "rs67890", "chromosome": 2, "position": 2345678, "referenceAllele": "C", "alternateAllele": "T", "alternateAlleleFrequency": 0.34 },
    { "variantId": "rs13579", "chromosome": "X", "position": 3456789, "referenceAllele": "G", "alternateAllele": "A", "alternateAlleleFrequency": 0.45 },
    { "variantId": "rs24680", "chromosome": "Y", "position": 4567890, "referenceAllele": "T", "alternateAllele": "C", "alternateAlleleFrequency": 0.67 }
  ]
}
```

### 4b. Filter to two specific variants

```bash
curl -s "http://localhost:3000/individuals/individual123/genetic-data?variants=rs12345,rs24680"
```

Expected: `200 OK`, only the two requested rows (order matches stored order):

```json
{
  "individualId": "individual123",
  "variants": [
    { "variantId": "rs12345", "chromosome": 1, "position": 1234567, "referenceAllele": "A", "alternateAllele": "G", "alternateAlleleFrequency": 0.12 },
    { "variantId": "rs24680", "chromosome": "Y", "position": 4567890, "referenceAllele": "T", "alternateAllele": "C", "alternateAlleleFrequency": 0.67 }
  ]
}
```

---

## Design notes and tradeoffs

**Parser (Part 1)**

- **Strict by default.** Any missing / invalid field is a failure with
  `{ line, field, rawValue, message }`.
- **Fail-fast.** Returns the first error; multi-error collection is an
  easy follow-up behind the same `ParseSanoResult` shape.
- **Header handling.** Column order is flexible (mapped by label), but
  labels must match the spec strings exactly. No aliases, no case folding.
- **Simple CSV.** `split(',')` — commas in values are not supported; the
  spec shows no quoting so this is acceptable.
- **Extra rules I picked and documented:**
  - `ref !== alt` (a variant must differ from the reference).
  - Variant IDs must be unique within a single file.
  - Chromosome `X`/`Y` only uppercase.
  - Trailing blank lines are skipped; inner blank lines are errors.

**Storage**

- `Store` interface (`src/storage/types.ts`) is the seam between routes and
  persistence. Today it is implemented in-memory (`Map`s). A SQLite or
  Postgres version would plug in without touching any HTTP code.
- **Upload replaces** previously stored variants for that individual.
  Replace is simpler and easier to demo; merge could be added behind the
  same interface.

**HTTP layer**

- Factory-style `createApp({ store })` so tests get a fresh store per test
  and `server.ts` is the only file that calls `.listen(...)`.
- One shared error shape (`{ error: { message, details? } }`) across 400 /
  404 / 409 / 500.
- 5 MB upload cap and single-file enforcement via Multer.

**Parser ↔ API handoff**

- Parser is pure: takes a UTF-8 **string**, returns typed variants or a
  structured error.
- The upload route is the only place that knows about Multer / buffers. It
  reads `req.file.buffer.toString("utf8")`, then hands off to `parseSano`.

## What I would add with more time

- **Durable storage:** SQLite implementation of `Store` (individuals table,
  variants table, index on `(individual_id, variant_id)` for the filter
  query).
- **Multi-error parsing:** collect all row-level errors before returning,
  bounded by a max-errors limit.
- **Bulk operations:** create/list multiple individuals, upload many files
  in one request (NDJSON or ZIP), with per-item success reporting.
- **Auth & quotas:** API keys, per-individual ownership, request rate
  limiting via `express-rate-limit` or an API gateway.
- **Observability:** request IDs, structured logs (pino), a `/metrics`
  endpoint.
- **Stricter upload handling:** stream parsing so very large files don't
  need to live in memory; verify declared MIME type.
- **Schema validation with Zod** at the edge so error messages are
  consistent between route validation and domain validation.