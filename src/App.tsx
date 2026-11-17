import { useState, type ChangeEvent } from "react";
import type { AnswerT, SolveReq } from "../shared/schema";

type Mode = NonNullable<SolveReq["mode"]>;
type Sec = AnswerT["sections"][number];
const FOLLOW_UPS: [Mode, string][] = [
  ["simpler", "Simpler"], ["detailed", "More detail"], ["short", "Short revision"], ["example", "Worked example"],
];

function toMarkdown(a: AnswerT) {
  const out = [`# ${a.title}`];
  for (const s of a.sections) {
    out.push(`## ${s.heading}`);
    if (s.kind === "text") out.push(s.text ?? "");
    else if (s.kind === "code") out.push("```" + (s.language ?? "") + "\n" + (s.text ?? "") + "\n```");
    else if (s.kind === "table") {
      const rows = [s.headers ?? [], ...(s.rows ?? [])].map((r) => `| ${r.join(" | ")} |`);
      rows.splice(1, 0, `|${(s.headers ?? []).map(() => "---").join("|")}|`);
      out.push(rows.join("\n"));
    } else out.push((s.items ?? []).map((i, n) => (s.kind === "steps" ? `${n + 1}. ${i}` : `- ${i}`)).join("\n"));
  }
  if (a.finalAnswer) out.push(`**Final answer:** ${a.finalAnswer}`);
  if (a.revision.length) out.push("## Quick revision", ...a.revision.map((r) => `- ${r}`));
  return out.join("\n\n");
}

function Block({ s }: { s: Sec }) {
  return (
    <section>
      <h3>{s.heading}</h3>
      {s.kind === "text" && <p>{s.text}</p>}
      {s.kind === "points" && <ul>{s.items?.map((i, n) => <li key={n}>{i}</li>)}</ul>}
      {s.kind === "steps" && <ol>{s.items?.map((i, n) => <li key={n}>{i}</li>)}</ol>}
      {s.kind === "code" && <pre><code>{s.text}</code></pre>}
      {s.kind === "table" && (
        <div className="scroll">
          <table>
            <thead><tr>{s.headers?.map((h, n) => <th key={n}>{h}</th>)}</tr></thead>
            <tbody>{s.rows?.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [f, setF] = useState({ question: "", subject: "", marks: "", language: "", style: "" });
  const [answer, setAnswer] = useState<AnswerT | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function run(mode: Mode) {
    setBusy(true); setErr(""); setCopied(false);
    const body: SolveReq = {
      question: f.question, mode,
      subject: f.subject || undefined, language: f.language || undefined, style: f.style || undefined,
      marks: f.marks ? (Number(f.marks) as 2 | 4 | 6 | 8 | 10) : undefined,
      previous: mode !== "normal" && answer ? toMarkdown(answer) : undefined,
    };
    try {
      const r = await fetch("/api/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAnswer(d);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const checks = answer?.checks ?? [];
  const bad = checks.filter((c) => !c.ok);

  return (
    <main>
      <h1>DeepSolve AI</h1>
      <p className="sub">Type a question or topic and get an exam-ready answer.</p>
      <textarea value={f.question} onChange={set("question")} aria-label="Question"
        placeholder="e.g. Explain the OSI model with a diagram description, 8 marks" />
      <details>
        <summary>Preferences (all optional)</summary>
        <div className="grid">
          <label>Subject<input value={f.subject} onChange={set("subject")} /></label>
          <label>Marks
            <select value={f.marks} onChange={set("marks")}>
              <option value="">Auto</option>{[2, 4, 6, 8, 10].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label>Language<input value={f.language} onChange={set("language")} placeholder="English" /></label>
          <label>Explanation style<input value={f.style} onChange={set("style")} placeholder="e.g. simple, with analogies" /></label>
        </div>
      </details>
      <button onClick={() => run("normal")} disabled={busy || f.question.trim().length < 3}>
        {busy ? "Solving…" : "Solve"}
      </button>
      {err && <p className="err" role="alert">{err}</p>}

      {answer && (
        <article className="page">
          <h2>{answer.title}</h2>
          <span className="badge">{answer.type}</span>
          {answer.sections.map((s, i) => <Block key={i} s={s} />)}
          {answer.finalAnswer && <strong className="final">Final answer: {answer.finalAnswer}</strong>}
          {answer.revision.length > 0 && (
            <section><h3>Quick revision</h3><ul>{answer.revision.map((r, i) => <li key={i}>{r}</li>)}</ul></section>
          )}
          {checks.length > 0 && (
            <p className="badge">
              {bad.length ? `Check these steps: ${bad.map((c) => c.expression).join("; ")}` : `Arithmetic re-checked: ${checks.length} of ${checks.length} steps match`}
            </p>
          )}
          <div className="bar">
            {FOLLOW_UPS.map(([m, label]) => <button key={m} className="ghost" disabled={busy} onClick={() => run(m)}>{label}</button>)}
            <button className="ghost" onClick={async () => { await navigator.clipboard.writeText(toMarkdown(answer)); setCopied(true); }}>
              {copied ? "Copied" : "Copy answer"}
            </button>
          </div>
        </article>
      )}
    </main>
  );
}
