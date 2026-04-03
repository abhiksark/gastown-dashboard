import express from "express";
import cors from "cors";
import overviewRoutes from "./routes/overview.js";
import rigsRoutes from "./routes/rigs.js";
import agentsRoutes from "./routes/agents.js";
import beadsRoutes from "./routes/beads.js";
import feedRoutes from "./feed.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/overview", overviewRoutes);
app.use("/api/rigs", rigsRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/beads", beadsRoutes);
app.use("/api/feed", feedRoutes);

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
