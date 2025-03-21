import bunyan, { LogLevel } from 'bunyan';
import config from './config';

enum ENV_TYPE {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
};

const getLogger = (name: string, version: string, level: LogLevel) => {
  return bunyan.createLogger({
    name: `${name}:${version}`,
    level,
    streams: [
      {
        stream: process.stdout,
        level
      }
    ]
  });
};

const getLogLevel = (envType: ENV_TYPE): LogLevel => {
  return envType === ENV_TYPE.DEVELOPMENT ? "debug" : "info";
};

export {
  ENV_TYPE,
  getLogger,
  getLogLevel,
  config
};