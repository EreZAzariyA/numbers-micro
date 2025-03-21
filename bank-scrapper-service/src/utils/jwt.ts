import { Request } from "express";
import jwt, { VerifyErrors } from "jsonwebtoken";
import { ClientError } from "../models";
import { ErrorMessages, UserBankCredentialModel } from "."

const secretKey = 'config.secretKey';

export function createNewToken(data: any, customExpiresIn: number = 30 * 60 * 60 * 1000): string {
  const token = jwt.sign(data, secretKey, { expiresIn: customExpiresIn });
  return token;
};

export function verifyToken(request: Request): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const token = request.headers.authorization?.substring(7);
      if (!token) {
        const error = new ClientError(401, 'No token provide');
        reject(error);
      }

      jwt.verify(token, secretKey, async (err: VerifyErrors) => {
        if (err) {
          const error = new ClientError(401, ErrorMessages.TOKEN_EXPIRED);
          reject(error);
        }

        resolve(!!token);
      });
    }
    catch (err: any) {
      reject(err);
    }
  });
};

export async function fetchBankCredentialsFromToken(token: string): Promise<UserBankCredentialModel> {
  const payload = jwt.decode(token);
  return (payload as any);
};