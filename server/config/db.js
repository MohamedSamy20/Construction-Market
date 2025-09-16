import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/construction_marketplace';
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGO_DBNAME || undefined });
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] connection error', err);
    process.exit(1);
  }
}
