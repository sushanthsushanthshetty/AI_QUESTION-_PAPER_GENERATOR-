import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { getDB, isDBConnected } from '../db/connection.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = express.Router();

// Parse user agent to get browser/OS info
function parseUserAgent(ua) {
  if (!ua) return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/edge|edg/i.test(ua)) browser = 'Edge';
  else if (/opr/i.test(ua)) browser = 'Opera';

  return `${browser} on ${os}`;
}

// Simple CRC32 implementation for zero-dependency zip creation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Zero-dependency store-only (uncompressed) ZIP compiler
function createZip(files) {
  let offset = 0;
  const localHeaderBuffers = [];
  const centralDirHeaders = [];
  
  const writeUInt16LE = (val) => {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(val, 0);
    return buf;
  };
  const writeUInt32LE = (val) => {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(val, 0);
    return buf;
  };

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf-8');
    const dataBuf = typeof file.content === 'string' ? Buffer.from(file.content, 'utf-8') : file.content;
    const size = dataBuf.length;
    const crc = crc32(dataBuf);

    const date = new Date();
    const timeVal = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1));
    const dateVal = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate());

    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      writeUInt16LE(10),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(timeVal),
      writeUInt16LE(dateVal),
      writeUInt32LE(crc),
      writeUInt32LE(size),
      writeUInt32LE(size),
      writeUInt16LE(nameBuf.length),
      writeUInt16LE(0),
      nameBuf
    ]);

    localHeaderBuffers.push(localHeader);
    localHeaderBuffers.push(dataBuf);

    const cdHeader = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      writeUInt16LE(20),
      writeUInt16LE(10),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(timeVal),
      writeUInt16LE(dateVal),
      writeUInt32LE(crc),
      writeUInt32LE(size),
      writeUInt32LE(size),
      writeUInt16LE(nameBuf.length),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(offset),
      nameBuf
    ]);

    centralDirHeaders.push(cdHeader);
    offset += localHeader.length + size;
  }

  const centralDirBuffer = Buffer.concat(centralDirHeaders);
  const cdSize = centralDirBuffer.length;

  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(files.length),
    writeUInt16LE(files.length),
    writeUInt32LE(cdSize),
    writeUInt32LE(offset),
    writeUInt16LE(0)
  ]);

  return Buffer.concat([...localHeaderBuffers, centralDirBuffer, eocd]);
}

// Local JSON file path for auth fallback (same directory as papers_db.json)
const AUTH_DB_PATH = path.join(
  os.homedir(),
  '.gemini',
  'antigravity',
  'scratch',
  'auth_db.json'
);

// Papers DB path for counting stats
const PAPERS_DB_PATH = path.join(
  os.homedir(),
  '.gemini',
  'antigravity',
  'scratch',
  'papers_db.json'
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

// Default profile fields for new users / migration
const DEFAULT_PROFILE = {
  phoneNumber: '',
  bio: '',
  designation: '',
  profilePicture: '',
  subjectSpecialization: [],
  institution: 'Sir M. Visvesvaraya Institute of Technology',
  role: 'Faculty',
  sessions: [],
  loginHistory: [],
  twoFactor: {
    enabled: false,
    method: 'email', // 'email' or 'sms'
    secret: '',
    otpExpiry: '',
    backupCodes: []
  },
  preferences: {
    theme: 'light',
    notifications: {
      emailOnPaperGenerated: true,
      emailOnCommentReceived: true
    }
  }
};

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

// Read papers from local DB for stats
function readPapers() {
  try {
    const dir = path.dirname(PAPERS_DB_PATH);
    if (!fs.existsSync(dir)) return [];
    if (!fs.existsSync(PAPERS_DB_PATH)) return [];
    const data = fs.readFileSync(PAPERS_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading papers database:', error);
    return [];
  }
}

// Write papers to local papers DB
function writePapers(papers) {
  try {
    const dir = path.dirname(PAPERS_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PAPERS_DB_PATH, JSON.stringify(papers, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing papers database:', error);
    return false;
  }
}

// Count papers for a teacher
function countTeacherPapers(teacherId) {
  try {
    if (isDBConnected()) {
      // Will be resolved async in the route handler
      return null;
    }
    const papers = readPapers();
    return papers.filter(p => p.teacherId === teacherId).length;
  } catch (e) {
    return 0;
  }
}

// Merge defaults into teacher doc (safe migration)
function mergeProfileDefaults(teacher) {
  if (!teacher) return null;
  return {
    ...DEFAULT_PROFILE,
    ...teacher,
    twoFactor: {
      ...DEFAULT_PROFILE.twoFactor,
      ...(teacher.twoFactor || {})
    },
    preferences: {
      ...DEFAULT_PROFILE.preferences,
      ...(teacher.preferences || {}),
      notifications: {
        ...DEFAULT_PROFILE.preferences.notifications,
        ...((teacher.preferences && teacher.preferences.notifications) || {})
      }
    }
  };
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

    const now = new Date().toISOString();
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    const device = parseUserAgent(req.headers['user-agent']);

    const sessionObj = { sessionId, ip, userAgent: device, loginTime: now, lastActive: now };
    const historyObj = { loginTime: now, ip, userAgent: device };

    const teacherDoc = {
      ...DEFAULT_PROFILE,
      teacherId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      department: department || '',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
      lastLogin: now,
      isActive: true,
      sessions: [sessionObj],
      loginHistory: [historyObj]
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

    // Generate JWT including sessionId
    const token = jwt.sign(
      { teacherId, email: email.toLowerCase(), firstName, lastName, department: department || '', sessionId },
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

    // Check if 2FA is enabled
    if (teacher.twoFactor && teacher.twoFactor.enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      if (isDBConnected()) {
        const db = getDB();
        await db.collection('teachers').updateOne(
          { teacherId: teacher.teacherId },
          { 
            $set: { 
              'twoFactor.secret': otp, 
              'twoFactor.otpExpiry': otpExpiry 
            } 
          }
        );
      } else {
        const teachers = readTeachers();
        const index = teachers.findIndex(t => t.teacherId === teacher.teacherId);
        teachers[index].twoFactor = {
          ...teachers[index].twoFactor,
          secret: otp,
          otpExpiry
        };
        writeTeachers(teachers);
      }

      // Output to server console for testing/development
      console.log(`\n=================================================`);
      console.log(`[2FA SECURITY VERIFICATION]`);
      console.log(`User: ${teacher.email}`);
      console.log(`Method: ${teacher.twoFactor.method.toUpperCase()}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Expires: 5 minutes`);
      console.log(`=================================================\n`);

      // Generate a short-lived verification token
      const tempToken = jwt.sign(
        { teacherId: teacher.teacherId, temp: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.json({
        success: true,
        requires2FA: true,
        method: teacher.twoFactor.method,
        tempToken
      });
    }

    // If no 2FA, complete regular session login
    const now = new Date().toISOString();
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    const device = parseUserAgent(req.headers['user-agent']);

    const sessionObj = { sessionId, ip, userAgent: device, loginTime: now, lastActive: now };
    const historyObj = { loginTime: now, ip, userAgent: device };

    let updatedSessions = teacher.sessions ? [...teacher.sessions, sessionObj] : [sessionObj];
    let updatedHistory = teacher.loginHistory ? [historyObj, ...teacher.loginHistory] : [historyObj];
    if (updatedHistory.length > 10) updatedHistory = updatedHistory.slice(0, 10);

    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: teacher.teacherId },
        { 
          $set: { 
            lastLogin: now,
            sessions: updatedSessions,
            loginHistory: updatedHistory
          } 
        }
      );
    } else {
      const teachers = readTeachers();
      const index = teachers.findIndex(t => t.teacherId === teacher.teacherId);
      teachers[index].lastLogin = now;
      teachers[index].sessions = updatedSessions;
      teachers[index].loginHistory = updatedHistory;
      writeTeachers(teachers);
    }

    const token = jwt.sign(
      { 
        teacherId: teacher.teacherId, 
        email: teacher.email, 
        firstName: teacher.firstName, 
        lastName: teacher.lastName, 
        department: teacher.department || '',
        sessionId
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

// Get Teacher Profile (with full profile data + stats)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let teacher = null;
    let totalPapers = 0;

    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne(
        { teacherId: req.teacherId },
        { projection: { password: 0 } }
      );
      // Count papers
      try {
        totalPapers = await db.collection('papers').countDocuments({ teacherId: req.teacherId });
      } catch (e) { totalPapers = 0; }
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId) || null;
      if (teacher) {
        const { password, ...profile } = teacher;
        teacher = profile;
      }
      totalPapers = countTeacherPapers(req.teacherId) || 0;
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Merge defaults for any missing new fields
    const merged = mergeProfileDefaults(teacher);

    // Calculate account age
    const createdDate = new Date(merged.createdAt);
    const now = new Date();
    const accountAgeInDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      user: {
        ...merged,
        stats: {
          totalPapersGenerated: totalPapers || 0,
          accountAgeInDays
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update Profile (editable fields only)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phoneNumber', 'bio',
      'designation', 'profilePicture', 'subjectSpecialization', 'preferences'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validation
    if (updates.firstName !== undefined && (updates.firstName.length < 2 || updates.firstName.length > 100)) {
      return res.status(400).json({ success: false, error: 'Name must be between 2-100 characters' });
    }
    if (updates.bio !== undefined && updates.bio.length > 200) {
      return res.status(400).json({ success: false, error: 'Bio must be 200 characters or less' });
    }
    if (updates.phoneNumber !== undefined && updates.phoneNumber.length > 20) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }
    if (updates.preferences !== undefined) {
      const validThemes = ['light', 'dark'];
      if (updates.preferences.theme && !validThemes.includes(updates.preferences.theme)) {
        return res.status(400).json({ success: false, error: 'Theme must be light or dark' });
      }
    }
    // Validate profilePicture is base64 or URL
    if (updates.profilePicture !== undefined && updates.profilePicture.length > 5000000) {
      return res.status(400).json({ success: false, error: 'Profile picture too large (max 5MB)' });
    }

    updates.updatedAt = new Date().toISOString();

    if (isDBConnected()) {
      const db = getDB();
      const result = await db.collection('teachers').findOneAndUpdate(
        { teacherId: req.teacherId },
        { $set: updates },
        { returnDocument: 'after', projection: { password: 0 } }
      );
      if (!result) {
        return res.status(404).json({ success: false, error: 'Teacher not found' });
      }
      const merged = mergeProfileDefaults(result);
      return res.json({ success: true, user: merged });
    } else {
      // Local JSON fallback
      const teachers = readTeachers();
      const index = teachers.findIndex(t => t.teacherId === req.teacherId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Teacher not found' });
      }
      teachers[index] = { ...teachers[index], ...updates };
      writeTeachers(teachers);
      const { password, ...profile } = teachers[index];
      const merged = mergeProfileDefaults(profile);
      return res.json({ success: true, user: merged });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'New password must contain at least one uppercase letter' });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'New password must contain at least one number' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, error: 'New password must be different from current password' });
    }

    let teacher = null;

    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId) || null;
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Verify current password
    const passwordMatch = await bcryptjs.compare(currentPassword, teacher.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcryptjs.hash(newPassword, saltRounds);

    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: req.teacherId },
        { $set: { password: hashedPassword, updatedAt: new Date().toISOString() } }
      );
    } else {
      const teachers = readTeachers();
      const index = teachers.findIndex(t => t.teacherId === req.teacherId);
      if (index !== -1) {
        teachers[index].password = hashedPassword;
        teachers[index].updatedAt = new Date().toISOString();
        writeTeachers(teachers);
      }
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Get Profile Activity Stats
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    let papers = [];
    let teacher = null;

    if (isDBConnected()) {
      const db = getDB();
      papers = await db.collection('papers')
        .find({ teacherId: req.teacherId })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      teacher = await db.collection('teachers').findOne(
        { teacherId: req.teacherId },
        { projection: { lastLogin: 1, createdAt: 1, firstName: 1, lastName: 1 } }
      );
    } else {
      const allPapers = readPapers();
      papers = allPapers
        .filter(p => p.teacherId === req.teacherId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId) || null;
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    res.json({
      success: true,
      activity: {
        totalPapers: papers.length,
        recentPapers: papers.map(p => ({
          paperId: p.paperId,
          subject: p.subject,
          subjectCode: p.subjectCode,
          maxMarks: p.maxMarks,
          duration: p.duration,
          createdAt: p.createdAt
        })),
        lastLogin: teacher.lastLogin || teacher.createdAt,
        memberSince: teacher.createdAt
      }
    });
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// Verify 2FA OTP or Backup Code
router.post('/verify-2fa', async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ success: false, error: 'Token and verification code are required' });
  }

  try {
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.temp) {
      return res.status(400).json({ success: false, error: 'Invalid verification token' });
    }
    
    let teacher = null;
    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: decoded.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === decoded.teacherId) || null;
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    const now = new Date();
    const isOtpMatch = teacher.twoFactor && 
                       teacher.twoFactor.secret === code && 
                       teacher.twoFactor.otpExpiry && 
                       new Date(teacher.twoFactor.otpExpiry) > now;
    
    const isBackupMatch = teacher.twoFactor && 
                          teacher.twoFactor.backupCodes && 
                          teacher.twoFactor.backupCodes.includes(code);

    if (!isOtpMatch && !isBackupMatch) {
      return res.status(400).json({ success: false, error: 'Invalid or expired 2FA code' });
    }

    // Code verified successfully! Setup session details
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1';
    const device = parseUserAgent(req.headers['user-agent']);
    const nowStr = now.toISOString();
    
    const sessionObj = { sessionId, ip, userAgent: device, loginTime: nowStr, lastActive: nowStr };
    const historyObj = { loginTime: nowStr, ip, userAgent: device };

    let updatedSessions = teacher.sessions ? [...teacher.sessions, sessionObj] : [sessionObj];
    let updatedHistory = teacher.loginHistory ? [historyObj, ...teacher.loginHistory] : [historyObj];
    if (updatedHistory.length > 10) updatedHistory = updatedHistory.slice(0, 10);

    const updates = {
      sessions: updatedSessions,
      loginHistory: updatedHistory,
      lastLogin: nowStr,
      'twoFactor.secret': '',
      'twoFactor.otpExpiry': ''
    };

    if (isBackupMatch) {
      updates['twoFactor.backupCodes'] = teacher.twoFactor.backupCodes.filter(c => c !== code);
    }

    if (isDBConnected()) {
      const db = getDB();
      const updateDoc = {
        $set: {
          sessions: updates.sessions,
          loginHistory: updates.loginHistory,
          lastLogin: updates.lastLogin,
          'twoFactor.secret': '',
          'twoFactor.otpExpiry': ''
        }
      };
      if (isBackupMatch) {
        updateDoc.$set['twoFactor.backupCodes'] = updates['twoFactor.backupCodes'];
      }
      await db.collection('teachers').updateOne({ teacherId: teacher.teacherId }, updateDoc);
    } else {
      const teachers = readTeachers();
      const index = teachers.findIndex(t => t.teacherId === teacher.teacherId);
      teachers[index].sessions = updates.sessions;
      teachers[index].loginHistory = updates.loginHistory;
      teachers[index].lastLogin = updates.lastLogin;
      teachers[index].twoFactor.secret = '';
      teachers[index].twoFactor.otpExpiry = '';
      if (isBackupMatch) {
        teachers[index].twoFactor.backupCodes = updates['twoFactor.backupCodes'];
      }
      writeTeachers(teachers);
    }

    const token = jwt.sign(
      { 
        teacherId: teacher.teacherId, 
        email: teacher.email, 
        firstName: teacher.firstName, 
        lastName: teacher.lastName, 
        department: teacher.department || '',
        sessionId
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
  } catch (err) {
    console.error('2FA verification error:', err);
    res.status(500).json({ success: false, error: '2FA verification failed' });
  }
});

// Setup 2FA
router.post('/profile/2fa/setup', authenticateToken, async (req, res) => {
  const { method, phoneNumber } = req.body;
  if (!method || !['email', 'sms'].includes(method)) {
    return res.status(400).json({ success: false, error: 'Invalid 2FA method' });
  }
  
  try {
    let teacher = null;
    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId);
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: req.teacherId },
        { 
          $set: { 
            'twoFactor.secret': otp, 
            'twoFactor.otpExpiry': otpExpiry,
            'twoFactor.tempMethod': method,
            'twoFactor.tempPhone': phoneNumber || ''
          } 
        }
      );
    } else {
      const teachers = readTeachers();
      const idx = teachers.findIndex(t => t.teacherId === req.teacherId);
      teachers[idx].twoFactor = {
        ...(teachers[idx].twoFactor || {}),
        secret: otp,
        otpExpiry,
        tempMethod: method,
        tempPhone: phoneNumber || ''
      };
      writeTeachers(teachers);
    }

    // Mock sending code by writing to server stdout log
    console.log(`\n=================================================`);
    console.log(`[2FA SETUP INITIATED]`);
    console.log(`User: ${teacher.email}`);
    console.log(`Verification Method: ${method.toUpperCase()}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires: 5 minutes`);
    console.log(`=================================================\n`);

    res.json({ success: true, message: `OTP code sent to your registered ${method === 'email' ? 'email' : 'phone'}` });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate 2FA setup' });
  }
});

// Verify 2FA Setup
router.post('/profile/2fa/verify', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Verification code is required' });
  }

  try {
    let teacher = null;
    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId);
    }

    if (!teacher || !teacher.twoFactor || !teacher.twoFactor.secret) {
      return res.status(400).json({ success: false, error: 'No 2FA setup in progress' });
    }

    const now = new Date();
    if (teacher.twoFactor.secret !== code || new Date(teacher.twoFactor.otpExpiry) < now) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    // OTP matches! Setup 2FA details
    const method = teacher.twoFactor.tempMethod || 'email';
    const phone = teacher.twoFactor.tempPhone || '';

    // Generate 8 unique backup codes (format: XXXX-XXXX)
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const num = Math.floor(10000000 + Math.random() * 90000000).toString();
      backupCodes.push(`${num.substr(0, 4)}-${num.substr(4, 4)}`);
    }

    const updates = {
      'twoFactor.enabled': true,
      'twoFactor.method': method,
      'twoFactor.secret': '',
      'twoFactor.otpExpiry': '',
      'twoFactor.tempMethod': '',
      'twoFactor.tempPhone': '',
      'twoFactor.backupCodes': backupCodes
    };
    if (method === 'sms' && phone) {
      updates.phoneNumber = phone;
    }

    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: req.teacherId },
        { $set: updates }
      );
    } else {
      const teachers = readTeachers();
      const idx = teachers.findIndex(t => t.teacherId === req.teacherId);
      teachers[idx].twoFactor = {
        enabled: true,
        method,
        secret: '',
        otpExpiry: '',
        backupCodes
      };
      if (method === 'sms' && phone) {
        teachers[idx].phoneNumber = phone;
      }
      writeTeachers(teachers);
    }

    res.json({ success: true, backupCodes });
  } catch (err) {
    console.error('2FA setup verification error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/profile/2fa/disable', authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required to disable 2FA' });
  }

  try {
    let teacher = null;
    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId);
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    const passwordMatch = await bcryptjs.compare(password, teacher.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Disable 2FA
    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: req.teacherId },
        { 
          $set: { 
            'twoFactor.enabled': false,
            'twoFactor.backupCodes': []
          } 
        }
      );
    } else {
      const teachers = readTeachers();
      const idx = teachers.findIndex(t => t.teacherId === req.teacherId);
      teachers[idx].twoFactor = {
        enabled: false,
        method: 'email',
        backupCodes: []
      };
      writeTeachers(teachers);
    }

    res.json({ success: true, message: 'Two-factor authentication disabled successfully' });
  } catch (err) {
    console.error('Disable 2FA error:', err);
    res.status(500).json({ success: false, error: 'Failed to disable Two-factor authentication' });
  }
});

// Revoke a specific active session
router.post('/profile/revoke-session', authenticateToken, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  try {
    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').updateOne(
        { teacherId: req.teacherId },
        { $pull: { sessions: { sessionId } } }
      );
    } else {
      const teachers = readTeachers();
      const idx = teachers.findIndex(t => t.teacherId === req.teacherId);
      if (idx !== -1 && teachers[idx].sessions) {
        teachers[idx].sessions = teachers[idx].sessions.filter(s => s.sessionId !== sessionId);
        writeTeachers(teachers);
      }
    }
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

// Revoke all sessions except current one
router.post('/profile/revoke-other-sessions', authenticateToken, async (req, res) => {
  const currentSessionId = req.sessionId;
  if (!currentSessionId) {
    return res.status(400).json({ success: false, error: 'Current session ID not found in token' });
  }

  try {
    if (isDBConnected()) {
      const db = getDB();
      const teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
      if (teacher && teacher.sessions) {
        const currentSession = teacher.sessions.find(s => s.sessionId === currentSessionId);
        const newSessions = currentSession ? [currentSession] : [];
        await db.collection('teachers').updateOne(
          { teacherId: req.teacherId },
          { $set: { sessions: newSessions } }
        );
      }
    } else {
      const teachers = readTeachers();
      const idx = teachers.findIndex(t => t.teacherId === req.teacherId);
      if (idx !== -1 && teachers[idx].sessions) {
        const currentSession = teachers[idx].sessions.find(s => s.sessionId === currentSessionId);
        teachers[idx].sessions = currentSession ? [currentSession] : [];
        writeTeachers(teachers);
      }
    }
    res.json({ success: true, message: 'All other sessions revoked successfully' });
  } catch (err) {
    console.error('Revoke other sessions error:', err);
    res.status(500).json({ success: false, error: 'Failed to revoke other sessions' });
  }
});

// Delete account with data retention selection
router.post('/profile/delete-account', authenticateToken, async (req, res) => {
  const { password, deletePapers } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password confirmation is required' });
  }

  try {
    let teacher = null;
    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne({ teacherId: req.teacherId });
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId);
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found' });
    }

    const passwordMatch = await bcryptjs.compare(password, teacher.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect confirmation password' });
    }

    // Delete user account
    if (isDBConnected()) {
      const db = getDB();
      await db.collection('teachers').deleteOne({ teacherId: req.teacherId });
      
      if (deletePapers) {
        await db.collection('papers').deleteMany({ teacherId: req.teacherId });
      } else {
        // GDPR: Anonymize papers by removing teacher references
        await db.collection('papers').updateMany(
          { teacherId: req.teacherId },
          { $set: { teacherId: 'DELETED_TEACHER', facultyName: 'Anonymized Faculty' } }
        );
      }
    } else {
      // Local fallback
      let teachers = readTeachers();
      teachers = teachers.filter(t => t.teacherId !== req.teacherId);
      writeTeachers(teachers);

      const papers = readPapers();
      if (deletePapers) {
        const filteredPapers = papers.filter(p => p.teacherId !== req.teacherId);
        writePapers(filteredPapers);
      } else {
        const updatedPapers = papers.map(p => {
          if (p.teacherId === req.teacherId) {
            return { ...p, teacherId: 'DELETED_TEACHER', facultyName: 'Anonymized Faculty' };
          }
          return p;
        });
        writePapers(updatedPapers);
      }
    }

    res.json({ success: true, message: 'Your account has been deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

// Export profile and generated papers (GDPR compliant zip file)
router.get('/profile/export-data', authenticateToken, async (req, res) => {
  try {
    let teacher = null;
    let papers = [];

    if (isDBConnected()) {
      const db = getDB();
      teacher = await db.collection('teachers').findOne(
        { teacherId: req.teacherId },
        { projection: { password: 0 } }
      );
      try {
        papers = await db.collection('papers').find({ teacherId: req.teacherId }).toArray();
      } catch (e) {
        papers = [];
      }
    } else {
      const teachers = readTeachers();
      teacher = teachers.find(t => t.teacherId === req.teacherId) || null;
      if (teacher) {
        const { password, ...profile } = teacher;
        teacher = profile;
      }
      papers = readPapers().filter(p => p.teacherId === req.teacherId);
    }

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found' });
    }

    // Merge default properties
    const mergedProfile = mergeProfileDefaults(teacher);

    // GDPR Personal Data structure
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        teacherId: mergedProfile.teacherId,
        email: mergedProfile.email,
        firstName: mergedProfile.firstName,
        lastName: mergedProfile.lastName,
        department: mergedProfile.department,
        phoneNumber: mergedProfile.phoneNumber,
        bio: mergedProfile.bio,
        designation: mergedProfile.designation,
        institution: mergedProfile.institution,
        role: mergedProfile.role,
        createdAt: mergedProfile.createdAt,
        updatedAt: mergedProfile.updatedAt,
        lastLogin: mergedProfile.lastLogin,
        isActive: mergedProfile.isActive,
        subjectSpecialization: mergedProfile.subjectSpecialization,
        preferences: mergedProfile.preferences
      },
      loginHistory: mergedProfile.loginHistory || [],
      stats: {
        totalPapersGenerated: papers.length
      }
    };

    const filesToZip = [
      { name: 'profile.json', content: JSON.stringify(exportData, null, 2) }
    ];

    papers.forEach((paper, idx) => {
      const cleanSubject = (paper.subject || 'paper').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `papers/paper_${paper.paperId || idx}_${cleanSubject}.json`;
      filesToZip.push({
        name: filename,
        content: JSON.stringify(paper, null, 2)
      });
    });

    const zipBuffer = createZip(filesToZip);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=mvit_profile_export_${req.teacherId}.zip`);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Export GDPR data error:', err);
    res.status(500).json({ success: false, error: 'Failed to export your data' });
  }
});

export default router;