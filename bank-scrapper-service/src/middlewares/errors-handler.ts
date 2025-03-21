import { NextFunction, Request, Response } from "express";
import { ClientError } from "../models";
import config from "../utils/config";

export function errorsHandler(err: any, request: Request, response: Response, next: NextFunction): void {
  if (err instanceof Error && (err as any).code === 11000) {
    if ((err as any).keyValue['emails.email']) {
      response.status((err as any).status || 500).send("Email already exist, try to log-in");
      return;
    }
  }
  if (err instanceof Error) {
    response.status((err as any).status || 500).send('Some error, please contact us');
    config.log.error({ method: request.method, url: request.url }, { route: request.path, error: err.message });
    return;
  }
  if (err instanceof ClientError) {
    config.log.error({ method: request.method, url: request.url }, { route: request.path, err: err.message });
    response.status(err.status).send(err.message);
    return;
  }

  next();
};