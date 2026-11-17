import { z } from "zod";

export const SolveRequest = z.object({
  question: z.string().trim().min(3).max(4000),
  subject: z.string().max(80).nullish(),
  marks: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8), z.literal(10)]).nullish(),
  language: z.string().max(40).nullish(),
  style: z.string().max(80).nullish(),
  mode: z.enum(["normal", "simpler", "detailed", "short", "example"]).default("normal"),
  previous: z.string().max(20000).nullish(),
});

export const Section = z.object({
  heading: z.string(),
  kind: z.enum(["text", "points", "steps", "table", "code"]),
  text: z.string().nullish(), // text body, or code source when kind is "code"
  items: z.array(z.string()).nullish(),
  headers: z.array(z.string()).nullish(),
  rows: z.array(z.array(z.string())).nullish(),
  language: z.string().nullish(),
});

export const Answer = z.object({
  type: z.enum(["theory", "numerical", "programming", "comparison", "process", "other"]),
  title: z.string(),
  sections: z.array(Section).min(1),
  finalAnswer: z.string().nullish(),
  revision: z.array(z.string()).default([]),
  calculations: z.array(z.object({ expression: z.string(), claimed: z.number() })).default([]),
});

export type SolveReq = z.input<typeof SolveRequest>;
export type AnswerT = z.infer<typeof Answer> & { checks?: { expression: string; ok: boolean }[] };
