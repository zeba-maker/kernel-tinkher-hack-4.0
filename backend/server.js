const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const setupSocket = require("./socket");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Use separated socket logic
setupSocket(io);

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});