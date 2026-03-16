const API_KEY = process.env.MCP_API_KEY;

export function authMiddleware(req, res) {
  if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized — invalid or missing x-api-key" }));
    return false;
  }
  return true;
}