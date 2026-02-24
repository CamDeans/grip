// Reduce noise: Mongoose warns when testing with jsdom
process.env.SUPPRESS_JEST_WARNINGS = 'true'

// Env separation (concrete rule): Tests use only GRIP app env (e.g. MONGODB_URI = GRIP app DB).
// User/project MongoDB (Dashboard → Settings) is never used in tests.
// Polyfill Web Fetch API for @anthropic-ai/sdk (must run before any SDK import)
import '@anthropic-ai/sdk/shims/node'
// Polyfill TextEncoder/TextDecoder for MongoDB/connection-string-url in Node/jsdom
import { TextEncoder, TextDecoder } from 'util'
if (typeof global.TextEncoder === 'undefined') (global as any).TextEncoder = TextEncoder
if (typeof global.TextDecoder === 'undefined') (global as any).TextDecoder = TextDecoder
// React in global scope for ts-jest with jsx: 'react' (compiled JSX uses React.createElement)
import React from 'react'
;(global as any).React = React

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

// Mock fetch globally
global.fetch = jest.fn()

// jsdom does not implement scrollIntoView
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = jest.fn()
}

// Reset all mocks after each test
afterEach(() => {
  jest.resetAllMocks()
})
