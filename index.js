import express, { json, urlencoded } from "express";

import { sagedriverCompletion,test } from "./driverroutes.js";
import { corsMiddleware, rateLimitMiddleware } from "./middlewares.js";

import { DEBUG, SERVER_PORT, WEBDRIVERMODE } from "./config.js";
import { tunnel } from "cloudflared";

let app = express();

process.on("uncaughtException", function (err) {
  if (DEBUG) console.error(`Caught exception: ${err}`);
});

// Middlewares
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(json());
app.use(urlencoded({ extended: true }));

// Register routes
app.all("/", async function (req, res) {
  res.set("Content-Type", "application/json");
  return res.status(200).send({
    status: true,
    github: "https://github.com/4e4f4148/JanitorAI-POE-Proxy",
    discord:
      "https://discord.com/channels/563783473115168788/1129375417673977867",
  });
});

const { url, connections, child, stop } = tunnel({
  "--url": `localhost:${SERVER_PORT}`,
});
let baselink = await url;

if(WEBDRIVERMODE)
console.log(`Sage driver proxy url: ${baselink}/v2/driver/sage`);

app.post("/v2/driver/sage/chat/completions", sagedriverCompletion);
app.post("/test", test);

app.get("/v2/driver/sage/", async function (req, res) {
  res.set("Content-Type", "application/json");
  return res.status(200).send({
    status: true,
    port: SERVER_PORT,
  });
});

console.log(`Sage driver: http://localhost:${SERVER_PORT}/v2/driver/sage`);

console.log(`Proxy is running on PORT ${SERVER_PORT} ...`);

// Start server
app.listen(SERVER_PORT, () => {
  console.log(`LOCAL URL: http://localhost:${SERVER_PORT}/v2/driver/sage`);
  //   console.log(`Proxy is running on PORT ${SERVER_PORT} ...`);
});
