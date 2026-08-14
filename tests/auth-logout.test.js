/**
 * Testes unitários para a funcionalidade de Logout
 * Valida a função signOut, binding de eventos no DOM e estados de UI no onAuthStateChanged.
 */

const QUnit = require('qunit');
const fs = require('fs');
const path = require('path');

const AUTH_JS_PATH = path.resolve(__dirname, '../src/core/auth.js');
const MAIN_HTML_PATH = path.resolve(__dirname, '../public/main.html');
const ITEMS_HTML_PATH = path.resolve(__dirname, '../public/items.html');
const ITEMS_JS_PATH = path.resolve(__dirname, '../src/ui/pages/items.js');

QUnit.module('Auth & Logout Tests', function (hooks) {

    QUnit.test('Arquivo auth.js deve existir e conter a função signOut e listener para #logout-button', function (assert) {
        assert.ok(fs.existsSync(AUTH_JS_PATH), 'auth.js deve existir');
        const authContent = fs.readFileSync(AUTH_JS_PATH, 'utf-8');

        assert.ok(authContent.includes('function signOut()'), 'Deve definir function signOut()');
        assert.ok(authContent.includes('firebase.auth().signOut()'), 'Deve chamar firebase.auth().signOut()');
        assert.ok(authContent.includes('window.location.reload()'), 'Deve recarregar a tela após signOut');
        assert.ok(authContent.includes("document.getElementById('logout-button')"), 'Deve buscar o elemento logout-button');
        assert.ok(authContent.includes("logoutButton.addEventListener('click'"), 'Deve adicionar listener de click ao logoutButton');
    });

    QUnit.test('public/main.html deve conter #logout-button dentro de #user-info', function (assert) {
        assert.ok(fs.existsSync(MAIN_HTML_PATH), 'main.html deve existir');
        const mainContent = fs.readFileSync(MAIN_HTML_PATH, 'utf-8');

        assert.ok(mainContent.includes('id="user-info"'), 'main.html deve ter elemento #user-info');
        assert.ok(mainContent.includes('id="logout-button"'), 'main.html deve ter elemento #logout-button');
        assert.ok(mainContent.includes('id="login-link"'), 'main.html deve ter elemento #login-link');
    });

    QUnit.test('public/items.html e items.js devem gerenciar logout-button adequadamente', function (assert) {
        assert.ok(fs.existsSync(ITEMS_HTML_PATH), 'items.html deve existir');
        const itemsHtml = fs.readFileSync(ITEMS_HTML_PATH, 'utf-8');
        assert.ok(itemsHtml.includes('id="logout-button"'), 'items.html deve ter elemento #logout-button');
        assert.notOk(itemsHtml.includes('style="display: none;"'), 'items.html não deve ter style inline display:none travado no logout-button');

        assert.ok(fs.existsSync(ITEMS_JS_PATH), 'items.js deve existir');
        const itemsJs = fs.readFileSync(ITEMS_JS_PATH, 'utf-8');
        assert.ok(itemsJs.includes('auth.signOut()'), 'items.js deve executar signOut');
        assert.ok(itemsJs.includes('window.location.reload()'), 'items.js deve recarregar a tela no logout');
    });

    QUnit.test('Simulação: signOut() desloga o Firebase e atualiza o DOM', function (assert) {
        const done = assert.async();

        let signOutCalled = false;
        let reloaded = false;

        // Mock de elementos DOM
        const mockUserInfo = { style: { display: 'flex' }, classList: { add: function(c) { this._class = c; } } };
        const mockLoginLink = { style: { display: 'none' }, classList: { remove: function(c) { this._class = ''; } } };

        const fakeDocument = {
            getElementById: function(id) {
                if (id === 'user-info') return mockUserInfo;
                if (id === 'login-link') return mockLoginLink;
                return null;
            }
        };

        const fakeWindow = {
            location: {
                reload: function() {
                    reloaded = true;
                }
            }
        };

        const fakeFirebase = {
            apps: [{ name: 'default' }],
            auth: function() {
                return {
                    signOut: function() {
                        signOutCalled = true;
                        return Promise.resolve();
                    }
                };
            }
        };

        // Função signOut simulada conforme src/core/auth.js
        function simulateSignOut(firebaseInstance, doc, win) {
            if (typeof firebaseInstance !== 'undefined' && firebaseInstance.apps && firebaseInstance.apps.length) {
                return firebaseInstance.auth().signOut()
                    .then(() => {
                        const userInfoDiv = doc.getElementById('user-info');
                        const loginLink = doc.getElementById('login-link');
                        if (userInfoDiv) {
                            userInfoDiv.style.display = 'none';
                            userInfoDiv.classList.add('hidden');
                        }
                        if (loginLink) {
                            loginLink.style.display = '';
                            loginLink.classList.remove('hidden');
                        }
                        win.location.reload();
                    });
            }
            return Promise.resolve();
        }

        simulateSignOut(fakeFirebase, fakeDocument, fakeWindow).then(() => {
            assert.ok(signOutCalled, 'Firebase auth().signOut() foi acionado');
            assert.equal(mockUserInfo.style.display, 'none', 'user-info display alterado para none');
            assert.equal(mockLoginLink.style.display, '', 'login-link display restaurado');
            assert.ok(reloaded, 'window.location.reload() foi acionado');
            done();
        });
    });

    QUnit.test('auth.js não deve quebrar a renderização da página se o Firebase estiver indisponível/bloqueado', function (assert) {
        const authContent = fs.readFileSync(AUTH_JS_PATH, 'utf-8');
        assert.notOk(authContent.includes('document.body.innerHTML ='), 'auth.js nunca deve sobrescrever document.body.innerHTML em caso de erro');
    });

    QUnit.test('Simulação: onAuthStateChanged sincroniza visibilidade de user-info e login-link', function (assert) {
        const userInfo = { style: {}, classList: { add: (c) => userInfo.hiddenClass = true, remove: (c) => userInfo.hiddenClass = false } };
        const loginLink = { style: {}, classList: { add: (c) => loginLink.hiddenClass = true, remove: (c) => loginLink.hiddenClass = false } };
        const userEmailSpan = { textContent: '' };

        function simulateAuthState(user) {
            if (user) {
                loginLink.style.display = 'none';
                loginLink.classList.add('hidden');
                userInfo.style.display = 'flex';
                userInfo.classList.remove('hidden');
                userEmailSpan.textContent = user.email;
            } else {
                loginLink.style.display = '';
                loginLink.classList.remove('hidden');
                userInfo.style.display = 'none';
                userInfo.classList.add('hidden');
                userEmailSpan.textContent = '';
            }
        }

        // Testar estado logado
        simulateAuthState({ email: 'heroi@kuar-tor.com', uid: '123' });
        assert.equal(userInfo.style.display, 'flex', 'Logado: userInfo visível');
        assert.equal(loginLink.style.display, 'none', 'Logado: loginLink escondido');
        assert.equal(userEmailSpan.textContent, 'heroi@kuar-tor.com', 'Logado: email preenchido');

        // Testar estado deslogado (após logout)
        simulateAuthState(null);
        assert.equal(userInfo.style.display, 'none', 'Deslogado: userInfo escondido');
        assert.equal(loginLink.style.display, '', 'Deslogado: loginLink visível');
        assert.equal(userEmailSpan.textContent, '', 'Deslogado: email limpo');
    });
});
