import express from "express";
import cors from "cors";
import overviewRoutes from "./routes/overview.js";
import rigsRoutes from "./routes/rigs.js";
import agentsRoutes from "./routes/agents.js";
import beadsRoutes from "./routes/beads.js";
import convoysRoutes from "./routes/convoys.js";
import refineryRoutes from "./routes/refinery.js";
import escalationsRoutes from "./routes/escalations.js";
import mailRoutes from "./routes/mail.js";
import formulasRoutes from "./routes/formulas.js";
import sessionsRoutes from "./routes/sessions.js";
import feedRoutes from "./feed.js";
import activityRoutes from "./routes/activity.js";
import actionsRoutes from "./routes/actions.js";
import controlRoutes from "./routes/control.js";

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
app.use("/api/convoys", convoysRoutes);
app.use("/api/refinery", refineryRoutes);
app.use("/api/escalations", escalationsRoutes);
app.use("/api/mail", mailRoutes);
app.use("/api/formulas", formulasRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/feed", activityRoutes);
app.use("/api/actions", actionsRoutes);
app.use("/api/control", controlRoutes);

const PORT = process.env.PORT || 4800;
app.listen(PORT, () => {
  console.log(`[gastown-server] listening on :${PORT}`);
});
