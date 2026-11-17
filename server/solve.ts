import type { z } from "zod";
import { Answer, SolveRequest } from "../shared/schema.js";

type Req = z.infer<typeof SolveRequest>;

const MODE: Record<string, string> = {
  simpler: "Rewrite the previous answer in simpler words, with one everyday analogy.",
  detailed: "Expand the previous answer with more depth, reasoning and examples.",
  short: "Condense the previous answer into a brief revision version.",
  example: "Keep the previous answer and add a worked example.",
};

function systemPrompt(r: Req) {
  return `You are DeepSolve AI, an exam-prep tutor for college students.
Reply with ONE JSON object only: {"type","title","sections":[{"heading","kind","text","items","headers","rows","language"}],"finalAnswer","revision":[],"calculations":[{"expression","claimed"}]}.
type is theory|numerical|programming|comparison|process|other. Section kind is text|points|steps|table|code (code source goes in "text").
Fit depth to ${r.marks ? r.marks + " marks" : "the wording of the question"} and shape the answer to the type:
theory = definition, explanation, points, example, 2-3 extra points; numerical = given, required, formulas, steps, final answer;
programming = approach, code, explanation, sample output; comparison = a table; process = ordered steps. "revision" holds short revision notes.
Numericals: use only values stated in the question and never invent data; if something is missing, say so in a text section.
For each arithmetic step add a "calculations" entry whose expression uses only digits and + - * / ^ ( ), plus its claimed result.
Be accurate and say when unsure. Answer in ${r.language || "English"}. Style: ${r.style || "clear and exam-oriented"}.${r.subject ? ` Subject: ${r.subject}.` : ""}`;
}

// Re-computes the model's arithmetic so wrong numbers get flagged in the UI.
function verify(calcs: { expression: string; claimed: number }[]) {
  return calcs.map(({ expression, claimed }) => {
    let ok = false;
    if (/^[\d+\-*/().\s^]+$/.test(expression)) {
      try {
        const v = Function(`"use strict";return (${expression.replace(/\^/g, "**")})`)() as number;
        ok = Math.abs(v - claimed) <= 0.01 * Math.max(1, Math.abs(v));
      } catch { /* leave ok = false */ }
    }
    return { expression, ok };
  });
}

export async function solve(r: Req) {
  const { LLM_BASE_URL = "https://api.openai.com/v1", LLM_API_KEY, LLM_MODEL } = process.env;
  if (!LLM_API_KEY || !LLM_MODEL) throw new Error("Set LLM_API_KEY and LLM_MODEL in .env");

  const user = r.mode !== "normal" && r.previous
    ? `Question: ${r.question}\n\nPrevious answer:\n${r.previous}\n\nTask: ${MODE[r.mode]}`
    : r.question;

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: systemPrompt(r) }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status})`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const answer = Answer.parse(JSON.parse(data.choices[0].message.content));
  return { ...answer, checks: verify(answer.calculations) };
}
