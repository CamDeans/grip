// Mock next-auth/react so useSession and SessionProvider work in tests without a real provider.
const React = require('react')

const mockSession = {
  user: { name: null, email: null, image: null },
  expires: ''
}

function useSession() {
  return { data: mockSession, status: 'authenticated', update: jest.fn() }
}

function SessionProvider({ children }) {
  return React.createElement(React.Fragment, null, children)
}

function signIn() {}
function signOut() {}
function getSession() {
  return Promise.resolve(mockSession)
}

module.exports = {
  useSession,
  SessionProvider,
  signIn,
  signOut,
  getSession,
  getCsrfToken: () => Promise.resolve(null),
  getProviders: () => Promise.resolve({})
}
