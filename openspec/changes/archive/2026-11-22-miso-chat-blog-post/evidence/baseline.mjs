// Measures the live chat before caching: per suggestion, 5 runs, time to first answer token and to `done`.
const URL = "https://www.chiranjeevthomas.com/api/chat";
const QS = [
  "What has he shipped with LLMs in production?",
  "How does InvoiceChaser keep a human in the loop?",
  "What’s his experience with RAG?",
  "Is he a fit for a senior full-stack AI role?",
];
const RUNS = 5, GAP_MS = 12000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
for (let run = 1; run <= RUNS; run++) {
  for (const q of QS) {
    const t0 = performance.now();
    let first = null, done = null, result = null, resets = 0;
    const res = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, history: [] }) });
    if (!res.ok) { rows.push({ q, run, status: res.status }); console.log(JSON.stringify(rows.at(-1))); await sleep(GAP_MS); continue; }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", text = "";
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true }); let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
        const e = JSON.parse(line);
        if (e.type === "token") { text += e.text; if (first === null && text.replace(/\s*\[[a-z0-9-]*\]?/g, "").trim()) first = performance.now() - t0; }
        else if (e.type === "reset") { resets++; text = ""; first = null; }
        else if (e.type === "done") { done = performance.now() - t0; result = e.result; }
      }
    }
    const trace = result?.trace ?? [];
    rows.push({
      q, run, status: res.status,
      firstMs: first && Math.round(first), doneMs: done && Math.round(done),
      llmRounds: trace.filter((s) => s.kind === "think" && /LLM chose to search|LLM reasoning/.test(s.label)).length,
      searches: trace.filter((s) => s.kind === "tool").length,
      fallback: trace.some((s) => /Rate limit/.test(s.label)),
      mode: result?.mode, grounded: result?.grounded, sources: result?.sources?.length,
    });
    console.log(JSON.stringify(rows.at(-1)));
    await sleep(GAP_MS);
  }
}
const med = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
console.log("\nSUMMARY (median of runs)");
for (const q of QS) {
  const r = rows.filter((x) => x.q === q && x.status === 200);
  console.log(JSON.stringify({ q, n: r.length, firstMs: med(r.map((x) => x.firstMs)), doneMs: med(r.map((x) => x.doneMs)), searches: med(r.map((x) => x.searches)), fallbacks: r.filter((x) => x.fallback).length }));
}
console.log("measuredAt", new Date().toISOString());
