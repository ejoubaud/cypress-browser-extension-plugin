describe('custom commands', () => {
  it('works the same, with better logs', () => {
    const myObj = { myKey: 'myVal' };
    cy.clearExtensionStorage('local')
      .setExtensionStorage('local', myObj, { timeout: 5000 })
      .getExtensionStorage('local', ['myKey'])
      .should('deep.eq', myObj)
      .clearExtensionStorage('local')
      .getExtensionStorage('local', ['myKey'])
      .should('deep.eq', {})
      .execExtensionCommand('storage.local', 'set', [myObj], { debug: true })
      .execExtensionCommand('storage.local', 'get', ['myKey'])
      .should('deep.eq', myObj);
  });

  it('works across extensions with the alias option', () => {
    const myObj1 = { myKey: 'myVal1' };
    const myObj2 = { myKey: 'myVal2' };
    const myObj3 = { myKey: 'myVal2' };
    cy.clearExtensionStorage('local')
      .clearExtensionStorage('local', { alias: 'unpacked1' })
      .clearExtensionStorage('local', { alias: 'unpacked2' })
      .setExtensionStorage('local', myObj1)
      .setExtensionStorage('local', myObj2, { alias: 'unpacked1' })
      .setExtensionStorage('local', myObj3, { alias: 'unpacked2' })
      .getExtensionStorage('local', ['myKey'])
      .should('deep.eq', myObj1)
      .getExtensionStorage('local', ['myKey'], { alias: 'unpacked1' })
      .should('deep.eq', myObj2)
      .getExtensionStorage('local', ['myKey'], { alias: 'unpacked2' })
      .should('deep.eq', myObj3);
  });
});
