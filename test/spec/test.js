
function view(path) {
  return browser.get('#/view/' + path);
}

function expectUrl(x) {
  var url = browser.getLocationAbsUrl();
  expect(url).toEqual(x);
}

function getLog(f) {
  return browser.manage().logs().get('browser')
}


afterEach(function () {
  getLog().then(function (log) {
    log.forEach(function (x) {
      if (x.level.value > 900)
        console.log(' * ' + x.message);
    });
  });
});


describe('Login', function() {
  it('shows form', function() {
    browser.get('#/form/login')
    expectUrl('/form/login');
    expect(element(by.tagName('button')).getText())
      .toEqual('Log in');
    expect(element(by.tagName('h4')).getText())
      .toEqual('carenet-ng login');
  });

  /*/
  xit('requires login', function() {
    view('main');
    expectUrl('/form/login');
  });
  /*/

  it('rejects invalid credentials', function() {
    browser.get('#/form/login')
    element(by.model('self.form_data.username')).sendKeys('invalid');
    element(by.model('self.form_data.password')).sendKeys('invalid');
    element(by.tagName('form')).submit();
    expectUrl('/form/login');
    expect(element(by.exactBinding('self.form_message')).getText())
      .toContain('failed');
  });

  it('accepts valid credentials', function() {
    browser.get('#/form/login')
    element(by.model('self.form_data.username')).sendKeys('test');
    element(by.model('self.form_data.password')).sendKeys('test');
    element(by.tagName('form')).submit();
    expectUrl('/view/main');
    expect(element(by.tagName('h1')).getText())
      .toContain('Hello');
  });

  /*/
  xit('maintains the session', function () {
    view('main');
    expectUrl('/view/main');
  });
  /*/

  /*/
  it('can log out', function () {
    view('main');
    element(by.id('logout-link')).click();
    // browser.switchTo().alert().accept();
    expectUrl('/form/login');
  });
  /*/
});


