export function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("caption", (text) => {
      socket.broadcast.emit("caption", text);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
}
