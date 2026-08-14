// =================================================================================
// Global Functions for HTML 'onclick' events
// These must be in the global scope to be accessible from the HTML.
// =================================================================================

/**
 * Initiates the Google Sign-In process.
 */
function signInWithGoogle() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error("Firebase is not initialized. Cannot sign in with Google.");
        alert("Erro de configuração: A conexão com os serviços de autenticação falhou.");
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            window.location.href = 'main.html';
        })
        .catch((error) => {
            console.error("Google Sign-In Error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                alert("A janela de login foi fechada antes da conclusão.");
            } else if (error.code === 'auth/cancelled-popup-request') {
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
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        return firebase.auth().signOut()
            .then(() => {
                console.log("Usuário deslogado com sucesso.");
                const userInfoDiv = document.getElementById('user-info');
                const loginLink = document.getElementById('login-link');
                if (userInfoDiv) {
                    userInfoDiv.style.display = 'none';
                    userInfoDiv.classList.add('hidden');
                }
                if (loginLink) {
                    loginLink.style.display = '';
                    loginLink.classList.remove('hidden');
                }
                window.location.reload();
            })
            .catch((error) => {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout: " + (error.message || error));
            });
    } else {
        console.warn("Firebase não inicializado para logout.");
        return Promise.resolve();
    }
}


// =================================================================================
// Main Application Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error("Firebase not initialized. Check that firebase-config.js is loaded correctly.");
        document.body.innerHTML = '<div style="color: red; text-align: center; padding: 2rem;">Erro Crítico: A conexão com os serviços de autenticação falhou.</div>';
        return;
    }

    const auth = firebase.auth();

    const userInfoDiv = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const loginLink = document.getElementById('login-link');
    const logoutButton = document.getElementById('logout-button');

    if (logoutButton) {
        logoutButton.addEventListener('click', function (e) {
            e.preventDefault();
            signOut();
        });
    }

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

    auth.onAuthStateChanged(function (user) {
        if (user) {
            if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('login.html/')) {
                window.location.href = 'main.html';
                return;
            }
            if (loginLink) {
                loginLink.style.display = 'none';
                loginLink.classList.add('hidden');
            }
            if (userInfoDiv) {
                userInfoDiv.style.display = 'flex';
                userInfoDiv.classList.remove('hidden');
                if (userEmailSpan) {
                    userEmailSpan.textContent = user.email;
                    if (typeof firebase !== 'undefined' && firebase.firestore) {
                        firebase.firestore().collection('users').doc(user.uid).get()
                            .then(doc => {
                                if (doc.exists && doc.data().nickname) {
                                    userEmailSpan.textContent = `${doc.data().nickname} (${user.email})`;
                                }
                            }).catch(err => console.log("Profile not found or error:", err));
                    }
                }
            }
        } else {
            if (loginLink) {
                loginLink.style.display = '';
                loginLink.classList.remove('hidden');
            }
            if (userInfoDiv) {
                userInfoDiv.style.display = 'none';
                userInfoDiv.classList.add('hidden');
            }
            if (userEmailSpan) {
                userEmailSpan.textContent = '';
            }
        }
    });

    if (loginView) {
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

        googleLoginButton.addEventListener('click', signInWithGoogle);
    }
});
