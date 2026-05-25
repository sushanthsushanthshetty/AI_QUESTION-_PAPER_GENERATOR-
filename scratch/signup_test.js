import fetch from 'node-fetch';
const signup = async () => {
  const response = await fetch('http://localhost:5000/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      department: 'CS',
      password: 'Test1234'
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};
signup();
