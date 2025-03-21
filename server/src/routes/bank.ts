import express, { NextFunction, Request, Response } from "express";
import BankServices from "../services/bankServices";
import config from "../utils/config";

const router = express.Router();
const bankServices = new BankServices(config);

router.get('/fetch-user-banks-accounts/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const banks = await bankServices.fetchUserBanksAccounts(user_id);
    return res.status(200).json(banks);
  } catch (err: any) {
    next(err);
  }
});

router.get('/fetch-bank-account/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    const bank = await bankServices.fetchBankAccount(user_id, bank_id);
    res.status(200).json(bank);
  } catch (err: any) {
    next(err);
  }
});

router.post('/connect-bank/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const details = req.body;
    const response = await bankServices.connectBank(details, user_id);
    res.status(200).json(response);
  } catch (err: any) {
    next(err);
  }
});

router.put('/refresh-bank-data/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    const response = await bankServices.refreshBankData(bank_id, user_id);
    res.status(200).json(response);
  } catch (err: any) {
    next(err);
  }
});

router.post('/set-main-account/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    await bankServices.setMainBankAccount(user_id, bank_id);
    res.sendStatus(200);
  } catch (err: any) {
    next(err);
  }
});

router.delete('/remove-bank/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    await bankServices.removeBankAccount(user_id, bank_id);
    res.sendStatus(200);
  } catch (err: any) {
    next(err);
  }
});

export default router;