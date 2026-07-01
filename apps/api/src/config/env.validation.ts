import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),
  MONGODB_DB: Joi.string().default('connect-govt'),
  JWT_SECRET: Joi.string().required().description('Secret key for signing Access Tokens'),
  JWT_REFRESH_SECRET: Joi.string().description('Secret key for signing Refresh Tokens'),
  FRONTEND_URL: Joi.string().required(),
  CLIENT_URL: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().optional(),
  GEMINI_API_KEY: Joi.string().required(),
  AI_PROVIDER: Joi.string().valid('gemini', 'openai').default('gemini'),
  ENABLE_LOCAL_FALLBACK: Joi.boolean().default(true),
  CACHE_ENABLED: Joi.boolean().default(true),
  CONFIDENCE_THRESHOLD: Joi.number().min(0).max(100).default(80),
  MAX_UPLOAD_SIZE_MB: Joi.number().default(10),
});
