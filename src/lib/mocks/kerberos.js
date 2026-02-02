// Mock Kerberos module
module.exports = {
  initializeClient: () => {},
  principal: () => {},
  checkPassword: () => {},
  // Add any other Kerberos methods that might be used
  KerberosClient: class {
    step() { return Promise.resolve('') }
    wrap() { return Promise.resolve('') }
    unwrap() { return Promise.resolve('') }
  },
  KerberosServer: class {
    step() { return Promise.resolve('') }
    wrap() { return Promise.resolve('') }
    unwrap() { return Promise.resolve('') }
  }
} 