require('dotenv').config();
import Logger from 'bunyan';
import { name, version } from '../../package.json';
import { ENV_TYPE, getLogger, getLogLevel } from '.';

export abstract class Config {
  public port: number = +process.env.PORT;
  public serviceTimeout = 10000;
  public log: Logger;
};

class DevelopmentConfig extends Config {
  public constructor() {
    super();
    this.log = getLogger(name, version, getLogLevel(ENV_TYPE.DEVELOPMENT));
  };
};

class ProductionConfig extends Config {
  public constructor() {
    super();
    this.log = getLogger(name, version, getLogLevel(ENV_TYPE.PRODUCTION))
  };
};

const config = process.env.NODE_ENV !== "production" ? new DevelopmentConfig() : new ProductionConfig();

export default config;
