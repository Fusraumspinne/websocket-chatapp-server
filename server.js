/*const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});*/

const io = require("socket.io")(process.env.PORT || 4000, {
    cors: {
        origin: "*",
    },
});

const rooms = {};
const typingUsers = {};

io.on("connection", (socket) => {
  socket.on("adminMessage", (data) => {
    const { id, message, userName, timestamp, roomName } = data;
    if (roomName) {
      io.to(roomName).emit("adminMessage", {
        id,
        userName,
        message,
        timestamp,
        roomName,
      });
      io.to("AdminDashboard").emit("adminMessage", {
        id,
        userName,
        message,
        timestamp,
        roomName,
      });
    } else {
      io.emit("adminMessage", { id, userName, message, timestamp });
    }
  });

  socket.on("message", (data) => {
    const { id, message, userName, roomName, timestamp, edited, response } =
      data;
    if (roomName && roomName.length > 0) {
      io.to(roomName).emit("message", {
        id,
        userName,
        roomName,
        message,
        timestamp,
        edited,
        response,
      });

      io.to("AdminDashboard").emit("message", {
        id,
        userName,
        roomName,
        message,
        timestamp,
        edited,
        response,
      });
    }
  });

  socket.on("deleteMessage", (data) => {
    const { roomName, id } = data;
    if (roomName && roomName.length > 0) {
      io.to(roomName).emit("deleteMessage", id);

      io.to("AdminDashboard").emit("deleteMessage", id);
    }
  });

  socket.on("editMessage", (data) => {
    const { message, roomName, id } = data;
    if (roomName && roomName.length > 0) {
      io.to(roomName).emit("editMessage", { id, message });

      io.to("AdminDashboard").emit("editMessage", { id, message });
    }
  });

  socket.on("joinRoom", (roomName, userName, timestamp) => {
    socket.join(roomName);

    socket.roomName = roomName;
    socket.userName = userName;

    if (!rooms[roomName]) {
      rooms[roomName] = { users: [] };
    }

    rooms[roomName].users.push(userName);

    io.to(roomName).emit("message", {
      userName: "System",
      message: `${userName} joined the room`,
      timestamp,
    });

    io.to(roomName).emit("roomUsers", rooms[roomName].users);

    if (userName !== "Admin") {
      io.to("AdminDashboard").emit("message", {
        userName: "System",
        message: `${userName} joined ${roomName}`,
        timestamp,
      });
    }

    io.emit("roomsList", rooms);
  });

  socket.on("leaveRoom", (roomName, userName, timestamp) => {
    socket.leave(roomName);

    if (rooms[roomName]) {
      rooms[roomName].users = rooms[roomName].users.filter(
        (user) => user !== userName
      );
      if (rooms[roomName].users.length === 0) {
        delete rooms[roomName];
      }
    }

    io.to(roomName).emit("message", {
      userName: "System",
      message: `${userName} left the room`,
      timestamp,
    });
    io.to(roomName).emit("roomUsers", rooms[roomName]?.users || []);

    io.to("AdminDashboard").emit("message", {
      userName: "System",
      message: `${userName} left ${roomName}`,
      timestamp,
    });

    io.emit("roomsList", rooms);
  });

  socket.on("getRooms", () => {
    socket.emit("roomsList", rooms);
  });

  socket.on("getRoomUsers", (roomName) => {
    if (rooms[roomName]) {
      socket.emit("roomsUsers", rooms[roomName].users);
    } else {
      socket.emit("roomUsers", []);
    }
  });

  socket.on("typing", ({ userName, roomName }) => {
    if (!typingUsers[roomName]) {
      typingUsers[roomName] = new Set();
    }
    typingUsers[roomName].add(userName);
    io.to(roomName).emit("typingUsers", Array.from(typingUsers[roomName]));
  });

  socket.on("stopTyping", ({ userName, roomName }) => {
    if (typingUsers[roomName]) {
      typingUsers[roomName].delete(userName);
      io.to(roomName).emit("typingUsers", Array.from(typingUsers[roomName]));
    }
  });

  socket.on("disconnect", () => {
    const roomName = socket.roomName;
    const userName = socket.userName;

    const timestamp = new Date().toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    if (roomName && userName) {
      if (rooms[roomName]) {
        rooms[roomName].users = rooms[roomName].users.filter(
          (user) => user !== userName
        );
        if (rooms[roomName].users.length === 0) {
          delete rooms[roomName];
        }
      }

      io.to(roomName).emit("message", {
        userName: "System",
        message: `${userName} left the room`,
        timestamp,
        systemClass: "text-red-500",
      });
      io.to(roomName).emit("roomUsers", rooms[roomName]?.users || []);

      io.to("AdminDashboard").emit("message", {
        userName: "System",
        message: `${userName} left ${roomName}`,
        timestamp,
      });

      io.emit("roomsList", rooms);
    }
  });
});
