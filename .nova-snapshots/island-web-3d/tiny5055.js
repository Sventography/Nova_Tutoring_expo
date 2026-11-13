// tiny5055.js
const http = require("http");
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const body = JSON.stringify({ ok: true, method: req.method, url: req.url });
  res.writeHead(200);
  res.end(body);
});
server.listen(5055, "0.0.0.0", () => {
  console.log("tiny server listening on http://127.0.0.1:5055");
});

