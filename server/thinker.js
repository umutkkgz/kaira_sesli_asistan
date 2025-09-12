/**
 * Thinker microservice for KAIRA
 *
 * Splits responsibilities:
 *  - Thinker (/api/think): reasoning, composing answers using an LLM
 *  - Learner (external): classic knowledge store (/api/answer, /api/teach)
 *
 * Env vars:
 *  - PORT:                     server port (default 8787)
 *  - LEARNER_BASE_URL:         base URL for the existing Learner service (defaults to same server base)
 *  - OLLAMA_BASE_URL:          optional; default 'http://localhost:11434'
 *  - OLLAMA_MODEL:             optional; if set, Ollama is preferred
 *  - GROQ_API_KEY:             optional; used if present for LLM
 *  - GROQ_MODEL:               optional; default 'llama-3.1-8b-instant'
 *  - GOOGLE_API_KEY:           optional; used if GROQ/OLLAMA not present
 *  - GOOGLE_MODEL:             optional; default 'gemini-1.5-flash'
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const LEARNER_BASE = (process.env.LEARNER_BASE_URL || '').replace(/\/$/, '');

const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';
const hasOllama = !!OLLAMA_MODEL; // prefer explicit model tag; you can also set via environment

const hasGroq = !!process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const hasGoogle = !!process.env.GOOGLE_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5-flash';

function redact(s){ if (!s) return ''; return s.length <= 6 ? '*'.repeat(s.length) : s.slice(0,3) + '*'.repeat(Math.max(1,s.length-6)) + s.slice(-3); }

app.get('/api/health', (_, res) => {
  res.json({ ok: true, thinker: true, learner_base: LEARNER_BASE || null });
});

// Optional: expose masked keys so UI can auto-fill for convenience
app.get('/api/get-groq-key', (_req, res) => {
  const apiKey = process.env.GROQ_API_KEY || '';
  res.json({ apiKey });
});
app.get('/api/get-google-key', (_req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY || '';
  res.json({ apiKey });
});

// Helper: call Learner's /api/answer (best-effort)
async function learnerAnswer(prompt){
  if (!LEARNER_BASE) return null;
  try{
    const r = await fetch(`${LEARNER_BASE}/api/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!r.ok) return null;
    const j = await r.json().catch(()=>null);
    if (j && typeof j.answer === 'string' && j.answer.trim()) return j.answer.trim();
  }catch(_){ /* ignore */ }
  return null;
}

// Helper: Ollama local chat (preferred if OLLAMA_MODEL is set)
async function ollamaChat({ systemPrompt, userPrompt, context, history }){
  const stitched = [
    systemPrompt ? null : 'Türkçe ve kısa yanıt ver.',
    context && context.length ? `Bağlam:\n${context.join('\n')}` : null,
    userPrompt
  ].filter(Boolean).join('\n\n');

  const msgs = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  if (Array.isArray(history)){
    for (const m of history){
      msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content||'') });
    }
  }
  msgs.push({ role: 'user', content: stitched });

  // Try /api/chat first, then fallback to /api/generate
  const payload = {
    model: OLLAMA_MODEL,
    stream: false,
    messages: msgs,
    options: { temperature: 0.7 }
  };
  let resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (resp.status === 404) {
    // Flatten to prompt and use /api/generate
    const parts = [];
    for (const m of msgs){ parts.push(`[${m.role.toUpperCase()}]\n${m.content}`); }
    const flat = parts.join('\n\n');
    const gen = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: flat, stream: false, options: { temperature: 0.7 } })
    });
    if (!gen.ok){ const t = await gen.text().catch(()=> ''); throw new Error(`Ollama gen HTTP ${gen.status} ${gen.statusText}: ${t}`); }
    const j2 = await gen.json();
    return (j2 && j2.response ? String(j2.response).trim() : '');
  }
  if (!resp.ok){ const t = await resp.text().catch(()=> ''); throw new Error(`Ollama HTTP ${resp.status} ${resp.statusText}: ${t}`); }
  const j = await resp.json();
  return j && j.message && j.message.content ? String(j.message.content).trim() : '';
}

// Helper: minimal LLM call via Ollama, Groq or Google
async function llmComplete({ systemPrompt, userPrompt, context, history }){
  // Merge context into user content
  const stitched = [
    context && context.length ? `Bağlam:\n${context.join('\n')}` : null,
    userPrompt
  ].filter(Boolean).join('\n\n');

  // Prefer local Ollama if configured
  if (hasOllama){
    return await ollamaChat({ systemPrompt, userPrompt, context, history });
  }

  if (hasGroq){
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    if (Array.isArray(history)) messages.push(...history);
    messages.push({ role: 'user', content: stitched });
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages })
    });
    if (!r.ok){
      const t = await r.text().catch(()=> '');
      throw new Error(`Groq HTTP ${r.status} ${r.statusText}: ${t}`);
    }
    const j = await r.json();
    return j.choices?.[0]?.message?.content?.trim() || '';
  }

  if (hasGoogle){
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    const contents = [];
    if (Array.isArray(history)){
      for (const m of history){
        contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: stitched }] });
    const payload = systemPrompt ? { contents, systemInstruction: { parts: [{ text: systemPrompt }] } } : { contents };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok){
      const t = await r.text().catch(()=> '');
      throw new Error(`Google HTTP ${r.status} ${r.statusText}: ${t}`);
    }
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  // No keys configured → return empty to signal fallback
  return '';
}

// POST /api/think — main reasoning endpoint
app.post('/api/think', async (req, res) => {
  try{
    const body = req.body || {};
    const prompt = String(body.prompt || body.text || '').trim();
    const history = Array.isArray(body.history) ? body.history : [];
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // 1) Quick check: if learner knows definitive answer, use it as context and candidate
    const learnerAns = await learnerAnswer(prompt);

    // 2) LLM reasoning with optional system prompt + context
    const systemPrompt = (body.system_prompt || `
Bir uzman asistan olarak Türkçe cevap ver. Aşağıda varsa bağlamı kullan.
- Bağlam yetersizse uydurma.
- Net, kısa ve anlaşılır yanıtlar ver.
`).trim();
    const context = [];
    if (learnerAns) context.push(`Öğrenen sistemin ilgili cevabı: ${learnerAns}`);

    let llmOut = '';
    try {
      llmOut = await llmComplete({ systemPrompt, userPrompt: prompt, context, history });
    } catch (e){
      // If LLM call fails but learner answered, still return learner answer
      if (learnerAns) return res.json({ answer: learnerAns, model: 'learner', hadKnowledge: true });
      throw e;
    }

    const preferred = (llmOut && llmOut.trim()) || '';
    const finalAns = preferred || learnerAns || '';

    if (finalAns){
      return res.json({
        answer: finalAns,
        model: preferred ? (hasOllama ? `ollama:${OLLAMA_MODEL}` : (hasGroq ? `groq:${GROQ_MODEL}` : (hasGoogle ? `google:${GOOGLE_MODEL}` : 'unknown'))) : 'learner',
        hadKnowledge: !!learnerAns,
      });
    }

    // Neither LLM nor learner produced an answer → suggest teaching
    return res.json({ answer: '', teachSuggested: true });
  } catch (err){
    console.error('[thinker] /api/think', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
});

// Optionally provide a lightweight local Learner fallback when LEARNER_BASE_URL is not set.
// This is in-memory and for dev only.
const MEM = new Map(); // key: normalized prompt, value: answer
function norm(s){ return String(s||'').trim().toLowerCase(); }

app.post('/api/answer', (req, res) => {
  if (LEARNER_BASE){ return res.status(404).json({ error: 'Forward to external learner' }); }
  const q = norm(req.body?.prompt);
  if (!q) return res.status(400).json({ error: 'prompt required' });
  const a = MEM.get(q);
  return res.json({ answer: a || '' });
});
app.post('/api/teach', (req, res) => {
  if (LEARNER_BASE){ return res.status(404).json({ error: 'Forward to external learner' }); }
  const q = norm(req.body?.prompt);
  const a = String(req.body?.response || '').trim();
  if (!q || !a) return res.status(400).json({ error: 'prompt and response required' });
  MEM.set(q, a);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[thinker] listening on :${PORT}`);
  if (LEARNER_BASE) console.log(`[thinker] learner base: ${LEARNER_BASE}`);
  console.log(`[thinker] llm providers: ollama=${hasOllama ? ('yes('+OLLAMA_MODEL+')') : 'no'} groq=${hasGroq ? 'yes' : 'no'} google=${hasGoogle ? 'yes' : 'no'}`);
});
