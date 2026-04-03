import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
