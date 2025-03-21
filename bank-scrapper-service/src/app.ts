import axios from "axios";
import express from "express";
import cors from "cors";
import connectToMongoDB from "./dal";
import router from "./routes";
import { errorsHandler } from "./middlewares";
import config from "./utils/config";

const app = express();

app.use(express.json());
app.use(cors({ origin: '*'}));

app.use('/', router);

if (config.port && typeof config.port !== 'number' || isNaN(config.port)) {
  config.log.fatal({ PORT: config?.port }, 'Invalid port number');
  process.exit(0);
};

const server = app.listen(config.port, () => {
  const port = (server.address() as any).port;
  const url = process.env.SERVICE_REGISTRY_URL || 'http://localhost:5001';
  if (!url) {
    config.log.fatal({ SERVICE_REGISTRY_URL: url }, 'Service registry url not found');
    process.exit(0);
  }

  const registerService = () => axios.put(`${url}/register/${config.name}/${config.version}/${port}`);
  const unregisterService = () => axios.delete(`${url}/unregister/${config.name}/${config.version}/${port}`);

  registerService();

  const interval = setInterval(registerService, 15 * 1000);
  const cleanup = async () => {
    clearInterval(interval);
    await unregisterService();
  };

  process.on('uncaughtException', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  config.log.info(`Listening on port ${port} on ${app.get('env')} mode`);

  connectToMongoDB().then((collectionName) => {
    config.log.info(`Successfully connected to: ${collectionName}`);
  });
});

app.use(errorsHandler);