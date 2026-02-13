export function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join room
    socket.on("join-room", (room) => {
      socket.join(room);
      socket.to(room).emit("user-connected", socket.id);
    });

    // WebRTC signaling
    socket.on("signal", (data) => {
      io.to(data.to).emit("signal", {
        signal: data.signal,
        from: socket.id,
      });
    });

    // Caption sending
    socket.on("send-caption", (data) => {
      socket.to(data.room).emit("receive-caption", {
        text: data.text,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}
