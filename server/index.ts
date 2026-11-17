import "dotenv/config";
import express from "express";
import { SolveRequest } from "../shared/schema.js";
import { solve } from "./solve.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/api/solve", async (req, res) => {
  const parsed = SolveRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a question of 3 to 4000 characters." });
  try {
    res.json(await solve(parsed.data));
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "Could not generate an answer. Check the server log and your .env settings." });
  }
});

app.listen(8787, () => console.log("API listening on http://localhost:8787"));
