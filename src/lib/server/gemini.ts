import { GoogleGenerativeAI } from '@google/generative-ai';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export type GeminiResult = {
  reply: string;
  next_stage?: string;
  lead_type?: 'unknown' | 'candidate' | 'agency';
  need_link?: boolean;
  stop?: boolean;
  tags?: Record<string, string>;
  memory_update?: string;
};

const SYSTEM_FALLBACK: GeminiResult = {
  reply: 'Понял. Напиши, пожалуйста: страна и какая работа интересует (например: Германия, склад).',
  next_stage: 'ask_country_job',
  lead_type: 'unknown',
};

const DEFAULT_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-pro'];

export async function callGemini(args: {
  systemPrompt: string;
  userText: string;
  memory: { summary: string; recent: { direction: 'in' | 'out'; text: string }[] };
  stage: string;
}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const envModel = process.env.GEMINI_MODEL;
  const models = envModel
    ? [envModel, ...DEFAULT_MODELS.filter(m => m !== envModel)]
    : DEFAULT_MODELS;

  const genAI = new GoogleGenerativeAI(apiKey);

  const recentLines = args.memory.recent
    .slice(-12)
    .map(m => (m.direction === 'in' ? `USER: ${m.text}` : `BOT: ${m.text}`))
    .join('\n');

  const prompt = [
    'Ты отвечаешь ТОЛЬКО валидным JSON без текста вокруг.',
    'JSON поля: reply (string, <= 350 символов), next_stage (string), lead_type ("unknown"|"candidate"|"agency"), need_link (boolean), stop (boolean), memory_update (string).',
    'Нельзя повторять один и тот же вопрос, если ответ уже есть в summary/истории.',
    'Один вопрос за сообщение.',
    '',
    'SYSTEM_PROMPT:',
    args.systemPrompt,
    '',
    'CURRENT_STAGE:',
    args.stage,
    '',
    'MEMORY_SUMMARY:',
    args.memory.summary || '',
    '',
    'RECENT_DIALOG:',
    recentLines || '',
    '',
    'USER_MESSAGE:',
    args.userText,
  ].join('\n');

  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`🤖 [Gemini] Trying model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      const jsonText = extractJson(raw);
      const parsed = JSON.parse(jsonText);

      if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
        console.warn(`⚠️ [Gemini] Model ${modelName} returned invalid JSON, skipping...`);
        continue; // Try next model if response is bad
      }

      const reply = String(parsed.reply).slice(0, 500);
      return {
        reply,
        next_stage: typeof parsed.next_stage === 'string' ? parsed.next_stage : undefined,
        lead_type: ['unknown', 'candidate', 'agency'].includes(parsed.lead_type) ? parsed.lead_type : 'unknown',
        need_link: typeof parsed.need_link === 'boolean' ? parsed.need_link : undefined,
        stop: typeof parsed.stop === 'boolean' ? parsed.stop : undefined,
        memory_update: typeof parsed.memory_update === 'string' ? parsed.memory_update.slice(0, 2000) : undefined,
      };

    } catch (e: any) {
      console.error(`❌ [Gemini] Model ${modelName} failed:`, e.message);
      lastError = e;
      // Continue to next model
    }
  }

  console.error('❌CRITICAL [Gemini] All models failed.');
  return SYSTEM_FALLBACK;
}

function extractJson(s: string): string {
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) return s.slice(first, last + 1);
  return s;
}
