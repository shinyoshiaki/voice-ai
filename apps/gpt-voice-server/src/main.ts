import fastify from "fastify";

import { config } from "./config";
import { register } from "./routes";

void (async () => {
  const server = fastify();
  await register(server);
  server.listen({ port: config.port, host: "0.0.0.0" });
})();

console.log({ config });
