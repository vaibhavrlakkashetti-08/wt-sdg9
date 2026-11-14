import app from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { pathToFileURL } from "node:url";

export async function startServer() {
  await connectToDatabase();

  const server = app.listen(env.port, () => {
    console.info(`API listening on http://localhost:${env.port}`);
  });

  return server;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}