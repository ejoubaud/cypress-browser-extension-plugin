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


describe('several extension', () => {
  const unpacked1 = extensionHelpers({ alias: 'unpacked1', debug: true });
  const unpacked2 = extensionHelpers({ alias: 'unpacked2' });

  beforeEach(() => {
    cy.wrap(unpacked1.clearStorage('local'))
      .wrap(unpacked2.clearStorage('local'));
  });

  it('can interact with 2 different extensions using aliases', () => {
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
