import WebSocket, { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = {}; // roomCode -> { players, questionIndex }

const QUESTIONS = [
  {
    question: "Capital of France?",
    answers: ["Paris", "Rome", "Berlin", "Madrid"],
    correct: 0
  },
  {
    question: "2 + 2 = ?",
    answers: ["3", "4", "5", "22"],
    correct: 1
  }
];

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      const { room, name } = data;
      if (!rooms[room]) {
        rooms[room] = { players: [], questionIndex: 0 };
      }
      ws.room = room;
      ws.name = name;
      ws.score = 0;

      rooms[room].players.push(ws);
      broadcast(room, { type: "players", players: rooms[room].players.map(p => p.name) });
      sendQuestion(room);
    }

    if (data.type === "answer") {
      const room = ws.room;
      const q = QUESTIONS[rooms[room].questionIndex];
      if (data.answer === q.correct) ws.score++;

      rooms[room].questionIndex++;
      sendQuestion(room);
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;
    rooms[ws.room].players = rooms[ws.room].players.filter(p => p !== ws);
  });
});

function broadcast(room, data) {
  rooms[room].players.forEach(p => p.send(JSON.stringify(data)));
}

function sendQuestion(room) {
  const idx = rooms[room].questionIndex;
  if (idx >= QUESTIONS.length) {
    broadcast(room, {
      type: "end",
      scores: rooms[room].players.map(p => ({
        name: p.name,
        score: p.score
      }))
    });
    return;
  }
  broadcast(room, { type: "question", ...QUESTIONS[idx] });
}

server.listen(3000, () => console.log("Server running on :3000"));
