
function view(path) {
  return browser.get('/#/view/' + path);
}

function url() {
  return browser.getLocationAbsUrl();
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

describe('Main view', function() {
  it('shows login', function() {
    view('main');
    expect(url()).toBe('/form/login');
    // already set in DEVEL mode
    // element(by.model('self.form_data.username')).sendKeys('test');
    // element(by.model('self.form_data.password')).sendKeys('test');
    element(by.tagName('form')).submit();
    expect(url()).toBe('/view/main');
  });

  it('should say hello', function() {
    view('main');
    expect(url()).toContain('/view/main');
    expect($('h1').getText()).toContain('Hello');
    expect(element(by.binding('self.message')).getText()).toBe('Hello');
  });
});

