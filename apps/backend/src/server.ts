import express from "express";
import { connectDb } from "./config/database.config";
import { serverConfig } from "./config/server.config";

const app = express();
app.use(express.json());

connectDb();

app.listen(serverConfig.port, () => {
  console.log(`🚀 Server running on port ${serverConfig.port}`);
});
