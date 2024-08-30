import dotenv from 'dotenv';

export const loadEnv = () => {
  dotenv.config();
};

export const getEnvVariable = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value) return value 
  if (fallback) return fallback;
  throw new Error(`Environment variable ${key} is not set.`);
};