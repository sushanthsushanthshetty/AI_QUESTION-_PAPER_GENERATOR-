import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  User, Mail, Building2, Phone, BookOpen, Calendar,
  Clock, Shield, Palette, Bell, Briefcase, GraduationCap,
  Award, CheckCircle, AlertTriangle, Save, Edit3, X,
  Eye, EyeOff, FileText, Smartphone, Laptop, Trash2, Download, Key
} from 'lucide-react';

const DESIGNATIONS = [
  'Lecturer', 'Assistant Professor', 'Associate Professor',
  'Professor', 'Senior Professor', 'Head of Department',
  'Dean', 'Principal', 'Guest Faculty'
];

const SUBJECT_OPTIONS = [
  'Object Oriented Programming', 'Data Structures', 'Algorithms',
  'Database Management Systems', 'Operating Systems', 'Computer Networks',
  'Software Engineering', 'Machine Learning', 'Artificial Intelligence',
  'Web Technologies', 'Compiler Design', 'Computer Architecture',
  'Discrete Mathematics', 'Theory of Computation', 'Cyber Security',
  'Cloud Computing', 'Data Science', 'Blockchain Technology'
];

// Simple MD5 implementation in JS
function md5(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return (x ^ y ^ z); }
  function I(x, y, z) { return (y ^ (x | (~z))); }
  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  function utf8Encode(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }
  var x = Array();
  var k, S11, S12, S13, S14, S21, S22, S23, S24, S31, S32, S33, S34, S41, S42, S43, S44;
  var a = 0x67452301;
  var b = 0xEFCDAB89;
  var c = 0x98BADCFE;
  var d = 0x10325476;
  string = utf8Encode(string);
  x = convertToWordArray(string);
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  for (k = 0; k < x.length; k += 16) {
    var AA = a; var BB = b; var CC = c; var DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  return temp.toLowerCase();
}

function getAuthHeaders() {
  const token = localStorage.getItem('jwtToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile data
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('personal');

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Activity data
  const [activity, setActivity] = useState(null);

  // Avatar Gravatar Fallback State
  const [useInitials, setUseInitials] = useState(false);

  // 2FA Setup wizard states
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(1);
  const [twoFactorMethod, setTwoFactorMethod] = useState('email');
  const [twoFactorPhone, setTwoFactorPhone] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // 2FA Disable states
  const [show2faDisable, setShow2faDisable] = useState(false);
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [disable2faError, setDisable2faError] = useState('');
  const [disable2faLoading, setDisable2faLoading] = useState(false);

  // Session state
  const [revokingSessionId, setRevokingSessionId] = useState(null);

  // Account deletion states
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deletePapers, setDeletePapers] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchActivity();
  }, []);

  // Theme synchronization hook
  useEffect(() => {
    if (profile?.preferences?.theme) {
      const theme = profile.preferences.theme;
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/auth/profile', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setUseInitials(!data.user.profilePicture);
        setEditForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          phoneNumber: data.user.phoneNumber || '',
          bio: data.user.bio || '',
          designation: data.user.designation || '',
          subjectSpecialization: data.user.subjectSpecialization || [],
          profilePicture: data.user.profilePicture || '',
          preferences: data.user.preferences || {
            theme: 'light',
            notifications: { emailOnPaperGenerated: true, emailOnCommentReceived: true }
          }
        });
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      setError('Network error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const response = await fetch('/api/auth/activity', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setActivity(data.activity);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm)
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setProfile(data.user);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phoneNumber: profile.phoneNumber || '',
        bio: profile.bio || '',
        designation: profile.designation || '',
        subjectSpecialization: profile.subjectSpecialization || [],
        profilePicture: profile.profilePicture || '',
        preferences: profile.preferences || {
          theme: 'light',
          notifications: { emailOnPaperGenerated: true, emailOnCommentReceived: true }
        }
      });
    }
    setIsEditing(false);
    setError('');
  };

  const handleSubjectToggle = (subject) => {
    const current = editForm.subjectSpecialization || [];
    if (current.includes(subject)) {
      setEditForm({ ...editForm, subjectSpecialization: current.filter(s => s !== subject) });
    } else {
      setEditForm({ ...editForm, subjectSpecialization: [...current, subject] });
    }
  };

  const handleProfilePictureChange = (base64) => {
    setEditForm({ ...editForm, profilePicture: base64 });
    setUseInitials(!base64);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getInitials = () => {
    const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '?';
    if (!name || name === '?') return '?';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const getAvatarColor = () => {
    const colors = ['#1a3560', '#2d5a8e', '#6b3fa0', '#c0392b', '#d35400', '#16a085', '#2980b9', '#8e44ad'];
    if (!profile) return colors[0];
    let hash = 0;
    const str = profile.email || profile.teacherId || '';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // GDPR Data Export
  const handleExportData = async () => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/auth/profile/export-data', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Data export query failed.');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `mvit_profile_export_${profile?.teacherId || 'data'}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccess('GDPR compliance archive compiled and downloaded successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Failed to download GDPR data archive. Please verify network status.');
    }
  };

  // Revoke Specific Session
  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      const response = await fetch('/api/auth/profile/revoke-session', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Session revoked successfully.');
        fetchProfile(); // Reload session logs
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to revoke session.');
      }
    } catch (err) {
      setError('Network error revoking session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Revoke All Other Sessions
  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices?')) return;
    try {
      const response = await fetch('/api/auth/profile/revoke-other-sessions', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Logged out from all other devices.');
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to revoke other sessions.');
      }
    } catch (err) {
      setError('Network error revoking other sessions.');
    }
  };

  // Two-Factor Setup functions
  const handleStart2faSetup = async () => {
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorLoading(true);
    try {
      const response = await fetch('/api/auth/profile/2fa/setup', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          method: twoFactorMethod,
          phoneNumber: twoFactorMethod === 'sms' ? twoFactorPhone : undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        setTwoFactorStep(2);
      } else {
        setTwoFactorError(data.error || 'Failed to initiate 2FA setup.');
      }
    } catch (err) {
      setTwoFactorError('Network error initiating 2FA setup.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2faSetup = async () => {
    setTwoFactorError('');
    setTwoFactorSuccess('');
    setTwoFactorLoading(true);
    try {
      const response = await fetch('/api/auth/profile/2fa/verify', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: twoFactorCode })
      });
      const data = await response.json();
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setTwoFactorStep(3);
        setTwoFactorSuccess('Two-factor authentication verified successfully!');
        fetchProfile(); // Refresh model
      } else {
        setTwoFactorError(data.error || 'Verification code incorrect.');
      }
    } catch (err) {
      setTwoFactorError('Network error verifying code.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const close2faWizard = () => {
    setShow2faSetup(false);
    setTwoFactorStep(1);
    setTwoFactorCode('');
    setTwoFactorPhone('');
    setBackupCodes([]);
    setTwoFactorError('');
    setTwoFactorSuccess('');
  };

  // Disable 2FA function
  const handleDisable2fa = async (e) => {
    e.preventDefault();
    setDisable2faError('');
    setDisable2faLoading(true);
    try {
      const response = await fetch('/api/auth/profile/2fa/disable', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: disable2faPassword })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Two-factor authentication disabled successfully.');
        setShow2faDisable(false);
        setDisable2faPassword('');
        fetchProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setDisable2faError(data.error || 'Incorrect confirmation password.');
      }
    } catch (err) {
      setDisable2faError('Network error disabling 2FA.');
    } finally {
      setDisable2faLoading(false);
    }
  };

  // Account Deletion function
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteAccountError('');
    setDeleteAccountLoading(true);
    try {
      const response = await fetch('/api/auth/profile/delete-account', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: deleteAccountPassword, deletePapers })
      });
      const data = await response.json();
      if (data.success) {
        alert('Your profile has been permanently deleted.');
        logout();
        navigate('/login', { replace: true });
      } else {
        setDeleteAccountError(data.error || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteAccountError('Network error deleting account.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // Render Gravatar fallback image
  const renderAvatarContent = () => {
    if (profile?.profilePicture) {
      return <img src={profile.profilePicture} alt="Profile" className="profile-avatar-img" />;
    }
    if (profile?.email && !useInitials) {
      const emailHash = md5(profile.email.trim().toLowerCase());
      return (
        <img 
          src={`https://www.gravatar.com/avatar/${emailHash}?d=404`} 
          alt="Profile" 
          className="profile-avatar-img" 
          onError={() => setUseInitials(true)}
        />
      );
    }
    return <span className="profile-avatar-initials">{getInitials()}</span>;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar currentPage="profile" setPage={() => {}} />
        <div className="main-workspace">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="loader-book">
              <div className="loader-book-spine"></div>
              <div className="loader-book-page left"></div>
              <div className="loader-book-page right flipping"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get session token's sessionId to label current session
  const activeSessionId = localStorage.getItem('jwtToken') ? 
    JSON.parse(atob(localStorage.getItem('jwtToken').split('.')[1])).sessionId : null;

  return (
    <div className="dashboard-container">
      <Navbar currentPage="profile" setPage={() => {}} />
      <div className="main-workspace">
        <div className="workspace-header">
          <div className="title-area">
            <h1>My Profile</h1>
            <p>Manage your personal information, preferences, and account security logs.</p>
          </div>
          {!isEditing && (
            <button className="btn btn-accent" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          )}
          {isEditing && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button className="btn btn-outline" onClick={handleCancel} disabled={saving}>
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="glass-card error-card" style={{ borderColor: 'hsl(0, 72%, 51%)', backgroundColor: 'var(--card-error-bg, hsl(0, 72%, 98%))', color: 'hsl(0, 72%, 25%)', display: 'flex', gap: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
            <AlertTriangle size={20} stroke="hsl(0, 72%, 51%)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="glass-card success-card" style={{ borderColor: '#22c55e', backgroundColor: 'var(--card-success-bg, #f0fdf4)', color: '#166534', display: 'flex', gap: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>
            <CheckCircle size={20} stroke="#22c55e" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.9rem' }}>{success}</p>
          </div>
        )}

        {/* Profile Header */}
        <div className="profile-header-card glass-card">
          {isEditing ? (
            <ProfilePictureUpload
              currentPicture={profile?.profilePicture || ''}
              name={`${profile?.firstName || ''} ${profile?.lastName || ''}`}
              onPictureChange={handleProfilePictureChange}
            />
          ) : (
            <div className="profile-avatar" style={{ backgroundColor: getAvatarColor() }}>
              {renderAvatarContent()}
            </div>
          )}
          <div className="profile-header-info">
            <h2>{profile?.firstName} {profile?.lastName}</h2>
            <p className="profile-header-email">{profile?.email}</p>
            <p className="profile-header-dept">{profile?.department} &bull; {profile?.institution}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User size={16} />
            <span>Personal</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'professional' ? 'active' : ''}`}
            onClick={() => setActiveTab('professional')}
          >
            <Briefcase size={16} />
            <span>Professional</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={16} />
            <span>Security</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Clock size={16} />
            <span>Activity</span>
          </button>
          <button
            className={`profile-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Palette size={16} />
            <span>Preferences</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-tab-content">
          {/* ===== Personal Tab ===== */}
          {activeTab === 'personal' && (
            <div className="glass-card">
              <h3 className="section-title">
                <User size={18} />
                <span>Personal Information</span>
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  ) : (
                    <p className="profile-field-value">{profile?.firstName || '—'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  ) : (
                    <p className="profile-field-value">{profile?.lastName || '—'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label><Mail size={14} /> Email</label>
                  <p className="profile-field-value profile-field-readonly">{profile?.email || '—'}</p>
                </div>
                <div className="form-group">
                  <label><Phone size={14} /> Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phoneNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      placeholder="+91-9876543210"
                      maxLength={20}
                    />
                  ) : (
                    <p className="profile-field-value">{profile?.phoneNumber || '—'}</p>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>Bio / About</label>
                  {isEditing ? (
                    <div>
                      <textarea
                        rows={3}
                        value={editForm.bio || ''}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            setEditForm({ ...editForm, bio: e.target.value });
                          }
                        }}
                        placeholder="Tell us about yourself..."
                        style={{ fontSize: '0.85rem' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: editForm.bio?.length >= 190 ? '#ef4444' : 'var(--text-muted)', textAlign: 'right', display: 'block' }}>
                        {editForm.bio?.length || 0}/200
                      </span>
                    </div>
                  ) : (
                    <p className="profile-field-value">{profile?.bio || 'No bio provided.'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Professional Tab ===== */}
          {activeTab === 'professional' && (
            <div className="glass-card">
              <h3 className="section-title">
                <Briefcase size={18} />
                <span>Professional Information</span>
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label><Building2 size={14} /> Department</label>
                  <p className="profile-field-value">{profile?.department || '—'}</p>
                </div>
                <div className="form-group">
                  <label><GraduationCap size={14} /> Designation</label>
                  {isEditing ? (
                    <select
                      value={editForm.designation || ''}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    >
                      <option value="">Select designation</option>
                      {DESIGNATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="profile-field-value">{profile?.designation || '—'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label><Building2 size={14} /> Institution</label>
                  <p className="profile-field-value profile-field-readonly">{profile?.institution || '—'}</p>
                </div>
                <div className="form-group">
                  <label><Award size={14} /> Role</label>
                  <p className="profile-field-value profile-field-readonly">{profile?.role || 'Faculty'}</p>
                </div>
                <div className="form-group full-width">
                  <label><BookOpen size={14} /> Subject Specialization</label>
                  {isEditing ? (
                    <div className="subject-tags-grid">
                      {SUBJECT_OPTIONS.map(subject => (
                        <label key={subject} className={`subject-tag ${(editForm.subjectSpecialization || []).includes(subject) ? 'selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={(editForm.subjectSpecialization || []).includes(subject)}
                            onChange={() => handleSubjectToggle(subject)}
                            style={{ display: 'none' }}
                          />
                          {subject}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="subject-tags-display">
                      {profile?.subjectSpecialization?.length > 0 ? (
                        profile.subjectSpecialization.map(s => (
                          <span key={s} className="subject-tag selected" style={{ cursor: 'default' }}>{s}</span>
                        ))
                      ) : (
                        <p className="profile-field-value" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          No subjects specified
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Security Tab ===== */}
          {activeTab === 'security' && (
            <div>
              {/* Password Setting Card */}
              <div className="glass-card">
                <h3 className="section-title">
                  <Shield size={18} />
                  <span>Account Security</span>
                </h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Password</label>
                    <p className="profile-field-value">••••••••</p>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowPasswordModal(true)}
                      style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                    >
                      Change Password
                    </button>
                  </div>
                  <div className="form-group">
                    <label>Account Status</label>
                    <p className="profile-field-value">
                      <span className="status-badge active">
                        <span className="status-dot active" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', marginRight: '0.35rem' }}></span>
                        {profile?.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div className="form-group">
                    <label><Calendar size={14} /> Member Since</label>
                    <p className="profile-field-value">{formatDate(profile?.createdAt)}</p>
                  </div>
                  <div className="form-group">
                    <label><Clock size={14} /> Last Login</label>
                    <p className="profile-field-value">{formatDate(profile?.lastLogin)}</p>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication Card */}
              <div className="glass-card">
                <h3 className="section-title">
                  <Key size={18} />
                  <span>Two-Factor Authentication (2FA)</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Two-factor authentication adds an extra layer of protection by requiring a verification code when signing in.
                </p>

                {profile?.twoFactor?.enabled ? (
                  <div className="two-factor-status enabled">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      <CheckCircle size={20} stroke="#22c55e" />
                      <span>Two-Factor Authentication is ENABLED</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Method: <strong>{profile.twoFactor.method === 'sms' ? 'SMS OTP' : 'Email OTP'}</strong> {profile.twoFactor.method === 'sms' && `(${profile.phoneNumber})`}
                    </p>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => setShow2faDisable(true)}
                    >
                      Disable Two-Factor Auth
                    </button>
                  </div>
                ) : (
                  <div className="two-factor-status disabled">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(0, 72%, 25%)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      <AlertTriangle size={20} stroke="hsl(0, 72%, 51%)" />
                      <span>Two-Factor Authentication is DISABLED</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Secure your generated question papers and personal logs from unauthorized access.
                    </p>
                    <button 
                      className="btn btn-accent btn-sm"
                      onClick={() => setShow2faSetup(true)}
                    >
                      Enable Two-Factor Auth
                    </button>
                  </div>
                )}

                {/* 2FA Setup Modal/Overlay */}
                {show2faSetup && (
                  <div className="modal-overlay" onClick={close2faWizard}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                      <div className="modal-header">
                        <h3>Enable Two-Factor Authentication</h3>
                        <button className="modal-close-btn" onClick={close2faWizard}><X size={20} /></button>
                      </div>
                      <div className="modal-body">
                        {twoFactorError && (
                          <div className="auth-error" style={{ marginBottom: '1rem' }}>
                            <AlertTriangle size={16} />
                            <span>{twoFactorError}</span>
                          </div>
                        )}
                        {twoFactorSuccess && (
                          <div className="auth-success" style={{ marginBottom: '1rem' }}>
                            <CheckCircle size={16} />
                            <span>{twoFactorSuccess}</span>
                          </div>
                        )}

                        {twoFactorStep === 1 && (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                              Choose how you wish to receive verification codes.
                            </p>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                              <label>Verification Method</label>
                              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="2faMethod" 
                                    checked={twoFactorMethod === 'email'} 
                                    onChange={() => setTwoFactorMethod('email')} 
                                  />
                                  <span>Email OTP ({profile?.email})</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                                  <input 
                                    type="radio" 
                                    name="2faMethod" 
                                    checked={twoFactorMethod === 'sms'} 
                                    onChange={() => setTwoFactorMethod('sms')} 
                                  />
                                  <span>SMS OTP</span>
                                </label>
                              </div>
                            </div>

                            {twoFactorMethod === 'sms' && (
                              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label htmlFor="2faPhone">Mobile Phone Number</label>
                                <input 
                                  id="2faPhone"
                                  type="tel"
                                  placeholder="+91-9876543210"
                                  value={twoFactorPhone}
                                  onChange={(e) => setTwoFactorPhone(e.target.value)}
                                  required
                                />
                                <span className="field-hint" style={{ fontSize: '0.7rem' }}>Include country code prefix.</span>
                              </div>
                            )}

                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%' }}
                              onClick={handleStart2faSetup}
                              disabled={twoFactorLoading || (twoFactorMethod === 'sms' && !twoFactorPhone)}
                            >
                              {twoFactorLoading ? 'Sending code...' : 'Send Verification Code'}
                            </button>
                          </div>
                        )}

                        {twoFactorStep === 2 && (
                          <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                              Enter the 6-digit verification code sent to your {twoFactorMethod === 'email' ? 'email' : 'phone'}.
                              <br/>
                              <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>*(Check node backend console output to read the mock OTP)*</span>
                            </p>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                              <label htmlFor="2faCode">6-Digit Code</label>
                              <input 
                                id="2faCode"
                                type="text"
                                maxLength={6}
                                placeholder="123456"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                style={{ letterSpacing: '0.25rem', textAlign: 'center', fontSize: '1.25rem' }}
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-outline" 
                                onClick={() => setTwoFactorStep(1)}
                                disabled={twoFactorLoading}
                              >
                                Back
                              </button>
                              <button 
                                className="btn btn-primary" 
                                style={{ flexGrow: 1 }}
                                onClick={handleVerify2faSetup}
                                disabled={twoFactorLoading || twoFactorCode.length < 6}
                              >
                                {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                              </button>
                            </div>
                          </div>
                        )}

                        {twoFactorStep === 3 && (
                          <div>
                            <div style={{ borderColor: '#22c55e', backgroundColor: '#f0fdf4', color: '#166534', display: 'flex', gap: '0.75rem', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                              <CheckCircle size={20} stroke="#22c55e" style={{ flexShrink: 0 }} />
                              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                                2FA is active. Please save these backup codes. They will allow you to access your account if you lose your phone or email access.
                              </p>
                            </div>
                            <div className="backup-codes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--bg-cream)', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.05rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                              {backupCodes.map((code, idx) => (
                                <div key={idx} className="backup-code-item" style={{ border: '1px dashed var(--border-color)', padding: '0.35rem', borderRadius: '4px' }}>
                                  {code}
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-outline" 
                                style={{ flexGrow: 1 }}
                                onClick={() => {
                                  navigator.clipboard.writeText(backupCodes.join('\n'));
                                  alert('Backup codes copied to clipboard.');
                                }}
                              >
                                Copy Codes
                              </button>
                              <button 
                                className="btn btn-primary" 
                                style={{ flexGrow: 1 }}
                                onClick={close2faWizard}
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2FA Disable Modal */}
                {show2faDisable && (
                  <div className="modal-overlay" onClick={() => setShow2faDisable(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                      <div className="modal-header">
                        <h3>Disable Two-Factor Auth</h3>
                        <button className="modal-close-btn" onClick={() => setShow2faDisable(false)}><X size={20} /></button>
                      </div>
                      <form onSubmit={handleDisable2fa} className="modal-body">
                        {disable2faError && (
                          <div className="auth-error" style={{ marginBottom: '1rem' }}>
                            <AlertTriangle size={16} />
                            <span>{disable2faError}</span>
                          </div>
                        )}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                          Please enter your password to confirm disabling Two-Factor Authentication.
                        </p>
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                          <label htmlFor="disablePw">Password</label>
                          <input 
                            id="disablePw"
                            type="password"
                            placeholder="Enter account password"
                            value={disable2faPassword}
                            onChange={(e) => setDisable2faPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="modal-actions">
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            onClick={() => setShow2faDisable(false)}
                            disabled={disable2faLoading}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn btn-danger" 
                            disabled={disable2faLoading}
                          >
                            {disable2faLoading ? 'Disabling...' : 'Disable 2FA'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Login Session History Card */}
              <div className="glass-card">
                <h3 className="section-title">
                  <Laptop size={18} />
                  <span>Active Sessions & Login History</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Below are the devices and IP addresses currently logged into your account.
                </p>

                <div className="session-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {profile?.sessions && profile.sessions.length > 0 ? (
                    profile.sessions.map((session, index) => {
                      const isCurrent = session.sessionId === activeSessionId;
                      return (
                        <div key={session.sessionId || index} className="session-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: isCurrent ? 'var(--accent-gold-light, #fefefe)' : 'var(--bg-white)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="session-device-icon" style={{ color: 'var(--primary-navy)', background: 'var(--bg-cream)', padding: '0.5rem', borderRadius: '8px' }}>
                              {/mobile|iphone|android/i.test(session.userAgent) ? <Smartphone size={20} /> : <Laptop size={20} />}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                                {session.userAgent || 'Unknown Device'}
                                {isCurrent && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#166534', background: '#f0fdf4', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #bcf0da' }}>Current Session</span>}
                              </p>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                IP: {session.ip} &bull; Logged in: {formatDate(session.loginTime)}
                              </span>
                            </div>
                          </div>
                          {!isCurrent && (
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#fca5a5' }}
                              onClick={() => handleRevokeSession(session.sessionId)}
                              disabled={revokingSessionId === session.sessionId}
                            >
                              {revokingSessionId === session.sessionId ? 'Revoking...' : 'Revoke'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
                      No active session records found.
                    </div>
                  )}
                </div>

                {profile?.sessions && profile.sessions.length > 1 && (
                  <button 
                    className="btn btn-outline btn-sm" 
                    style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}
                    onClick={handleRevokeOtherSessions}
                  >
                    Log Out of All Other Devices
                  </button>
                )}

                {/* Login History Logs (last 10) */}
                {profile?.loginHistory && profile.loginHistory.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.35rem', textAlign: 'left' }}>
                      Last 10 Logins
                    </h4>
                    <div className="login-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {profile.loginHistory.slice(0, 10).map((log, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', background: 'var(--bg-cream)', borderRadius: '6px' }}>
                          <span>{log.userAgent}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {log.ip} &bull; {formatDate(log.loginTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Danger Zone Account Deletion */}
              <div className="glass-card" style={{ borderColor: '#fca5a5', background: 'rgba(239, 68, 68, 0.02)' }}>
                <h3 className="section-title" style={{ color: '#ef4444' }}>
                  <Trash2 size={18} stroke="#ef4444" />
                  <span>Danger Zone</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Deleting your profile is permanent. Once deleted, your personal profile data, settings, and authorization locks cannot be restored.
                </p>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => setShowDeleteAccountModal(true)}
                >
                  Delete My Account
                </button>

                {/* Deletion confirmation Modal */}
                {showDeleteAccountModal && (
                  <div className="modal-overlay" onClick={() => setShowDeleteAccountModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                      <div className="modal-header">
                        <h3 style={{ color: '#ef4444' }}>Delete Account Permanently</h3>
                        <button className="modal-close-btn" onClick={() => setShowDeleteAccountModal(false)}><X size={20} /></button>
                      </div>
                      <form onSubmit={handleDeleteAccount} className="modal-body">
                        {deleteAccountError && (
                          <div className="auth-error" style={{ marginBottom: '1rem' }}>
                            <AlertTriangle size={16} />
                            <span>{deleteAccountError}</span>
                          </div>
                        )}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                          You are about to permanently delete your account. Confirm your password below.
                        </p>
                        
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                          <label htmlFor="deletePwConfirm">Password Confirmation</label>
                          <input 
                            id="deletePwConfirm"
                            type="password"
                            placeholder="Enter password to confirm"
                            value={deleteAccountPassword}
                            onChange={(e) => setDeleteAccountPassword(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                          <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={deletePapers}
                              onChange={(e) => setDeletePapers(e.target.checked)}
                              style={{ width: 'auto', display: 'inline-block' }}
                            />
                            <span>Permanently delete all my generated question papers (GDPR right to be forgotten). If unchecked, papers will be anonymized instead.</span>
                          </label>
                        </div>

                        <div className="modal-actions">
                          <button 
                            type="button" 
                            className="btn btn-outline" 
                            onClick={() => setShowDeleteAccountModal(false)}
                            disabled={deleteAccountLoading}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn btn-danger" 
                            disabled={deleteAccountLoading || !deleteAccountPassword}
                          >
                            {deleteAccountLoading ? 'Deleting Account...' : 'I Understand, Delete My Account'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Activity Tab ===== */}
          {activeTab === 'activity' && (
            <div className="glass-card">
              <h3 className="section-title">
                <Clock size={18} />
                <span>Activity & Stats</span>
              </h3>
              <div className="activity-stats-grid">
                <div className="stat-card">
                  <FileText size={24} />
                  <div className="stat-number">{profile?.stats?.totalPapersGenerated || 0}</div>
                  <div className="stat-label">Papers Generated</div>
                </div>
                <div className="stat-card">
                  <Calendar size={24} />
                  <div className="stat-number">{profile?.stats?.accountAgeInDays || 0}</div>
                  <div className="stat-label">Account Age (days)</div>
                </div>
                <div className="stat-card">
                  <Clock size={24} />
                  <div className="stat-number">{activity?.totalPapers || 0}</div>
                  <div className="stat-label">Recent Papers</div>
                </div>
              </div>

              {activity?.recentPapers?.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary-navy)', textAlign: 'left' }}>Recent Papers</h4>
                  <div className="history-list">
                    {activity.recentPapers.map((paper) => (
                      <div className="history-item" key={paper.paperId}>
                        <div className="history-info">
                          <h4>{paper.subject || 'Paper'} {paper.subjectCode ? `(${paper.subjectCode})` : ''}</h4>
                          <p>{paper.maxMarks} Marks &bull; {paper.duration} Min &bull; {formatDate(paper.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== Preferences Tab ===== */}
          {activeTab === 'preferences' && (
            <div>
              {/* App Styling Preferences */}
              <div className="glass-card">
                <h3 className="section-title">
                  <Palette size={18} />
                  <span>Preferences</span>
                </h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label><Palette size={14} /> Theme</label>
                    {isEditing ? (
                      <select
                        value={editForm.preferences?.theme || 'light'}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          preferences: {
                            ...editForm.preferences,
                            theme: e.target.value,
                            notifications: editForm.preferences?.notifications || { emailOnPaperGenerated: true, emailOnCommentReceived: true }
                          }
                        })}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    ) : (
                      <p className="profile-field-value">{profile?.preferences?.theme || 'Light'}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label><Bell size={14} /> Email Notifications</label>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
                        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editForm.preferences?.notifications?.emailOnPaperGenerated ?? true}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              preferences: {
                                ...editForm.preferences,
                                theme: editForm.preferences?.theme || 'light',
                                notifications: {
                                  ...(editForm.preferences?.notifications || {}),
                                  emailOnPaperGenerated: e.target.checked
                                }
                              }
                            })}
                          />
                          <span>On paper generation</span>
                        </label>
                        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'none', fontWeight: 'normal', fontSize: '0.9rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editForm.preferences?.notifications?.emailOnCommentReceived ?? true}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              preferences: {
                                ...editForm.preferences,
                                theme: editForm.preferences?.theme || 'light',
                                notifications: {
                                  ...(editForm.preferences?.notifications || {}),
                                  emailOnCommentReceived: e.target.checked
                                }
                              }
                            })}
                          />
                          <span>On comments received</span>
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span>
                          Paper generated:{' '}
                          {profile?.preferences?.notifications?.emailOnPaperGenerated !== false ? '✅ Enabled' : '❌ Disabled'}
                        </span>
                        <span>
                          Comments:{' '}
                          {profile?.preferences?.notifications?.emailOnCommentReceived !== false ? '✅ Enabled' : '❌ Disabled'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* GDPR Data Portability Card */}
              <div className="glass-card">
                <h3 className="section-title">
                  <Download size={18} />
                  <span>Data Export & Privacy (GDPR Compliance)</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Under the GDPR data portability provisions, you can download a complete archive of your personal profile data, session logs, activity history, and all generated question papers.
                </p>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={handleExportData}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={16} />
                  <span>Export My Data (ZIP)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}