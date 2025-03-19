import bunyan, { LogLevel } from "bunyan";
import {
  ErrorMessages,
  MAX_LOGIN_ATTEMPTS,
  asNumString,
  getFutureDebitDate,
  isArray,
  isArrayAndNotEmpty,
  RefreshedBankAccountDetails,
  UserBankCredentialModel,
} from "./helpers";
import {
  CreditCardProviders,
  SupportedCompanies,
  createCredentials,
  createUpdateQuery,
  isCardProviderCompany,
} from "./bank-utils";
import * as jwt from "./jwt";

enum ENV_TYPE {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
}
const getLogger = (name: string, version: string, level: LogLevel) => {
  return bunyan.createLogger({ name: `${name}:${version}`, level });
};

const getLogLevel = (envType: ENV_TYPE): LogLevel => {
  return envType === ENV_TYPE.DEVELOPMENT ? "debug" : "info";
}

export {
  jwt,
  ErrorMessages,
  MAX_LOGIN_ATTEMPTS,
  asNumString,
  getFutureDebitDate,
  isArray,
  isArrayAndNotEmpty,
  getLogger,
  getLogLevel,
  ENV_TYPE,
  CreditCardProviders,
  SupportedCompanies,
  createCredentials,
  createUpdateQuery,
  isCardProviderCompany,
  RefreshedBankAccountDetails,
  UserBankCredentialModel,
};
