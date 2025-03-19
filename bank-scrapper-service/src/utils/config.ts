require('dotenv').config();
import Logger from 'bunyan';
import { name, version } from '../../package.json';
import { ENV_TYPE, getLogger, getLogLevel } from '.';

export abstract class Config {
  public name: string = name;
  public version: string = version;
  public port: number;
  public mongoConnectionString: string;
  public serviceTimeout = 10000;
  public log: Logger;
  public mainServerUrl = process.env.SERVER_URL;
};

class DevelopmentConfig extends Config {
  public constructor() {
    super();
    this.log = getLogger(name, version, getLogLevel(ENV_TYPE.DEVELOPMENT));
    this.port = +process.env.PORT;
    this.mongoConnectionString = 'mongodb://localhost:27017/numbers';
  };
};

class ProductionConfig extends Config {
  public constructor() {
    super();
    this.log = getLogger(name, version, getLogLevel(ENV_TYPE.PRODUCTION))
    this.port = 0;
    this.mongoConnectionString = process.env.MONGO_CONNECTION_STRING;
  };
};

const config = process.env.NODE_ENV !== "production" ? new DevelopmentConfig() : new ProductionConfig();
export default config;
