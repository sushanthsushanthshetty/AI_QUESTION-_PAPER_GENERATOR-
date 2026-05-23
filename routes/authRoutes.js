import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB, isDBConnected } from '../db/connection.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = express.Router();

// Local JSON file path for auth fallback (same directory as papers_db.json)
const AUTH_DB_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '.gemini',
  'antigravity',
  'scratch',
  'auth_db.json'
);

// Ensure the local auth database directory and file exist
function initializeAuthDb() {
  const dir = path.dirname(AUTH_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(AUTH_DB_PATH)) {
    fs.writeFileSync(AUTH_DB_PATH, JSON.stringify({ teachers: [] }, null, 2), 'utf-8');
  }
}
initializeAuthDb();

// Read teachers from local auth DB
function readTeachers() {
  try {
    initializeAuthDb();
    const data = fs.readFileSync(AUTH_DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.teachers || [];
  } catch (error) {
    console.error('Error reading auth database:', error);
    return [];
  }
}

// Write teachers to local auth DB
function writeTeachers(teachers) {
  try {
    initializeAuthDb();
    fs.writeFileSync(AUTH_DB_PATH, JSON.stringify({ teachers }, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing auth database:', error);
    return false;
  }
}

// Sign Up
router.post('/signup', async (req, res) => {
  const { email, firstName, lastName, department, password } = req.body;

  // Validate inputs
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }

  try {
    let existingTeacher = null;
    let teacherCount = 0;

    if (isDBConnected()) {
      const db = getDB();
      const teachersCollection = db.collection('teachers');
      existingTeacher = await teachersCollection.findOne({ email: email.toLowerCase() });
      teacherCount = await teachersCollection.countDocuments();
    } else {
      // Local JSON fallback
      const teachers = readTeachers();
      existingTeacher = teachers.find(t => t.email === email.toLowerCase());
      teacherCount = teachers.length;
    }

    if (existingTeacher) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Generate unique Teacher ID
    const deptCode = department ? department.substring(0, 2).toUpperCase() : 'CS';
    const teacherId = `MVIT-${deptCode}-${String(teacherCount + 1).padStart(6, '0')}`;

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcryptjs.hash(password, saltRounds);

    const teacherDoc = {
      teacherId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      department: department || '',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').insertOne(teacherDoc);
    } else {
      // Local JSON fallback
      const teachers = readTeachers();
      teachers.push(teacherDoc);
      writeTeachers(teachers);
    }

    // Generate JWT
    const token = jwt.sign(
      { teacherId, email: email.toLowerCase(), firstName, lastName, department: department || '' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      teacherId,
      user: { teacherId, email: email.toLowerCase(), firstName, lastName, department: department || '' }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ success: false, error: 'Sign up failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    let teacher = null;

    if (isDBConnected()) {
      const db = getDB();
      const teachersCollection = db.collection('teachers');
      teacher = await teachersCollection.findOne({ email: email.toLowerCase() });
    } else {
      // Local JSON fallback
      const teachers = readTeachers();
      teacher = teachers.find(t => t.email === email.toLowerCase()) || null;
    }

    if (!teacher) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const passwordMatch = await bcryptjs.compare(password, teacher.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { 
        teacherId: teacher.teacherId, 
        email: teacher.email, 
        firstName: teacher.firstName, 
        lastName: teacher.lastName, 
        department: teacher.department || '' 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        teacherId: teacher.teacherId,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        department: teacher.department || ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Validate Token
router.get('/validate', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      teacherId: req.teacherId,
      email: req.email,
      firstName: req.firstName,
      lastName: req.lastName,
      department: req.department
    }
  });
});

// Get Teacher Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let teacher = null;

    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne(
        { teacherId: req.teacherId },
        { projection: { password: 0 } }
      );
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId) || null;
      if (teacher) {
        const { password, ...profile } = teacher;
        teacher = profile;
      }
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    res.json({ success: true, user: teacher });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

export default router;