import { Router, type Request, type Response } from "express";
import multer from "multer";

import { parseSano } from "../../parser/index.js";
import type { Store } from "../../storage/index.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

function notFound(res: Response, individualId: string): void {
  res.status(404).json({
    error: { message: `Individual '${individualId}' not found` },
  });
}

function readIndividualId(req: Request): string {
  const raw = req.params.individualId;
  return typeof raw === "string" ? raw : "";
}

function parseVariantsQuery(raw: unknown): ReadonlySet<string> | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return new Set();
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return new Set(ids);
}

export function createGeneticDataRouter(store: Store): Router {
  const router = Router({ mergeParams: true });

  router.post("/", upload.single("file"), (req: Request, res: Response) => {
    const individualId = readIndividualId(req);

    if (!store.hasIndividual(individualId)) {
      notFound(res, individualId);
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        error: {
          message: "Multipart field 'file' with a .sano upload is required",
        },
      });
      return;
    }

    const contents = file.buffer.toString("utf8");
    const parseResult = parseSano(contents);
    if (!parseResult.ok) {
      res.status(400).json({
        error: {
          message: "Failed to parse .sano file",
          details: parseResult.error,
        },
      });
      return;
    }

    const saveResult = store.saveVariants(individualId, parseResult.variants);
    if (!saveResult.ok) {
      notFound(res, individualId);
      return;
    }

    res.status(201).json({
      individualId,
      count: saveResult.count,
    });
  });

  router.get("/", (req: Request, res: Response) => {
    const individualId = readIndividualId(req);

    if (!store.hasIndividual(individualId)) {
      notFound(res, individualId);
      return;
    }

    const filter = parseVariantsQuery(req.query.variants);
    const result = store.getVariants(individualId, filter);
    if (!result.ok) {
      notFound(res, individualId);
      return;
    }

    res.status(200).json({
      individualId,
      variants: result.variants,
    });
  });

  return router;
}
