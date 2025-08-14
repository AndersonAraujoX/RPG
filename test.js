QUnit.module('index.html tests', function(hooks) {
  // No setup needed for these tests

  QUnit.test('Page title is correct', function(assert) {
    assert.equal(document.title, 'QUnit Tests', 'The page title is correct');
  });

  QUnit.test('Main heading is correct', function(assert) {
    assert.equal(document.querySelector('h1').innerText.trim(), 'Portal de Kuar-Tor', 'The main heading is correct');
  });

  QUnit.test('Sub-heading is correct', function(assert) {
    assert.equal(document.querySelector('header p').innerText.trim(), 'Recursos para a campanha "A Última Expedição"', 'The sub-heading is correct');
  });

  QUnit.test('There are four resource cards', function(assert) {
    assert.equal(document.querySelectorAll('.resource-card').length, 4, 'There are four resource cards');
  });

  QUnit.test('Resource card titles are correct', function(assert) {
    const cardTitles = document.querySelectorAll('.resource-card h2');
    assert.equal(cardTitles[0].innerText.trim(), 'O Mundo de Kuar-Tor', 'First card title is correct');
    assert.equal(cardTitles[1].innerText.trim(), 'Gerador de Fichas', 'Second card title is correct');
    assert.equal(cardTitles[2].innerText.trim(), 'Tomo das Estatísticas', 'Third card title is correct');
    assert.equal(cardTitles[3].innerText.trim(), 'Manutenção', 'Fourth card title is correct');
  });

  QUnit.test('Resource card links are correct', function(assert) {
    const cardLinks = document.querySelectorAll('.resource-card a');
    assert.ok(cardLinks[0].href.endsWith('Site/siteV1.1.html'), 'First card link is correct');
    assert.ok(cardLinks[1].href.endsWith('Forms/formV4.3.html'), 'Second card link is correct');
    assert.ok(cardLinks[2].href.endsWith('Dados/dados.html'), 'Third card link is correct');
    assert.ok(cardLinks[3].href.endsWith('Rascunhos/manu.html'), 'Fourth card link is correct');
  });

  QUnit.test('Login link is visible by default', function(assert) {
    const loginLink = document.getElementById('login-link');
    assert.notOk(loginLink.classList.contains('hidden'), 'Login link is visible');
  });

  QUnit.test('User info is hidden by default', function(assert) {
    const userInfo = document.getElementById('user-info');
    assert.ok(userInfo.classList.contains('hidden'), 'User info is hidden');
  });

  QUnit.test('Maintenance card has four tape overlays', function(assert) {
    const maintenanceCard = document.querySelectorAll('.resource-card')[3];
    assert.equal(maintenanceCard.querySelectorAll('.tape-overlay').length, 4, 'Maintenance card has four tape overlays');
  });

  QUnit.test('Footer text is correct', function(assert) {
    assert.equal(document.querySelector('footer p').innerText.trim(), 'São Carlos, SP, Brasil | Domingo, 8 de junho de 2025', 'The footer text is correct');
  });
});
