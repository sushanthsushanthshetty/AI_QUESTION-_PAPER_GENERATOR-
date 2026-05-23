import { MongoClient } from 'mongodb';
import dns from 'dns';

// Force IPv4 DNS resolution first to fix MongoDB SRV DNS lookup issues
dns.setDefaultResultOrder('ipv4first');

let db = null;
let client = null;

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    // Don't try to connect if the URI is the default placeholder
    if (uri.includes('username:password@cluster.mongodb.net')) {
      throw new Error('MongoDB URI placeholder detected. Using local JSON file fallback.');
    }

    // Connection options to fix DNS/SRV resolution issues
    const options = {
      family: 4,          // Force IPv4 connections
      serverSelectionTimeoutMS: 15000,  // 15 second timeout for server selection
      connectTimeoutMS: 15000,          // 15 second timeout for initial connection
      socketTimeoutMS: 45000,           // 45 second socket timeout
      retryWrites: true,
      w: 'majority'
    };

    console.log('Connecting to MongoDB...');
    console.log(`URI: ${uri.substring(0, uri.indexOf('@') > 0 ? uri.indexOf('@') : uri.length)}`);

    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(process.env.MONGODB_DB_NAME || 'question_paper_db');
    
    console.log('=================================================');
    console.log('✓ MongoDB connected successfully');
    console.log(`  Database: ${db.databaseName}`);
    console.log(`  Server: ${uri.substring(uri.indexOf('@') + 1, uri.indexOf('/') > uri.indexOf('@') ? uri.indexOf('/') : uri.length)}`);
    console.log('=================================================');

    // Create indexes
    try {
      await db.collection('teachers').createIndex({ email: 1 }, { unique: true });
      await db.collection('teachers').createIndex({ teacherId: 1 }, { unique: true });
      await db.collection('papers').createIndex({ paperId: 1 }, { unique: true });
      await db.collection('papers').createIndex({ teacherId: 1 });
      console.log('✓ MongoDB indexes created');
    } catch (indexError) {
      console.warn('Warning: Could not create indexes:', indexError.message);
    }

    return db;
  } catch (error) {
    console.warn('✗ MongoDB connection failed:', error.message);
    console.warn('  The application will fall back to local JSON file storage.');
    db = null;
    client = null;
    return null;
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Using local JSON fallback.');
  }
  return db;
}

export function isDBConnected() {
  return db !== null && client !== null;
}

export async function closeDB() {
  if (client) {
    try {
      await client.close();
      console.log('MongoDB connection closed');
    } catch (e) {
      // ignore close errors
    }
  }
}