import axios, { AxiosRequestConfig } from "axios";
import ClientError from "../models/client-error";

enum Circuit {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF = 'HALF'
};

interface EndpointState {
  failures: number;
  coolDownPeriod: number;
  circuit: Circuit,
  nextTry: number
};

class CircuitBreaker {
  public states: Record<string, EndpointState> = {};
  public failureThreshold: number = 5;
  public coolDownPeriod: number = 15 * 1000;
  public requestTimeout: number = 15 * 1000;

  async callService(requestOptions: AxiosRequestConfig) {
    const endpoint = `${requestOptions.method}:${requestOptions.url}`;
    if (!this.canRequest(endpoint)) {
      throw new Error(`Can not send request to ${endpoint}`);
    }

    requestOptions.timeout = this.requestTimeout;
    try {
      const res = await axios(requestOptions);
      this.onSuccess(endpoint);
      return res.data;
    } catch (error) {
      this.onFailure(endpoint);
      throw new ClientError(error?.status || 500, error?.message || 'error');
    }
  };

  onSuccess(endpoint: string): void {
    this.initialState(endpoint);
  };

  onFailure(endpoint: string): void {
    const endpointState = this.states[endpoint];
    endpointState.failures += 1;
    if (endpointState.failures > this.failureThreshold) {
      endpointState.circuit = Circuit.OPEN;
      endpointState.nextTry = new Date().valueOf() + this.coolDownPeriod;
      console.warn(`Alert! Circuit for ${endpoint} in OPEN state`);
    };
  };

  canRequest(endpoint: string): Boolean {
    if (!this.states[endpoint]) {
      this.initialState(endpoint);
    }
    const endpointState = this.states[endpoint];
    if (endpointState.circuit === Circuit.CLOSED) {
      return true;
    };

    const now = new Date().valueOf();
    if (endpointState.nextTry <= now) {
      endpointState.circuit = Circuit.HALF;
      return true;
    }

    throw Error(`Can not send request to ${endpoint}`);
  }

  initialState(endpoint: string): void {
    this.states[endpoint] = {
      failures: 0,
      coolDownPeriod: this.coolDownPeriod,
      circuit: Circuit.CLOSED,
      nextTry: 0
    };
  };

};

const circuitBreaker = new CircuitBreaker();
export default circuitBreaker;