import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: [".env.local", ".env"] });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Timeout wrapper for promises
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${timeoutMsg}`));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function normalizeGeminiModel(model?: string): string {
  if (!model) return "gemini-3.6-flash";
  const m = model.trim().toLowerCase();
  if (m.includes("pro")) {
    return "gemini-3.1-pro-preview";
  }
  if (m.includes("lite")) {
    return "gemini-3.1-flash-lite";
  }
  if (m.includes("latest")) {
    return "gemini-flash-latest";
  }
  return "gemini-3.6-flash";
}

// Helper for Real-time Web Search (Tavily, Serper, or DuckDuckGo fallback)
async function performWebSearch(
  query: string,
  customTavilyKey?: string,
  customSerperKey?: string
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // 1. Try Tavily Search API if TAVILY_API_KEY is available
  const tavilyKey = customTavilyKey?.trim() || process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: cleanQuery,
          search_depth: "basic",
          max_results: 5,
        }),
      });
      if (tavilyRes.ok) {
        const data = await tavilyRes.json();
        if (data.results && Array.isArray(data.results)) {
          return data.results.map((r: any) => ({
            title: r.title || "Tavily Result",
            url: r.url || "",
            snippet: r.content || r.snippet || "",
          }));
        }
      }
    } catch (err) {
      console.warn("[Tavily Search Error]:", err);
    }
  }

  // 2. Try Serper Search API if SERPER_API_KEY is available
  const serperKey = customSerperKey?.trim() || process.env.SERPER_API_KEY?.trim();
  if (serperKey) {
    try {
      const serperRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: cleanQuery }),
      });
      if (serperRes.ok) {
        const data = await serperRes.json();
        if (data.organic && Array.isArray(data.organic)) {
          return data.organic.slice(0, 5).map((r: any) => ({
            title: r.title || "",
            url: r.link || "",
            snippet: r.snippet || "",
          }));
        }
      }
    } catch (err) {
      console.warn("[Serper Search Error]:", err);
    }
  }

  // 3. Fallback DuckDuckGo HTML / Instant Answer web scraper
  try {
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      const headings = [...html.matchAll(/<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
      const snippets = [...html.matchAll(/<a class="result__snippet[^">]*" href="[^"]*">([\s\S]*?)<\/a>/g)];

      for (let i = 0; i < Math.min(headings.length, 5); i++) {
        const h = headings[i];
        let rawUrl = h[1] || "";
        if (rawUrl.includes("uddg=")) {
          const uMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uMatch) rawUrl = decodeURIComponent(uMatch[1]);
        }
        const title = h[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippets[i] ? snippets[i][1].replace(/<[^>]+>/g, "").trim() : "";
        if (title) {
          results.push({ title, url: rawUrl, snippet });
        }
      }
      if (results.length > 0) return results;
    }
  } catch (err) {
    console.warn("[DuckDuckGo Search Warning]:", err);
  }

  return [];
}

// Helper for Gemini AI generation
async function handleGeminiGeneration(
  messages: any[],
  systemInstruction: string,
  customApiKey?: string,
  preferredModel?: string,
  customTavilyKey?: string,
  customSerperKey?: string
): Promise<{ text: string; toolCalls: Array<{ name: string; args: any }> }> {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NO_API_KEY: GEMINI_API_KEY не знайдено в середовищі чи налаштуваннях.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const formattedContents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (formattedContents.length === 0) {
    formattedContents.push({ role: "user", parts: [{ text: "Привіт!" }] });
  }

  const primaryModel = normalizeGeminiModel(preferredModel);

  const canvasTools = [
    {
      functionDeclarations: [
        {
          name: "web_search",
          description: "Пошук актуальної інформації в мережі Інтернет (погода, новини, курси валют, свіжі події)",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Пошуковий запит для пошуку в інтернеті" },
            },
            required: ["query"],
          },
        },
        {
          name: "create_swot_analysis",
          description: "Створити графічний виджет SWOT-аналізу (Strengths, Weaknesses, Opportunities, Threats) на полотні у вказаних координатах",
          parameters: {
            type: "OBJECT",
            properties: {
              projectTitle: { type: "STRING", description: "Назва проєкту або теми SWOT-аналізу" },
              strengths: { type: "ARRAY", items: { type: "STRING" }, description: "Сильні сторони (Strengths)" },
              weaknesses: { type: "ARRAY", items: { type: "STRING" }, description: "Слабкі сторони (Weaknesses)" },
              opportunities: { type: "ARRAY", items: { type: "STRING" }, description: "Можливості (Opportunities)" },
              threats: { type: "ARRAY", items: { type: "STRING" }, description: "Загрози (Threats)" },
              x: { type: "NUMBER", description: "X координата на полотні (необов'язково)" },
              y: { type: "NUMBER", description: "Y координата на полотні (необов'язково)" },
            },
            required: ["projectTitle", "strengths", "weaknesses", "opportunities", "threats"],
          },
        },
        {
          name: "create_note",
          description: "Створити нотатку або текстову картку на полотні",
          parameters: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Заголовок нотатки" },
              content: { type: "STRING", description: "Зміст нотатки" },
              color: { type: "STRING", description: "Колір: white, cream, sage, sky, rose, lavender, slate" },
              x: { type: "NUMBER" },
              y: { type: "NUMBER" },
              width: { type: "NUMBER" },
              height: { type: "NUMBER" },
            },
            required: ["content"],
          },
        },
        {
          name: "create_planner",
          description: "Створити інтерактивний планувальник або чекліст завдань на полотні",
          parameters: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Заголовок планувальника" },
              tasks: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: { type: "STRING" },
                    completed: { type: "BOOLEAN" },
                  },
                  required: ["text"],
                },
              },
              x: { type: "NUMBER" },
              y: { type: "NUMBER" },
            },
            required: ["title", "tasks"],
          },
        },
        {
          name: "create_folder",
          description: "Створити папки / секції для нотаток на полотні",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING", description: "Назва папки" },
              x: { type: "NUMBER" },
              y: { type: "NUMBER" },
            },
            required: ["name"],
          },
        },
      ],
    },
  ];

  const extractedToolCalls: Array<{ name: string; args: any }> = [];

  // Attempt 1: Gemini generation with Canvas Function Declarations (timeout 25s)
  try {
    const res: any = await withTimeout(
      ai.models.generateContent({
        model: primaryModel,
        contents: formattedContents,
        config: {
          systemInstruction,
          tools: canvasTools as any,
          temperature: 0.7,
        },
      }),
      25000,
      "Запит з інструментами полотна перевищив таймаут"
    );

    if (res.functionCalls && Array.isArray(res.functionCalls) && res.functionCalls.length > 0) {
      for (const fc of res.functionCalls) {
        extractedToolCalls.push({ name: fc.name, args: fc.args });
      }
    }

    let text = res.text ? res.text.trim() : "";
    const parsed = extractToolCallsFromText(text);
    extractedToolCalls.push(...parsed.toolCalls);

    // Handle web_search function call if model invoked web_search
    const searchCall = extractedToolCalls.find((tc) => tc.name === "web_search");
    if (searchCall && searchCall.args?.query) {
      const searchResults = await performWebSearch(searchCall.args.query, customTavilyKey, customSerperKey);
      if (searchResults.length > 0) {
        const searchContext = searchResults.map((r) => `• [${r.title}](${r.url}): ${r.snippet}`).join("\n");
        const reContents = [
          ...formattedContents,
          { role: "model", parts: [{ text: `Шукаю інформацію за запитом "${searchCall.args.query}"...` }] },
          { role: "user", parts: [{ text: `Свіжі результати веб-пошуку:\n${searchContext}\n\nСформулюй розгорнуту відповідь.` }] },
        ];
        const res2: any = await ai.models.generateContent({
          model: primaryModel,
          contents: reContents,
          config: { systemInstruction, temperature: 0.7 },
        });
        if (res2.text) {
          let ans = res2.text.trim();
          const sourcesStr = searchResults.slice(0, 4).map((r) => `- [${r.title}](${r.url})`).join("\n");
          if (!ans.includes("Джерела:")) {
            ans += `\n\n🌐 **Джерела (Web Search API):**\n${sourcesStr}`;
          }
          return {
            text: ans,
            toolCalls: extractedToolCalls.filter((tc) => tc.name !== "web_search"),
          };
        }
      }
    }

    let finalResponseText = parsed.cleanText;
    if (!finalResponseText && extractedToolCalls.length > 0) {
      finalResponseText = "Створено об'єкти на полотні за вашим запитом.";
    }

    if (finalResponseText || extractedToolCalls.length > 0) {
      return {
        text: finalResponseText,
        toolCalls: extractedToolCalls.filter((tc) => tc.name !== "web_search"),
      };
    }
  } catch (canvasErr: any) {
    console.warn("[Gemini Canvas Tools Warning]:", canvasErr?.message || canvasErr);
    const errStr = String(canvasErr);
    if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
      throw canvasErr;
    }
  }

  // Attempt 2: Standard generation with gemini-3.6-flash (timeout 25s)
  try {
    const res: any = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      }),
      25000,
      "Запит без пошуку перевищив таймаут"
    );

    let text = res.text ? res.text.trim() : "";
    const parsed = extractToolCallsFromText(text);

    return { text: parsed.cleanText || "Створено об'єкти на полотні.", toolCalls: parsed.toolCalls };
  } catch (directErr: any) {
    console.warn("[Gemini Direct Gen Warning]:", directErr?.message || directErr);
    const errStr = String(directErr);
    if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
      throw directErr;
    }
  }

  // Attempt 3: Secondary model fallback (gemini-3.1-flash-lite) (timeout 20s)
  try {
    const res: any = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      }),
      20000,
      "Резервна модель перевищила таймаут"
    );

    let text = res.text ? res.text.trim() : "";
    const parsed = extractToolCallsFromText(text);

    return { text: parsed.cleanText || "Створено об'єкти на полотні.", toolCalls: parsed.toolCalls };
  } catch (fallbackErr: any) {
    console.error("[Gemini Fallback Model Error]:", fallbackErr?.message || fallbackErr);
    throw fallbackErr;
  }

  throw new Error("Не вдалося одержати відповідь від Gemini API (порожня відповідь).");
}

function extractToolCallsFromText(text: string): { cleanText: string; toolCalls: Array<{ name: string; args: any }> } {
  const toolCalls: Array<{ name: string; args: any }> = [];
  let cleanText = text;

  // 1. Check for [TOOL_CALL:name JSON]
  const toolCallRegex = /\[TOOL_CALL:([a-zA-Z0-9_]+)\s*(\{[\s\S]*?\})\]/g;
  let match;
  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      const name = match[1];
      const args = JSON.parse(match[2]);
      toolCalls.push({ name, args });
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {}
  }

  // 2. Check for [CREATE_SWOT: JSON]
  const swotRegex = /\[CREATE_SWOT:\s*(\{[\s\S]*?\})\]/g;
  while ((match = swotRegex.exec(text)) !== null) {
    try {
      const args = JSON.parse(match[1]);
      toolCalls.push({ name: 'create_swot_analysis', args });
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {}
  }

  // 3. Check for legacy [CREATE_NOTE: Title | Content]
  const noteRegex = /\[CREATE_NOTE:\s*([^|]+)\|\s*([^\]]+)\]/g;
  while ((match = noteRegex.exec(text)) !== null) {
    toolCalls.push({
      name: 'create_note',
      args: { title: match[1].trim(), content: match[2].trim() },
    });
    cleanText = cleanText.replace(match[0], '');
  }

  // 4. Check for embedded JSON tool_calls block
  const jsonBlocks = text.match(/```json\s*([\s\S]*?)\s*```/g);
  if (jsonBlocks) {
    for (const block of jsonBlocks) {
      try {
        const jsonContent = block.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonContent);
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            if (tc.name && tc.args) {
              toolCalls.push({ name: tc.name, args: tc.args });
            }
          }
          cleanText = cleanText.replace(block, '');
        } else if (parsed.name && (parsed.args || parsed.projectTitle)) {
          toolCalls.push({ name: parsed.name || 'create_swot_analysis', args: parsed.args || parsed });
          cleanText = cleanText.replace(block, '');
        }
      } catch (e) {}
    }
  }

  return { cleanText: cleanText.trim(), toolCalls };
}

// Health check endpoint with AI readiness status
app.get("/api/health", (_req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const hasDeepSeekKey = Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0);
  const hasTavilyKey = Boolean(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim().length > 0);
  const hasSerperKey = Boolean(process.env.SERPER_API_KEY && process.env.SERPER_API_KEY.trim().length > 0);
  res.json({
    status: "ok",
    timestamp: Date.now(),
    aiConfigured: hasGeminiKey || hasDeepSeekKey,
    hasGeminiKey,
    geminiKeyConfigured: hasGeminiKey,
    hasDeepSeekKey,
    hasSearchApi: hasTavilyKey || hasSerperKey,
    hasTavilyKey,
    hasSerperKey,
  });
});

// REST endpoint for direct Web Search queries
app.get("/api/search", async (req, res) => {
  const query = (req.query.q as string || "").trim();
  if (!query) {
    return res.status(400).json({ error: true, message: "Не вказано параметр запиту 'q'." });
  }
  try {
    const results = await performWebSearch(query);
    const hasTavily = Boolean(process.env.TAVILY_API_KEY);
    const hasSerper = Boolean(process.env.SERPER_API_KEY);
    const providerUsed = hasTavily ? "Tavily API" : hasSerper ? "Serper API" : "DuckDuckGo Web Search";
    return res.json({
      query,
      results,
      count: results.length,
      provider: providerUsed,
    });
  } catch (err: any) {
    console.error("[Search Endpoint Error]:", err);
    return res.status(500).json({ error: true, message: err?.message || "Помилка веб-пошуку." });
  }
});


// Endpoint to detect real installed Ollama local models
app.get("/api/ai/ollama/models", async (req, res) => {
  const customUrl = (req.query.url as string)?.trim().replace(/\/$/, "");
  const urlsToTry = Array.from(new Set([
    customUrl,
    "http://localhost:11434",
    "http://127.0.0.1:11434",
  ])).filter(Boolean) as string[];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const ollamaRes = await fetch(`${url}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const models = (data.models || []).map((m: any) => ({
          name: m.name,
          size: m.size,
          modifiedAt: m.modified_at,
        }));
        return res.json({ online: true, models, count: models.length, url });
      }
    } catch (e) {
      // Try next URL
    }
  }

  return res.json({
    online: false,
    models: [],
    message: "Ollama локально не запущена або недоступна для сервера.",
  });
});

// AI Chat API Route
app.post("/api/ai/chat", async (req, res) => {
  try {
    const {
      messages = [],
      provider = "gemini",
      geminiApiKey,
      geminiModel = "gemini-3.6-flash",
      deepseekApiKey,
      deepseekModel = "deepseek-chat",
      ollamaModel = "llama3",
      tavilyApiKey,
      serperApiKey,
      contextData,
    } = req.body;

    let systemInstruction = `Ти — розумний AI асистент з підтримкою прямого керування полотном (Function Calling / Tools API).

ТВОЯ РОЛЬ ТА ПРИНЦИПИ ВІДПОВІДІ:
1. Пряма відповідь без вступів: Завжди відповідай ДИРЕКТНО, чітко, структуровано та розгорнуто на питання користувача. НЕ додавай системних префіксів, вступів на кшталт "Отримано запит: ...", "Я готовий допомогти...".
2. Сфера допомоги: Відповідай на БУДЬ-ЯКІ питання з будь-яких галузей (аналітика, кодування, генерація текстів, навчання).
3. ВЗАЄМОДІЯ З ПОЛОТНОМ ТА ІНСТРУМЕНТИ (Tools / Function Calling):
   У тебе є інструменти для автоматичного створення об'єктів на полотні:
   - Якщо користувач просить створити SWOT-аналіз ("Створи SWOT для проєкту X"), ВИКЛИКАЙ функцію create_swot_analysis з структурованими даними (projectTitle, strengths, weaknesses, opportunities, threats).
   - Якщо користувач просить створити нотатку чи картку, ВИКЛИКАЙ create_note (title, content, color).
   - Якщо користувач просить створити планувальник або чекліст, ВИКЛИКАЙ create_planner (title, tasks).
   - Якщо користувач просить створити папку, ВИКЛИКАЙ create_folder (name).
4. Якщо твоя модель не підтримує нативний Function Calling, надсилай виклики у форматі:
[TOOL_CALL:create_swot_analysis {"projectTitle": "...", "strengths": [...], "weaknesses": [...], "opportunities": [...], "threats": [...]}]
або
[CREATE_NOTE: Заголовок | Зміст]`;

    if (contextData && (contextData.notesCount > 0 || contextData.notesSummary)) {
      if (contextData.notesSummary && contextData.notesSummary !== "Полотно порожнє") {
        systemInstruction += `\n\n[КОНТЕКСТ ПОЛОТНА КОРИСТУВАЧА]:\nВсього нотаток: ${contextData.notesCount || 0}, папок: ${contextData.foldersCount || 0}\nЗміст нотаток:\n${contextData.notesSummary}`;
      }
    }

    // Real-time Web Search Auto-Grounding
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const searchTriggers = [
      "погода", "курс", "новини", "пошук", "знайди", "шукай", "search", "weather", "news",
      "rate", "актуальн", "сьогодні", "валюта", "долар", "євро", "гривні", "президент", "події"
    ];
    const needsWebSearch = searchTriggers.some((tr) => lastUserMsg.toLowerCase().includes(tr));

    if (needsWebSearch) {
      try {
        const searchResults = await performWebSearch(lastUserMsg, tavilyApiKey, serperApiKey);
        if (searchResults.length > 0) {
          const searchSnippet = searchResults.map((r) => `• [${r.title}](${r.url}): ${r.snippet}`).join("\n");
          systemInstruction += `\n\n[АКТУАЛЬНІ ДАНІ З МЕРЕЖІ ІНТЕРНЕТ (Web Search API)]:\n${searchSnippet}\n\nВикористовуй ці реальні свіжі дані у відповіді та обов'язково вказуй посилання на джерела (🌐 Джерела).`;
        }
      } catch (e) {
        console.warn("[Auto Pre-Search Warning]:", e);
      }
    }


    // 1. Try DeepSeek if selected
    if (provider === "deepseek") {
      const activeKey = deepseekApiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
      if (!activeKey) {
        return res.status(400).json({
          error: true,
          reason: "no_api_key",
          response: "DEEPSEEK_API_KEY не вказано. Вкажіть ключ у налаштуваннях AI або середовищі.",
        });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const apiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: deepseekModel || "deepseek-chat",
            messages: [
              { role: "system", content: systemInstruction },
              ...messages.map((m: any) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })),
            ],
          }),
        });
        clearTimeout(timeout);

        if (apiRes.ok) {
          const data = await apiRes.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            const parsed = extractToolCallsFromText(reply);
            return res.json({ response: parsed.cleanText || "Дію виконано.", provider: "deepseek", toolCalls: parsed.toolCalls });
          }
        } else {
          const errText = await apiRes.text();
          console.error("[DeepSeek API Error]:", apiRes.status, errText);
          let userHint = `Помилка DeepSeek API (HTTP ${apiRes.status}): ${apiRes.statusText}`;
          if (apiRes.status === 402) {
            userHint = "На акаунті DeepSeek вичерпано баланс (HTTP 402: Payment Required). Поповніть баланс на платформі DeepSeek або переключіться на Gemini у налаштуваннях AI (⚙️).";
          }
          return res.status(apiRes.status).json({
            error: true,
            reason: "api_error",
            response: userHint,
          });
        }
      } catch (dsErr: any) {
        console.error("[DeepSeek Chat Error]:", dsErr?.message || dsErr);
        return res.status(500).json({
          error: true,
          reason: "network_error",
          response: `Помилка з'єднання з DeepSeek API: ${dsErr?.message || "Збій мережі"}`,
        });
      }
    }

    // 2. Try Local Ollama if selected
    if (provider === "local") {
      const customUrl = req.body.ollamaUrl ? String(req.body.ollamaUrl).trim().replace(/\/$/, "") : "";
      const urlsToTry = Array.from(new Set([
        customUrl,
        "http://localhost:11434",
        "http://127.0.0.1:11434",
      ])).filter(Boolean) as string[];

      for (const targetUrl of urlsToTry) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);

          const ollamaRes = await fetch(`${targetUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              model: ollamaModel || "llama3",
              stream: false,
              messages: [
                { role: "system", content: systemInstruction },
                ...messages,
              ],
            }),
          });
          clearTimeout(timeout);

          if (ollamaRes.ok) {
            const oData = await ollamaRes.json();
            const reply = oData.message?.content;
            if (reply) {
              const parsed = extractToolCallsFromText(reply);
              return res.json({ response: parsed.cleanText || "Дію виконано.", provider: "local", toolCalls: parsed.toolCalls });
            }
          }
        } catch (e: any) {
          console.warn(`[Ollama Error on ${targetUrl}]:`, e?.message || e);
        }
      }

      return res.status(503).json({
        error: true,
        reason: "ollama_offline",
        response: "⚠️ Локальний AI (Ollama) недоступний на сервері Cloud Run.\n\nОскільки веб-додаток працює через хмару (HTTPS), браузер блокує локальні HTTP-запити до вашого ПК (127.0.0.1:11434).\n\nЯк це виправлено:\n1. У налаштуваннях AI (⚙️) вкажіть тунель ngrok/Cloudflare або замініть провайдера на Gemini.\n2. Якщо запускаєте Ollama на ПК, переконайся, що ввімкнено CORS: `OLLAMA_ORIGINS=* ollama serve`",
      });
    }

    // 3. Primary AI: Gemini AI
    try {
      const { text, toolCalls } = await handleGeminiGeneration(
        messages,
        systemInstruction,
        geminiApiKey,
        geminiModel,
        tavilyApiKey,
        serperApiKey
      );
      return res.json({ response: text, provider: "gemini", toolCalls });
    } catch (geminiError: any) {
      console.error("[Gemini Chat Route Error]:", geminiError?.message || geminiError);
      const errMsg = geminiError?.message || String(geminiError);

      if (errMsg.includes("NO_API_KEY")) {
        return res.status(400).json({
          error: true,
          reason: "no_api_key",
          response: "AI недоступний: не вказано GEMINI_API_KEY. Вкажіть ключ у середовищі (.env.local) або введіть свій API ключ у Налаштуваннях AI (⚙️).",
        });
      }
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota")) {
        return res.status(429).json({
          error: true,
          reason: "quota_exceeded",
          response: "Перевищено ліміт запитів Gemini API (quota exceeded). Зачекайте хвилю або введіть власний API ключ у налаштуваннях.",
        });
      }
      if (errMsg.includes("TIMEOUT")) {
        return res.status(504).json({
          error: true,
          reason: "timeout",
          response: "Час очікування відповіді від Gemini API вичерпано. Спробуйте надіслати запит ще раз.",
        });
      }

      return res.status(500).json({
        error: true,
        reason: "api_error",
        response: `Помилка Gemini API: ${errMsg.replace(/^Error:\s*/, "")}`,
      });
    }
  } catch (error: any) {
    console.error("AI Chat Route Error:", error);
    res.status(500).json({ error: true, response: error.message || "Внутрішня помилка сервера" });
  }
});

// Endpoint for fast API Key Validation without tool calls or heavy context
app.post("/api/ai/verify-key", async (req, res) => {
  try {
    const { provider = "gemini", apiKey, model } = req.body;
    const activeKey = (apiKey || "").trim() || (provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.DEEPSEEK_API_KEY)?.trim();

    if (!activeKey) {
      return res.status(400).json({
        ok: false,
        message: "API Ключ не вказано.",
      });
    }

    if (provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const targetModel = normalizeGeminiModel(model);
      try {
        const testRes: any = await withTimeout(
          ai.models.generateContent({
            model: targetModel,
            contents: [{ role: "user", parts: [{ text: "Привіт" }] }],
          }),
          10000,
          "Таймаут перевірки ключа Gemini"
        );
        if (testRes.text) {
          return res.json({ ok: true, message: `Ключ дійсний (${targetModel})` });
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
          return res.status(400).json({ ok: false, message: "Недійсний API ключ Gemini (перевірте правильність ключа)." });
        }
        if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
          return res.status(429).json({ ok: false, message: "Перевищено ліміт запитів (Quota exceeded) для цієї моделі або акаунту." });
        }
        // If pro model failed with quota or error, attempt fallback check with flash
        if (targetModel !== "gemini-3.6-flash") {
          try {
            const fallbackRes: any = await ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: [{ role: "user", parts: [{ text: "Привіт" }] }],
            });
            if (fallbackRes.text) {
              return res.json({ ok: true, message: "Ключ дійсний (для Gemini 3.6 Flash)" });
            }
          } catch (fbErr) {}
        }
        return res.status(400).json({ ok: false, message: `Помилка Gemini: ${msg.replace(/^Error:\s*/, "")}` });
      }
    } else if (provider === "deepseek") {
      try {
        const apiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: model || "deepseek-chat",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 5,
          }),
        });
        if (apiRes.ok) {
          return res.json({ ok: true, message: "Ключ DeepSeek дійсний" });
        } else {
          if (apiRes.status === 402) {
            return res.status(402).json({ ok: false, message: "На акаунті DeepSeek вичерпано баланс (HTTP 402)." });
          }
          if (apiRes.status === 401) {
            return res.status(401).json({ ok: false, message: "Недійсний API ключ DeepSeek." });
          }
          return res.status(apiRes.status).json({ ok: false, message: `Помилка DeepSeek (HTTP ${apiRes.status})` });
        }
      } catch (err: any) {
        return res.status(500).json({ ok: false, message: `Помилка мережі DeepSeek: ${err?.message}` });
      }
    }

    return res.status(400).json({ ok: false, message: "Невідомий провайдер." });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || "Помилка сервера." });
  }
});

// Start server function
async function startServer() {
  // Vite integration in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
