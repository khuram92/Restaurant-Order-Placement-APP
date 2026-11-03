import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDB(); // 1. connect to MongoDB first

  app.listen(PORT, () => {
    // 2. then start the server
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();