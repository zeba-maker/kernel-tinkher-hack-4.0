import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { setupSocket } from "./socket.js";
import { detectSign } from "./gemini.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Gemini AI API route
app.post("/api/detect-sign", async (req, res) => {
  try {
    const { image } = req.body;
    const result = await detectSign(image);
    res.json({ prediction: result });
  } catch (err) {
    res.status(500).json({ error: "AI detection failed" });
  }
});

// simple root route to indicate server is running
app.get("/", (req, res) => {
  res.send("Kernel Meet signaling server is running.");
});

const io = new Server(server, {
  cors: { origin: "*" }
});

setupSocket(io);

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
