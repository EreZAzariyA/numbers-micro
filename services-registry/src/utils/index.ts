import bunyan, { LogLevel } from 'bunyan';
import config from './config';

enum ENV_TYPE {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
};

const getLogger = (name: string, version: string, level: LogLevel) => (
  bunyan.createLogger({ name: `${name}:${version}`, level })
);

const getLogLevel = (envType: ENV_TYPE.DEVELOPMENT | ENV_TYPE.PRODUCTION) => {
  let logLevel: LogLevel;
  switch(envType) {
    case ENV_TYPE.DEVELOPMENT:
      logLevel = 'debug';
      break;
    default:
      logLevel = 'info';
  };

  return logLevel;
};

export {
  ENV_TYPE,
  getLogger,
  getLogLevel,
  config
};