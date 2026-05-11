import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_crafter',
  clientBaseUrl: process.env.CLIENT_BASE_URL || 'http://localhost:5173',
  apiDemoToken: process.env.API_DEMO_TOKEN || 'dev-token',
  useRealLlm: process.env.USE_REAL_LLM === 'true',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || '',
  intelligenceKeywords: (process.env.INTELLIGENCE_KEYWORDS ||
    'ai agent,langgraph,rag agent,multi agent,llm workflow')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
};
