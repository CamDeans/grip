/**
 * Load .env.local and .env before running scripts (e.g. db:init).
 * Use as Node preload: node -r ./src/scripts/loadEnv.js ...
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })
