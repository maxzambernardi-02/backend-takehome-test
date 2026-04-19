import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import type { Store } from "../storage/index.js";
import { createIndividualsRouter } from "./routes/individuals.js";

export interface AppDependencies {
  readonly store: Store;
}

/**
 * Build the Express application with injected dependencies.
 *
 * The factory pattern keeps the app configurable and testable: each test can
 * construct an isolated store and pass it in, avoiding shared state.
 */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/individuals", createIndividualsRouter(deps.store));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { message: "Not Found" } });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message =
      typeof err?.message === "string" ? err.message : "Internal Server Error";
    res.status(status).json({ error: { message } });
  };
  app.use(errorHandler);

  return app;
}
