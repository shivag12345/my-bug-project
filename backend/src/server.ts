import http from "node:http";
import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocket } from "./realtime/socket.js";
import { seedDefaults } from "./seed.js";

await connectDb();
await seedDefaults();

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`Bug Tracking API listening on ${env.port}`);
});
