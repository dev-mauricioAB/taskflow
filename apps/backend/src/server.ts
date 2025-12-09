import express from "express";
import { connectDb, serverConfig } from "./config";
import { app } from "./app";

app.use(express.json());

connectDb();

app.listen(serverConfig.port, () => {
  console.log(`🚀 Server running on port ${serverConfig.port}`);
});
