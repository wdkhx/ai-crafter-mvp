import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env.js';

export async function callLlm(prompt, fallbackFactory, options = {}) {
  if (!env.useRealLlm || !env.openAiApiKey) {
    return fallbackFactory();
  }

  const baseURL = normalizeOpenAiBaseUrl(env.openAiBaseUrl);

  try {
    const model = new ChatOpenAI({
      apiKey: env.openAiApiKey,
      model: env.openAiModel,
      temperature: options.temperature ?? 0.35,
      configuration: baseURL ? { baseURL } : undefined
    });
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    if (!baseURL) throw error;
    console.warn(`LangChain call failed, falling back to compatible HTTP client: ${error.message}`);
    return callOpenAiCompatibleChat(prompt, baseURL, options);
  }
}

async function callOpenAiCompatibleChat(prompt, baseURL, options) {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.openAiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.35,
      stream: false
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LLM service returned ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || data.output_text || text;
}

export function normalizeOpenAiBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}
