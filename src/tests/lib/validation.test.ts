import { validateMessage } from '@/lib/validation';

// Define custom interface for window with lastMessageTime property
interface CustomWindow extends Window {
  lastMessageTime?: number;
}

describe('validation utility', () => {
  describe('validateMessage', () => {
    // Test for empty messages
    it('should reject empty messages', () => {
      const emptyMessage = '';
      const result = validateMessage(emptyMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should reject whitespace-only messages', () => {
      const whitespaceMessage = '   ';
      const result = validateMessage(whitespaceMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    // Test for message length (implementation uses 32k limit)
    it('should reject messages longer than 32000 characters', () => {
      const longMessage = 'a'.repeat(32001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message is too long (max 32k characters). Consider shortening or splitting.');
    });

    it('should accept messages of exactly 32000 characters', () => {
      const borderlineMessage = 'a'.repeat(32000);
      // Mock window for lastMessageTime to avoid rate limiting
      Object.defineProperty(global, 'window', {
        value: { lastMessageTime: 0 },
        writable: true
      });
      const result = validateMessage(borderlineMessage);
      expect(result.isValid).toBe(true);
    });

    // Test for harmful content
    it('should reject messages with script tags', () => {
      const harmfulMessage = 'Hello <script>alert("XSS")</script>';
      const result = validateMessage(harmfulMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains potentially harmful content');
    });

    it('should reject messages with javascript: protocol', () => {
      const harmfulMessage = 'Click here: <a href="javascript:alert(1)">link</a>';
      const result = validateMessage(harmfulMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains potentially harmful content');
    });

    it('should reject messages with event handlers', () => {
      const harmfulMessage = '<div onclick="alert(1)">Click me</div>';
      const result = validateMessage(harmfulMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains potentially harmful content');
    });

    it('should reject messages with data: URI', () => {
      const harmfulMessage = '<img src="data:image/svg+xml;base64,..." />';
      const result = validateMessage(harmfulMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains potentially harmful content');
    });

    // Test rate limiting
    it('should enforce rate limiting', () => {
      const message = 'Hello';
      
      // Set up the window mock with a recent timestamp
      const now = Date.now();
      Object.defineProperty(global, 'window', {
        value: { lastMessageTime: now - 500 }, // 500ms ago
        writable: true
      });
      
      // Mock Date.now to return a consistent value
      const originalDateNow = Date.now;
      global.Date.now = jest.fn(() => now);
      
      try {
        const result = validateMessage(message);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please wait before sending another message');
      } finally {
        // Restore original Date.now
        global.Date.now = originalDateNow;
      }
    });

    it('should accept messages outside rate limit window', () => {
      const message = 'Hello';
      
      // Set up the window mock with an old timestamp
      const now = Date.now();
      Object.defineProperty(global, 'window', {
        value: { lastMessageTime: now - 2000 }, // 2 seconds ago
        writable: true
      });
      
      // Mock Date.now to return a consistent value
      const originalDateNow = Date.now;
      global.Date.now = jest.fn(() => now);
      
      try {
        const result = validateMessage(message);
        expect(result.isValid).toBe(true);
        // Use type assertion to access lastMessageTime property
        expect((global.window as CustomWindow).lastMessageTime).toBe(now); // Check that timestamp was updated
      } finally {
        // Restore original Date.now
        global.Date.now = originalDateNow;
      }
    });

    // Test valid messages
    it('should accept valid messages', () => {
      const validMessage = 'This is a perfectly valid message!';
      
      // Set up the window mock with an old timestamp to avoid rate limiting
      Object.defineProperty(global, 'window', {
        value: { lastMessageTime: 0 },
        writable: true
      });
      
      const result = validateMessage(validMessage);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
}); 