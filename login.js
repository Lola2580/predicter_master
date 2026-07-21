// ============================================
// LOGIN.JS - Complete Login Logic
// ============================================

// ===== SUPABASE CONFIG =====
const SUPABASE_URL = "https://wxrycrqetmvvousdqjzg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnljcnFldG12dm91c2RxanpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTIxNTgsImV4cCI6MjA5OTE2ODE1OH0.qs3QUrqLyBuNv7KbWBg8b8rlEgWSaKNMKdSxduMvr-Q";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DOM REFS =====
const passwordInput = document.getElementById('passwordInput');
const loginMsg = document.getElementById('loginMsg');
const loginBtn = document.querySelector('.loginBtn');
const eyeIcon = document.getElementById('eyeIcon');

// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePassword() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

// ===== LOGIN FUNCTION =====
async function handleLogin() {
    const password = passwordInput.value.trim();

    // Validation
    if (!password) {
        showMessage('⚠️ Please enter password', 'error');
        return;
    }

    if (password.length < 4) {
        showMessage('⚠️ Password must be at least 4 characters', 'error');
        return;
    }

    // Loading state
    showMessage('⏳ Authenticating...', 'loading');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';

    try {
        // Check password in users table
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('password', password)
            .maybeSingle();

        if (error) {
            console.error('Login error:', error);
            showMessage('❌ Database error: ' + error.message, 'error');
            resetButton();
            return;
        }

        if (!data) {
            showMessage('❌ Invalid password. Please try again.', 'error');
            resetButton();
            return;
        }

        // Success - Store session
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('username', data.username || 'User');
        localStorage.setItem('loginTime', new Date().toISOString());

        showMessage('✅ Welcome ' + (data.username || 'User') + '!', 'success');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);

    } catch (err) {
        console.error('Login exception:', err);
        showMessage('❌ Connection error. Please try again.', 'error');
        resetButton();
    }
}

// ===== SHOW MESSAGE =====
function showMessage(text, type = 'info') {
    loginMsg.textContent = text;
    loginMsg.className = type;
}

// ===== RESET BUTTON =====
function resetButton() {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// ===== AUTO FOCUS =====
document.addEventListener('DOMContentLoaded', () => {
    passwordInput.focus();
});

// ===== SESSION CHECK (Already logged in) =====
(async function checkSession() {
    const loggedIn = localStorage.getItem('loggedIn');
    if (loggedIn === 'true') {
        const username = localStorage.getItem('username') || 'User';
        loginMsg.textContent = '✅ Welcome back ' + username + '! Redirecting...';
        loginMsg.className = 'success';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    }
})();

console.log('%c🔐 LOGIN PAGE', 'color:cyan;font-size:16px;font-weight:bold;');
console.log('%c📱 Mobile Responsive Ready', 'color:#69db7c;font-size:12px;');
