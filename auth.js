// =================================================================================
// Global Functions for HTML 'onclick' events
// These must be in the global scope to be accessible from the HTML.
// =================================================================================

/**
 * Initiates the Google Sign-In process.
 */
function signInWithGoogle() {
    // Ensure Firebase is initialized before trying to use its services.
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error("Firebase is not initialized. Cannot sign in with Google.");
        alert("Erro de configuração: A conexão com os serviços de autenticação falhou.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            // Redirect to the main portal on successful login.
            window.location.href = 'main.html';
        })
        .catch((error) => {
            console.error("Google Sign-In Error:", error);
            // Provide a more user-friendly message for common errors.
            if (error.code === 'auth/popup-closed-by-user') {
                alert("A janela de login foi fechada antes da conclusão.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                // This can happen if the user opens the popup and clicks the button again.
                // It's often safe to ignore, but we can log it.
                console.log("Popup request cancelled.");
            } else {
                alert("Ocorreu um erro durante o login com o Google: " + error.message);
            }
        });
}

/**
 * Signs the current user out.
 */
function signOut() {
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
        firebase.auth().signOut().then(() => {
            // Reload the page to reset the state. The auth listener will handle the UI.
            window.location.reload();
        });
    }
}


// =================================================================================
// Main Application Logic
// Runs after the DOM is fully loaded to ensure all elements are available.
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if Firebase is initialized. If not, stop execution.
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error("Firebase not initialized. Check that firebase-config.js is loaded correctly.");
        document.body.innerHTML = '<div style="color: red; text-align: center; padding: 2rem;">Erro Crítico: A conexão com os serviços de autenticação falhou.</div>';
        return;
    }

    const auth = firebase.auth();

    // --- Element Selectors ---
    // General Auth State
    const userInfoDiv = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const loginLink = document.getElementById('login-link');
    
    // Login Page Specific
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const loginButton = document.getElementById('login-button');
    const googleLoginButton = document.getElementById('google-login-button');

    const signupEmailInput = document.getElementById('signup-email-input');
    const signupPasswordInput = document.getElementById('signup-password-input');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password-input');
    const signupButton = document.getElementById('signup-button');


    // --- Auth State Change Listener ---
    // This is the core logic that updates the UI based on whether a user is logged in.
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // --- User is Logged In ---
            // If we are on the login page, redirect to main.
            if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('login.html/')) {
                window.location.href = 'main.html';
                return;
            }
            // Update UI on other pages (like main.html)
            if (loginLink) loginLink.style.display = 'none';
            if (userInfoDiv) {
                userInfoDiv.style.display = 'flex';
                if (userEmailSpan) userEmailSpan.textContent = user.email;
            }
        } else {
            // --- User is Logged Out ---
            // Update UI on other pages
            if (loginLink) loginLink.style.display = 'block';
            if (userInfoDiv) userInfoDiv.style.display = 'none';
        }
    });


    // --- Event Listeners for login.html ---
    if(loginView) { // Only add these listeners if we are on the login page
        
        // Switch between login and signup views
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            signupView.style.display = 'block';
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'block';
            signupView.style.display = 'none';
        });

        // Email/Password Login
        loginButton.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                alert("Por favor, preencha o e-mail e a senha.");
                return;
            }
            auth.signInWithEmailAndPassword(email, password)
                .catch((error) => {
                    console.error("Email Login Error:", error);
                    alert("Falha no login: " + error.message);
                });
        });

        // Email/Password Registration
        signupButton.addEventListener('click', () => {
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;
            const confirmPassword = signupConfirmPasswordInput.value;

            if (password !== confirmPassword) {
                alert("As senhas não coincidem.");
                return;
            }
            if (!email || !password) {
                alert("Por favor, preencha todos os campos para se registrar.");
                return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .catch((error) => {
                    console.error("Signup Error:", error);
                    alert("Falha no registro: " + error.message);
                });
        });
        
        // Google Login Button on login page
        googleLoginButton.addEventListener('click', signInWithGoogle);
    }
});
