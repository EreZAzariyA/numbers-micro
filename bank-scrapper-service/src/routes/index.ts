import { Router, Request, Response, NextFunction } from "express";
import bankLogic from "../logic/banks";

const router = Router();

router.get('/fetch-user-banks-accounts/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const banks = await bankLogic.fetchUserBanksAccounts(user_id);
    res.status(200).json(banks);
  } catch (err: any) {
    next(err);
  }
});

router.get('/fetch-bank-account/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    const bank = await bankLogic.fetchBankAccount(user_id, bank_id);
    res.status(200).json(bank);
  } catch (err: any) {
    next(err);
  }
});

router.post('/connect-bank/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const details = req.body;
    const response = await bankLogic.connectBank(details, user_id);
    res.status(200).json(response);
  } catch (err: any) {
    next(err);
  }
});

router.put('/refresh-bank-data/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const { bank_id, newDetailsCredentials } = req.body;
    const response = await bankLogic.refreshBankData(user_id, bank_id, newDetailsCredentials);
    res.status(200).json(response);
  } catch (err: any) {
    next(err);
  }
});

router.post('/set-main-account/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    await bankLogic.setMainBankAccount(user_id, bank_id);
    res.sendStatus(200);
  } catch (err: any) {
    next(err);
  }
});

router.delete('/remove-bank/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const bank_id = req.body.bank_id;
    await bankLogic.removeBankAccount(user_id, bank_id);
    res.sendStatus(200);
  } catch (err: any) {
    next(err);
  }
});

export default router;