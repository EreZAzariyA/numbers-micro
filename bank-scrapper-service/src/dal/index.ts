import { connect } from "mongoose";
import config from "../utils/config";

async function connectToMongoDB(): Promise<string> {
  try {
    const db = await connect(config.mongoConnectionString);
    return db.connections[0].name;
  } catch (err: any) {
    config.log.error(err?.message);
  }
};

export default connectToMongoDB;
