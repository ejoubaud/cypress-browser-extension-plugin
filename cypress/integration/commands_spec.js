/* globals myExtension */
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
