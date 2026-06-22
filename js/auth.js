// ============================================
// Auth — login / signup
// ============================================

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const errorBox = document.getElementById('auth-error');

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add('show');
}
function clearError() {
  errorBox.classList.remove('show');
  errorBox.textContent = '';
}

showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  clearError();
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  clearError();
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(friendlyError(err.code));
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(friendlyError(err.code));
  }
});

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Email or password is incorrect.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// If already logged in, skip straight to dashboard
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = 'dashboard.html';
});
