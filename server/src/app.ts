import cors from "cors";
import { exec } from "child_process";
import express, { NextFunction, Request, Response } from "express";
import connectToMongoDB from "./dal/dal";
import config from "./utils/config";
import routes from "./routes";
import errorsHandler from "./middlewares/errors-handler";
import verifyToken from "./middlewares/verify-token";
import { importTransactions } from "./bll/transactions";
import path from "path";

const app = express();
app.use(cors({
  origin: config.corsUrls,
  credentials: true,
  methods: 'GET,POST,PUT,DELETE,PATCH'
}));
app.use(express.json());

app.use('/api/auth', routes.authenticationRouter);
app.use('/api/user', verifyToken, routes.usersRouter);
app.use('/api/transactions', verifyToken, routes.transactionsRouter);
app.use('/api/categories', verifyToken, routes.categoriesRouter);
app.use('/api/banks', verifyToken, routes.bankRouter);

app.post('/api/import-transactions/:user_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.params.user_id;
    const { transactions, companyId } = req.body;
    console.log(user_id, companyId);
    
    const response = await importTransactions(transactions, user_id, companyId);
    res.status(200).json(response);
  } catch (err: any) {
    next(err);
  }
});

const scriptPath = path.join(__dirname, '..', 'deploy.sh');
app.post('/deploy', (_, res: Response) => {
  console.log(`Received POST request to deploy. executing from ${scriptPath}`);
  exec(scriptPath, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error executing script: ${err}`);
      return res.status(500).send(`Error executing script: ${stderr}`);
    }

    console.log(`Deployment successful!!.. Script output: ${stdout}`);
    res.status(200).send('Deployment successful');
  });
});

app.use("*", (_, res: Response) => {
  res.status(404).send('Route Not Found');
});

app.listen(config.port, () => {
  console.log(`Listening on port: ${config.port}, isProduction: ${config.isProduction}`);

  connectToMongoDB().then((collectionName) => {
    console.log(`Successfully connected to: ${collectionName}`);
  });
});

app.use(errorsHandler);