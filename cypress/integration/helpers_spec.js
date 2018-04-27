/* globals myExtension */
import extensionHelpers from '../../helpers';

describe('one extension', () => {
  it('can access the local storage', () => {
    cy.visit('https://example.cypress.io').should(() => {
      myExtension.setStorage('local', { myKey: 'myVal' })
        .then(() => myExtension.getStorage('local', 'myKey'))
        .then((storage) => {
          expect(storage.myKey).to.eq('myVal');
        });
    });
  });
});

describe('several extensions', () => {
  const unpacked1 = extensionHelpers({ alias: 'unpacked1', debug: true });
  const unpacked2 = extensionHelpers({ alias: 'unpacked2' });

  beforeEach(() => {
    cy.wrap(unpacked1.clearStorage('local'))
      .wrap(unpacked2.clearStorage('local'));
  });

  it('can interact with several different extensions using aliases', () => {
    cy.wrap(unpacked1.setStorage('local', { myKey: 1 }))
      .wrap(unpacked2.setStorage('local', { myKey: 2 }))
      .wrap(unpacked1.getStorage('local', 'myKey'))
      .should('deep.eq', { myKey: 1 })
      .wrap(unpacked2.getStorage('local', 'myKey'))
      .should('deep.eq', { myKey: 2 })
      .wrap(unpacked1.setStorage('local', { myKey: 3 }, { alias: 'unpacked2' }))
      .wrap(unpacked2.getStorage('local', 'myKey'))
      .should('deep.eq', { myKey: 3 })
      .wrap(unpacked1.getStorage('local', 'myKey', { alias: 'unpacked2' }))
      .should('deep.eq', { myKey: 3 })
      .wrap(unpacked2.getStorage('local', 'myKey', { alias: 'unpacked1' }))
      .should('deep.eq', { myKey: 1 });
  });
});

describe('crx', () => {
  const crxpacked = extensionHelpers({ alias: 'crxpacked' });

  it('works on and unpacks CRX-zipped extensions automatically', () => {
    cy.wrap(crxpacked.setStorage('local', { myKey: 1 }))
      .wrap(crxpacked.getStorage('local', 'myKey'))
      .should('deep.eq', { myKey: 1 });
  });
});

describe('hookless extension', () => {
  context('with default timeout', () => {
    const hookless = extensionHelpers({ alias: 'hookless' });

    it('times out on commands because hook templates are not included', () => {
      const start = Date.now();
      cy.then(() => (
        hookless.setStorage('local', {}).then(
          (res) => { assert.fail(res, Error, 'should have been a timeout'); },
          (err) => {
            expect(err).to.be.an('error');
            expect(Date.now() - start).to.be.closeTo(2000, 100);
          },
        )
      ), { timeout: 10000 }); // large cypress timeout to ensure it's not Cypress timing out
    });
  });

  context('with helper context custom timeout', () => {
    const hookless = extensionHelpers({ alias: 'hookless', timeout: 200 });

    it('times out after context timeout', () => {
      const start = Date.now();
      cy.then(() => (
        hookless.setStorage('local', {}).then(
          (res) => { assert.fail(res, Error, 'should have been a timeout'); },
          (err) => {
            expect(err).to.be.an('error');
            expect(Date.now() - start).to.be.closeTo(200, 50);
          },
        )
      ), { timeout: 10000 }); // large cypress timeout to ensure it's not Cypress timing out
    });
  });

  context('with method level custom timeout', () => {
    const hookless = extensionHelpers({ alias: 'hookless', timeout: 1000 });

    it('overrides both the context and default timeout', () => {
      const start = Date.now();
      cy.then(() => (
        hookless.setStorage('local', {}, { timeout: 300 }).then(
          (res) => { assert.fail(res, Error, 'should have been a timeout'); },
          (err) => {
            expect(err).to.be.an('error');
            expect(Date.now() - start).to.be.closeTo(300, 50);
          },
        )
      ), { timeout: 10000 }); // large cypress timeout to ensure it's not Cypress timing out
    });
  });
});
