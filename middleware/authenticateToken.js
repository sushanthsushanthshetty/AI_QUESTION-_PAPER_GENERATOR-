import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { getDB, isDBConnected } from '../db/connection.js';

const AUTH_DB_PATH = path.join(
  os.homedir(),
  '.gemini',
  'antigravity',
  'scratch',
  'auth_db.json'
);

function readTeachersFallback() {
  try {
    if (!fs.existsSync(AUTH_DB_PATH)) return [];
    const data = fs.readFileSync(AUTH_DB_PATH, 'utf-8');
    return JSON.parse(data).teachers || [];
  } catch (error) {
    return [];
  }
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ success: false, error: 'Token expired. Please log in again.' });
      }
      return res.status(403).json({ success: false, error: 'Invalid token. Please log in again.' });
    }

    req.teacherId = decoded.teacherId;
    req.email = decoded.email;
    req.firstName = decoded.firstName;
    req.lastName = decoded.lastName;
    req.department = decoded.department;
    req.sessionId = decoded.sessionId;

    // Session revocation check (if sessionId exists in token)
    if (decoded.sessionId) {
      try {
        let sessionExists = false;
        if (isDBConnected()) {
          const db = getDB();
          const teacher = await db.collection('teachers').findOne({ teacherId: decoded.teacherId });
          if (teacher && teacher.sessions) {
            sessionExists = teacher.sessions.some(s => s.sessionId === decoded.sessionId);
          }
        } else {
          const teachers = readTeachersFallback();
          const teacher = teachers.find(t => t.teacherId === decoded.teacherId);
          if (teacher && teacher.sessions) {
            sessionExists = teacher.sessions.some(s => s.sessionId === decoded.sessionId);
          }
        }

        if (!sessionExists) {
          return res.status(403).json({ success: false, error: 'Session has been revoked or expired. Please log in again.' });
        }
      } catch (dbError) {
        console.error('Session check error:', dbError);
        // Fallback: allow request to proceed if DB lookup fails to avoid locking out users
      }
    }

    next();
  });
}