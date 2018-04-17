/* globals myExtension */
describe('one extension', () => {
  it('sets listeners', () => {
    cy.visit('https://example.cypress.io');
    const message1 = { myMessage: 'val' };
    const listener1 = cy.spy();
    console.log(listener1);
    cy.wrap(myExtension.addListener('runtime.onMessage', listener1));
    cy.wrap(myExtension.execCommand('runtime', 'sendMessage', [message1]));
    expect(listener1).to.be.calledOnceWith(message1);
  });
});
