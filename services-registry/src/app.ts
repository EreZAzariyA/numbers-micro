import express from "express";
import cors from "cors";
import config from "./utils/config";
import routes from "./routes";

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

app.use('/', routes.main);

if (isNaN(config.port)) {
  config.log.warn({ PORT: config.port }, 'Invalid port number');
  process.exit(0);
};

app.listen(config.port, () => {
  config.log.info(`Listening on port: ${config.port} in ${app.get('env')} mode.`);
});