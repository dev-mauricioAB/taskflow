import { connectDb, serverConfig } from "./config";
import { app } from "./app";

connectDb();

app.listen(serverConfig.port, () => {
  console.log(`🚀 Server running on port ${serverConfig.port}`);
});
