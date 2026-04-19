import { Router, type Request, type Response } from "express";

import type { Store } from "../../storage/index.js";

const INDIVIDUAL_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

interface CreateIndividualBody {
  id?: unknown;
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({ error: { message } });
}

export function createIndividualsRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ individuals: store.listIndividualIds() });
  });

  router.post("/", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as CreateIndividualBody;

    if (typeof body.id !== "string") {
      badRequest(res, "Request body must include 'id' as a string");
      return;
    }

    const id = body.id.trim();
    if (!INDIVIDUAL_ID_RE.test(id)) {
      badRequest(
        res,
        "'id' must be 1-64 characters using letters, digits, '-' or '_'",
      );
      return;
    }

    const result = store.createIndividual(id);
    if (!result.ok) {
      res.status(409).json({
        error: { message: `Individual '${id}' already exists` },
      });
      return;
    }

    res.status(201).json({ id: result.individual.id });
  });

  return router;
}
