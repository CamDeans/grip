# Create Next.js project with TypeScript
npx create-next-app@latest cursor-ai-git-analysis --typescript --tailwind --eslint

cd cursor-ai-git-analysis

# Install additional dependencies
npm install @anthropic-ai/sdk @auth/mongodb-adapter mongodb
npm install next-auth @types/next-auth jsonwebtoken @types/jsonwebtoken
npm install socket.io socket.io-client
npm install @headlessui/react @heroicons/react
npm install react-syntax-highlighter @types/react-syntax-highlighter
npm install -D vitest @testing-library/react @testing-library/jest-dom

