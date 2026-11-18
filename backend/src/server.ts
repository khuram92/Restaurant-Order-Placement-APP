import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initRealtime } from "./utils/realtime.js";
import { startAutoCancel } from "./utils/autoCancel.js";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDB(); // 1. connect to MongoDB first

    const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  initRealtime(server); 
  startAutoCancel();
};

startServer();