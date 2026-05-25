// Using global fetch available in Node

const api = 'http://localhost:5000';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const main = async () => {
  try {
    console.log('--- Signing up user ---');
    const signupRes = await fetch(`${api}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        department: 'CS',
        password: 'Password123'
      })
    });
    const signupData = await signupRes.json();
    console.log('Signup status:', signupRes.status);
    console.log('Signup response:', signupData);
    const token = signupData.token;
    if (!token) { console.error('No token after signup, abort'); return; }

    console.log('\n--- Logging in (no 2FA) ---');
    const loginRes = await fetch(`${api}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser@example.com', password: 'Password123' })
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', loginData);
    const authToken = loginData.token;
    if (!authToken) { console.error('Login failed'); return; }

    console.log('\n--- Fetch profile ---');
    const profileRes = await fetch(`${api}/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const profileData = await profileRes.json();
    console.log('Profile status:', profileRes.status);
    console.log('Profile data keys:', Object.keys(profileData));
    console.log('Profile:', profileData);

    console.log('\n--- Update profile (bio) ---');
    const updateRes = await fetch(`${api}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ bio: 'Hello from test script' })
    });
    const updateData = await updateRes.json();
    console.log('Update status:', updateRes.status);
    console.log('Update response:', updateData);

    console.log('\n--- Change password ---');
    const changePwdRes = await fetch(`${api}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ currentPassword: 'Password123', newPassword: 'NewPass123' })
    });
    const changePwdData = await changePwdRes.json();
    console.log('Change password status:', changePwdRes.status);
    console.log('Change password response:', changePwdData);

    console.log('\n--- Login with new password ---');
    const login2Res = await fetch(`${api}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser@example.com', password: 'NewPass123' })
    });
    const login2Data = await login2Res.json();
    console.log('Login2 status:', login2Res.status);
    console.log('Login2 response:', login2Data);

    console.log('\n--- Export data ---');
    const exportRes = await fetch(`${api}/profile/export-data`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('Export status:', exportRes.status);
    const disposition = exportRes.headers.get('content-disposition');
    console.log('Export disposition header:', disposition);
    // Not saving zip file here.

    console.log('\n--- Delete account (keep papers) ---');
    const delRes = await fetch(`${api}/profile/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ password: 'NewPass123', deletePapers: false })
    });
    const delData = await delRes.json();
    console.log('Delete status:', delRes.status);
    console.log('Delete response:', delData);

    console.log('\n--- Verify token invalid after deletion (should fail) ---');
    const afterDelRes = await fetch(`${api}/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('After delete profile status:', afterDelRes.status);

  } catch (err) {
    console.error('Error in test script:', err);
  }
};

main();
