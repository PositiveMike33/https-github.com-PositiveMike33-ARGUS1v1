import pkg from 'pg';
const { Pool } = pkg;
import { createClient } from 'redis';

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('❌ Erreur Redis:', err));

export const initDB = async () => {
  try {
    await pgPool.query('SELECT NOW()');
    console.log('✅ Connecté à PostgreSQL');
    
    await redisClient.connect();
    console.log('✅ Connecté à Redis Stack (Vector DB ready)');
  } catch (error) {
    console.error('❌ Erreur Critique DB:', error);
    process.exit(1);
  }
};
