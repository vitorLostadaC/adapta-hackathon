import { z } from 'zod'

export const envSchema = z.object({
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_CLIENT_EMAIL: z.string(),
  GOOGLE_PRIVATE_KEY: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  GROQ_API_KEY: z.string()
})

export const env = envSchema.parse(process.env)
