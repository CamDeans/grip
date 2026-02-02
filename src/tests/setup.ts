import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

// Mock fetch globally
global.fetch = jest.fn()

// Reset all mocks after each test
afterEach(() => {
  jest.resetAllMocks()
})
