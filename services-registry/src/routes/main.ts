import { Router, Request, Response } from 'express';
import { microservices } from '../services';

const router = Router();

router.get('/find/:name/:version', async (req: Request, res: Response) => {
  const { name, version } = req.params;
  const service = microservices.get(name, version);
  if (!service) {
    res.status(404).json(`Service ${name} not found`);
    console.warn(`Service ${name} not found`);
  }

  res.status(200).json(service);
});

router.put('/register/:name/:version/:port', async (req: Request, res: Response) => {
  const { name, version, port } = req.params;
  const remoteAddress = req.connection.remoteAddress;
  const serviceIp = remoteAddress.includes('::') ? `[${remoteAddress}]` : remoteAddress;

  const serviceKey = microservices.register({
    name,
    version,
    port,
    ip: serviceIp
  });

  res.status(200).json(serviceKey);
});

router.delete('/unregister/:name/:version/:port', async (req: Request, res: Response) => {
  const { name, version, port } = req.params;
  const remoteAddress = req.connection.remoteAddress;
  const serviceIp = remoteAddress.includes('::') ? `[${remoteAddress}]` : remoteAddress;

  const serviceKey = microservices.unregister({
    name,
    version,
    port,
    ip: serviceIp
  });

  res.status(200).json({ result: `Service ${serviceKey} deleted...`});
});

export default router;