const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Puck minimap relay is running.");
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();

function getRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  return rooms.get(roomCode);
}

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (raw) => {
    let msg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      currentRoom = String(msg.room || "default");
      getRoom(currentRoom).add(ws);

      ws.send(JSON.stringify({
        type: "joined",
        room: currentRoom
      }));

      return;
    }

    if (!currentRoom) {
      return;
    }

    const room = getRoom(currentRoom);

    for (const client of room) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);

      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Puck minimap relay listening on port ${PORT}`);
});
