require('dotenv').config();
import { name, version } from '../../package.json';

abstract class Config {
  public name: string = name;
  public version: string = version;
  public port: number = +process.env.PORT;
  public isProduction: boolean;
  public loginExpiresIn: number; // In secondes
  public mongoConnectionString: string;
  public secretKey = process.env.SECRET_KEY || "SECRET_KEY";
  public corsUrls: string[];
  public serviceRegistryUrl: string = process.env.SERVICE_REGISTRY_URL;
  public serviceVersion: string = '1.x.x';
};

class DevelopmentConfig extends Config {
  public constructor() {
    super();
    this.isProduction = false;
    this.loginExpiresIn = 3 * 60 * 60;
    this.mongoConnectionString = "mongodb://127.0.0.1:27017/numbers";
    this.corsUrls = ['http://127.0.0.1:3000', 'http://localhost:3000'];
  };
};

class ProductionConfig extends Config {
  public constructor() {
    super();
    this.isProduction = true;
    this.loginExpiresIn = 30 * 60;
    this.mongoConnectionString = process.env.MONGO_CONNECTION_STRING;
    this.corsUrls = ['http://localhost:3000', 'https://ea-numbers.vercel.app', 'https://ea-numbers-test.vercel.app'];
  };
};

const config = process.env.NODE_ENV !== "production" ? new DevelopmentConfig() : new ProductionConfig();

export default config;
