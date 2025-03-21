import axios, { AxiosRequestConfig } from "axios";
import circuitBreaker from '../middlewares/circuit-breaker';
import { Service } from "../bll/services-logic";

class BankServices {
  public serviceRegistryUrl: string;
  public serviceVersion: string;
  public cache: object;

  constructor({ serviceRegistryUrl, serviceVersion }) {
    this.serviceRegistryUrl = serviceRegistryUrl;
    this.serviceVersion = serviceVersion;
    this.cache = {};
  };

  async fetchUserBanksAccounts(user_id: string) {
    const { ip, port } = await this.getService('bank-scrapper-service');
    return this.callService({
      method: 'get',
      url: `http://${ip}:${port}/fetch-user-banks-accounts/${user_id}`,
    });
  };

  async fetchBankAccount(user_id: string, bank_id: string) {
    const { ip, port } = await this.getService('bank-scrapper-service');
    return this.callService({
      method: 'get',
      url: `http://${ip}:${port}/fetch-bank-account/${user_id}`,
      data: { bank_id }
    });
  };

  async connectBank(details: any, user_id: string) {
    const { ip, port } = await this.getService('bank-scrapper-service');
    return this.callService({
      method: 'post',
      url: `http://${ip}:${port}/connect-bank/${user_id}`,
      data: details
    });
  };

  async refreshBankData(
    bank_id: string,
    user_id: string,
    newDetailsCredentials?: string
  ) {
    const { ip, port } = await this.getService('bank-scrapper-service');
    return this.callService({
      method: 'put',
      url: `http://${ip}:${port}/refresh-bank-data/${user_id}`,
      data: { bank_id, newDetailsCredentials }
    });
  };

  async setMainBankAccount(user_id: string, bank_id: string): Promise<void> {
    const { ip, port } = await this.getService('bank-scrapper-service');
    console.log(user_id);
    
    return this.callService({
      method: 'post',
      url: `http://${ip}:${port}/set-main-account/${user_id}`,
      data: { bank_id },
    });
  };

  async removeBankAccount(user_id: string, bank_id: string): Promise<void> {
    const { ip, port } = await this.getService('bank-scrapper-service');
    return this.callService({
      method: 'delete',
      url: `http://${ip}:${port}/remove-bank/${user_id}`,
      data: { bank_id }
    });
  };

  async getService(name: string): Promise<Service> {
    const { serviceRegistryUrl, serviceVersion } = this;
    const res = await axios.get(`${serviceRegistryUrl}/find/${name}/${serviceVersion}`);

    return res.data;
  };

  async callService(requestOptions: AxiosRequestConfig) {
    const result = await circuitBreaker.callService(requestOptions);
    return result;
  };
};

export default BankServices;