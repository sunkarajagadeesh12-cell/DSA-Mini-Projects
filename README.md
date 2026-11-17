# DeepSolve AI (MVP)

Type a question, get a structured exam answer. React + TypeScript + Vite frontend, small Express API that holds the LLM key.

## Run locally
1. `npm install`
2. `cp .env.example .env`, then set `LLM_API_KEY`, `LLM_MODEL` and (if not OpenAI) `LLM_BASE_URL`
3. `npm run dev` and open http://localhost:5173

## How it works
`POST /api/solve` validates the request (zod), calls any OpenAI-compatible chat API once, validates the JSON answer against `shared/schema.ts`, and re-computes the model's arithmetic (`server/solve.ts`). The UI renders typed sections as a notebook page. Follow-up buttons call the same endpoint with a `mode` and the previous answer.

## Costs
- LLM calls are the only unavoidable cost. Some providers have rate-limited free tiers and Ollama runs free on your own machine, but terms change, so check current pricing.
- Frontend hosting (static) is free on several platforms. A small Node API can run on a free tier with cold starts.
- Later features add cost: OCR or vision calls for images, and storage for saved answers.

## Deploy (after it works locally)
Static frontend on Vercel, Netlify or Cloudflare Pages; the API on Render, Railway or Fly.io. Set the `LLM_*` variables on the API host only, and point `/api` at it. Add rate limiting before sharing the link.

## Next
1. File upload: PDF/DOCX text extraction on the server, image questions via a vision model, then pick one or batch
2. Export to PDF/Markdown, then saved answers (needs accounts and a database)
3. Rate limiting and a few tests for the arithmetic checker
