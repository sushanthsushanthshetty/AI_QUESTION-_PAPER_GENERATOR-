import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const api = 'http://localhost:5000/api/auth';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DB_PATH = path.join(__dirname, '..', '.gemini', 'antigravity', 'scratch', 'auth_db.json');
const PAPERS_DB_PATH = path.join(__dirname, '..', '.gemini', 'antigravity', 'scratch', 'papers_db.json');

// Read the database locally to extract mock 2FA secrets automatically
function get2faSecretFromDb(email) {
  try {
    if (!fs.existsSync(AUTH_DB_PATH)) return null;
    const db = JSON.parse(fs.readFileSync(AUTH_DB_PATH, 'utf-8'));
    const teacher = db.teachers.find(t => t.email === email.toLowerCase());
    return teacher?.twoFactor?.secret || null;
  } catch (err) {
    console.error('Error reading auth DB in test:', err);
    return null;
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('   MVIT AUTH & SECURITY END-TO-END VERIFICATION     ');
  console.log('=====================================================\n');

  const testEmail = `test_${Date.now()}@mvit.edu.in`;
  const testPassword = 'Password123!';
  const updatedPassword = 'NewSecurePass123!';
  let tokenA = '';
  let tokenB = '';
  let sessionAId = '';
  let sessionBId = '';
  let backupCodes = [];

  try {
    // -----------------------------------------------------
    // 1. SIGNUP
    // -----------------------------------------------------
    console.log('1. Testing User Sign Up...');
    const signupRes = await fetch(`${api}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        firstName: 'Verification',
        lastName: 'Tester',
        department: 'Information Science',
        password: testPassword
      })
    });

    const signupData = await signupRes.json();
    if (signupRes.status !== 201 || !signupData.success || !signupData.token) {
      throw new Error(`Signup failed: Status ${signupRes.status}, Error: ${signupData.error}`);
    }
    tokenA = signupData.token;
    console.log('✅ Sign Up Successful! Teacher ID:', signupData.teacherId);

    // -----------------------------------------------------
    // 2. PROFILE RETRIEVAL (Initial Check)
    // -----------------------------------------------------
    console.log('\n2. Testing Profile Retrieval...');
    const profileRes1 = await fetch(`${api}/profile`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const profileData1 = await profileRes1.json();
    if (profileRes1.status !== 200 || !profileData1.success) {
      throw new Error(`Profile retrieval failed: ${profileData1.error}`);
    }
    console.log('✅ Profile Retrieved Successfully!');
    console.log(`   Name: ${profileData1.user.firstName} ${profileData1.user.lastName}`);
    console.log(`   Department: ${profileData1.user.department}`);
    console.log(`   Theme Preference: ${profileData1.user.preferences?.theme}`);
    console.log(`   2FA Status: ${profileData1.user.twoFactor?.enabled ? 'Enabled' : 'Disabled'}`);
    
    sessionAId = profileData1.user.sessions[0]?.sessionId;
    console.log(`   Active Sessions Count: ${profileData1.user.sessions.length}`);

    // -----------------------------------------------------
    // 3. UPDATE PROFILE
    // -----------------------------------------------------
    console.log('\n3. Testing Profile Update (Preferences & Bio)...');
    const updateRes = await fetch(`${api}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        bio: 'Automated E2E security verification tester.',
        phoneNumber: '+91-9988776655',
        designation: 'Associate Professor',
        subjectSpecialization: ['Theory of Computation', 'Cyber Security'],
        preferences: {
          theme: 'dark',
          notifications: {
            emailOnPaperGenerated: true,
            emailOnCommentReceived: false
          }
        }
      })
    });
    const updateData = await updateRes.json();
    if (updateRes.status !== 200 || !updateData.success) {
      throw new Error(`Profile update failed: ${updateData.error}`);
    }
    console.log('✅ Profile Update Successful!');
    console.log(`   Updated Bio: "${updateData.user.bio}"`);
    console.log(`   Updated Theme Preference: ${updateData.user.preferences?.theme}`);
    console.log(`   Updated Designation: ${updateData.user.designation}`);
    console.log(`   Updated Subjects: ${updateData.user.subjectSpecialization.join(', ')}`);

    // -----------------------------------------------------
    // 4. TWO-FACTOR AUTHENTICATION SETUP
    // -----------------------------------------------------
    console.log('\n4. Testing 2FA Setup Flow...');
    
    // Step A: Initiate 2FA
    const init2faRes = await fetch(`${api}/profile/2fa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ method: 'email' })
    });
    const init2faData = await init2faRes.json();
    if (init2faRes.status !== 200 || !init2faData.success) {
      throw new Error(`2FA Setup initiation failed: ${init2faData.error}`);
    }
    console.log('   2FA Setup initiated. Retrieving mock OTP from fallback DB...');

    // Extract secret directly from JSON db file
    const otpCode = get2faSecretFromDb(testEmail);
    if (!otpCode) {
      throw new Error('Could not retrieve mock OTP code from auth DB');
    }
    console.log(`   Retrieved OTP Code: ${otpCode}`);

    // Step B: Verify & Complete 2FA Setup
    const verify2faRes = await fetch(`${api}/profile/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ code: otpCode })
    });
    const verify2faData = await verify2faRes.json();
    if (verify2faRes.status !== 200 || !verify2faData.success || !verify2faData.backupCodes) {
      throw new Error(`2FA verification failed: ${verify2faData.error}`);
    }
    backupCodes = verify2faData.backupCodes;
    console.log('✅ Two-Factor Authentication successfully enabled!');
    console.log('   Backup Codes Generated:', backupCodes);

    // -----------------------------------------------------
    // 5. LOGIN SECURITY WITH 2FA CHALLENGE
    // -----------------------------------------------------
    console.log('\n5. Testing 2FA Login Challenge...');
    const loginRes1 = await fetch(`${api}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData1 = await loginRes1.json();
    if (loginRes1.status !== 200 || !loginData1.success || !loginData1.requires2FA) {
      throw new Error(`Login 2FA challenge expected but got: ${JSON.stringify(loginData1)}`);
    }
    console.log('✅ Login correctly triggered 2FA challenge!');
    const tempToken = loginData1.tempToken;

    // Retrieve new OTP from fallback DB
    const loginOtp = get2faSecretFromDb(testEmail);
    console.log(`   Retrieved login OTP Code: ${loginOtp}`);

    // Verify login OTP
    const verifyLogin2fa = await fetch(`${api}/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, code: loginOtp })
    });
    const verifyLoginData = await verifyLogin2fa.json();
    if (verifyLogin2fa.status !== 200 || !verifyLoginData.success || !verifyLoginData.token) {
      throw new Error(`2FA login verification failed: ${verifyLoginData.error}`);
    }
    // Set Token B as our new logged in session
    tokenB = verifyLoginData.token;
    console.log('✅ 2FA login verified and session established!');

    // -----------------------------------------------------
    // 6. LOGIN WITH BACKUP CODES
    // -----------------------------------------------------
    console.log('\n6. Testing Login via Backup Code...');
    const loginRes2 = await fetch(`${api}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData2 = await loginRes2.json();
    if (!loginData2.requires2FA) {
      throw new Error('Expected 2FA challenge on login');
    }
    
    const usedBackupCode = backupCodes[0];
    console.log(`   Attempting verification with Backup Code: ${usedBackupCode}`);
    const verifyBackupRes = await fetch(`${api}/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: loginData2.tempToken, code: usedBackupCode })
    });
    const verifyBackupData = await verifyBackupRes.json();
    if (verifyBackupRes.status !== 200 || !verifyBackupData.success) {
      throw new Error(`Backup code verification failed: ${verifyBackupData.error}`);
    }
    console.log('✅ Backup code login verified and accepted successfully!');

    // -----------------------------------------------------
    // 7. ACTIVE SESSIONS LISTING AND REVOCATION
    // -----------------------------------------------------
    console.log('\n7. Testing Session Revocation Security...');
    
    // Get profile to see sessions
    const profileRes2 = await fetch(`${api}/profile`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const profileData2 = await profileRes2.json();
    
    console.log(`   Active Sessions list:`);
    profileData2.user.sessions.forEach(s => {
      console.log(`     - Session ID: ${s.sessionId}, IP: ${s.ip}, Device: ${s.userAgent}`);
    });

    // Revoke Token A's session using Token B
    console.log(`   Revoking session A (${sessionAId}) using current session B...`);
    const revokeRes = await fetch(`${api}/profile/revoke-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ sessionId: sessionAId })
    });
    const revokeData = await revokeRes.json();
    if (revokeRes.status !== 200 || !revokeData.success) {
      throw new Error(`Session revocation failed: ${revokeData.error}`);
    }
    console.log('✅ Session A revoked successfully!');

    // Verify Token A is now BLOCKED by authenticateToken middleware
    console.log('   Checking if Token A is blocked...');
    const checkBlockedRes = await fetch(`${api}/profile`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const checkBlockedData = await checkBlockedRes.json();
    if (checkBlockedRes.status !== 403 || checkBlockedData.success === true) {
      throw new Error(`Revoked session was NOT blocked! Status: ${checkBlockedRes.status}`);
    }
    console.log(`✅ Token A successfully rejected: 403 Forbidden - "${checkBlockedData.error}"`);

    // -----------------------------------------------------
    // 8. GDPR COMPLIANT DATA EXPORT
    // -----------------------------------------------------
    console.log('\n8. Testing GDPR Data Export...');
    const exportRes = await fetch(`${api}/profile/export-data`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (exportRes.status !== 200) {
      throw new Error(`Data export failed with status ${exportRes.status}`);
    }
    const contentType = exportRes.headers.get('content-type');
    const contentDisposition = exportRes.headers.get('content-disposition');
    
    if (contentType !== 'application/zip' || !contentDisposition.includes('mvit_profile_export_')) {
      throw new Error(`Invalid export response. Type: ${contentType}, Header: ${contentDisposition}`);
    }
    console.log('✅ GDPR data archive downloaded successfully!');
    console.log('   Content-Type:', contentType);
    console.log('   Header:', contentDisposition);

    // -----------------------------------------------------
    // 9. DANGER ZONE: ACCOUNT DELETION (GDPR Right to be Forgotten)
    // -----------------------------------------------------
    console.log('\n9. Testing Danger Zone: GDPR Account Deletion...');
    
    // Create a dummy paper first to test anonymization
    const dummyPaper = {
      paperId: `paper-test-${Date.now()}`,
      teacherId: profileData2.user.teacherId,
      subject: 'E2E Testing Subject',
      subjectCode: 'E2E-101',
      facultyName: `${profileData2.user.firstName} ${profileData2.user.lastName}`,
      createdAt: new Date().toISOString()
    };
    
    // Save the dummy paper directly to fallback JSON (mock saving)
    let papers = [];
    if (fs.existsSync(PAPERS_DB_PATH)) {
      papers = JSON.parse(fs.readFileSync(PAPERS_DB_PATH, 'utf-8'));
    }
    papers.push(dummyPaper);
    fs.writeFileSync(PAPERS_DB_PATH, JSON.stringify(papers, null, 2), 'utf-8');
    console.log('   Created dummy paper in DB to test anonymization logic.');

    // Now delete account with deletePapers: false (should anonymize papers)
    const deleteRes = await fetch(`${api}/profile/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ password: testPassword, deletePapers: false })
    });
    const deleteData = await deleteRes.json();
    if (deleteRes.status !== 200 || !deleteData.success) {
      throw new Error(`Account deletion failed: ${deleteData.error}`);
    }
    console.log('✅ Account Deleted Successfully!');

    // Verify user is removed from auth_db
    const finalAuthDb = JSON.parse(fs.readFileSync(AUTH_DB_PATH, 'utf-8'));
    const userFound = finalAuthDb.teachers.some(t => t.email === testEmail);
    if (userFound) {
      throw new Error('User record was NOT removed from auth_db.json after deletion!');
    }
    console.log('✅ User record completely expunged from database.');

    // Verify paper is anonymized
    const finalPapersDb = JSON.parse(fs.readFileSync(PAPERS_DB_PATH, 'utf-8'));
    const savedPaper = finalPapersDb.find(p => p.paperId === dummyPaper.paperId);
    if (!savedPaper) {
      throw new Error('Paper was deleted, but was expected to be anonymized');
    }
    if (savedPaper.teacherId !== 'DELETED_TEACHER' || savedPaper.facultyName !== 'Anonymized Faculty') {
      throw new Error(`Paper was not anonymized correctly: ${JSON.stringify(savedPaper)}`);
    }
    console.log('✅ Saved paper anonymized successfully! (teacherId: "DELETED_TEACHER", facultyName: "Anonymized Faculty")');

    // Cleanup the dummy paper
    const cleanedPapers = finalPapersDb.filter(p => p.paperId !== dummyPaper.paperId);
    fs.writeFileSync(PAPERS_DB_PATH, JSON.stringify(cleanedPapers, null, 2), 'utf-8');

    console.log('\n=====================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! PRODUCTION READY!');
    console.log('=====================================================');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
