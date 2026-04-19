import { createApp } from "./app.js";
import { createInMemoryStore } from "../storage/index.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const store = createInMemoryStore();
const app = createApp({ store });

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});
