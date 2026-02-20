#!/usr/bin/env node

/**
 * GRIP App Flow Test Script
 * Tests connections, routes, and data flow without making actual API calls
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    results.passed.push(`✓ ${description}: ${filePath}`);
  } else {
    results.failed.push(`✗ ${description}: ${filePath} NOT FOUND`);
  }
  return exists;
}

function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    results.failed.push(`✗ ${description}: File ${filePath} not found`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const missing = [];
  
  patterns.forEach(pattern => {
    if (typeof pattern === 'string') {
      if (!content.includes(pattern)) {
        missing.push(pattern);
      }
    } else if (pattern instanceof RegExp) {
      if (!pattern.test(content)) {
        missing.push(pattern.toString());
      }
    }
  });

  if (missing.length === 0) {
    results.passed.push(`✓ ${description}: All patterns found`);
    return true;
  } else {
    results.failed.push(`✗ ${description}: Missing patterns: ${missing.join(', ')}`);
    return false;
  }
}

function checkRouteConnection(routeFile, expectedEndpoints, description) {
  const fullPath = path.join(process.cwd(), routeFile);
  if (!fs.existsSync(fullPath)) {
    results.failed.push(`✗ ${description}: Route file ${routeFile} not found`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const found = [];
  const missing = [];

  expectedEndpoints.forEach(endpoint => {
    if (content.includes(endpoint)) {
      found.push(endpoint);
    } else {
      missing.push(endpoint);
    }
  });

  if (missing.length === 0) {
    results.passed.push(`✓ ${description}: All endpoints found`);
    return true;
  } else {
    results.warnings.push(`⚠ ${description}: Missing endpoints: ${missing.join(', ')}`);
    return false;
  }
}

function checkImportExists(filePath, importPath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const importPattern = new RegExp(`from ['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]|require\\(['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`);
  
  if (importPattern.test(content)) {
    const targetPath = path.join(process.cwd(), importPath);
    if (fs.existsSync(targetPath + '.ts') || fs.existsSync(targetPath + '.tsx') || fs.existsSync(targetPath + '.js')) {
      results.passed.push(`✓ ${description}: Import valid`);
      return true;
    } else {
      results.warnings.push(`⚠ ${description}: Import found but target file may not exist: ${importPath}`);
      return false;
    }
  } else {
    results.warnings.push(`⚠ ${description}: Import not found: ${importPath}`);
    return false;
  }
}

// Test Suite
log('\n🔍 GRIP App Flow Test Suite\n', colors.cyan);
log('Testing connections, routes, and data flow...\n', colors.blue);

// 1. Core API Routes
log('1. Testing Core API Routes...', colors.yellow);
checkFileExists('src/app/api/projects/route.ts', 'Projects list/create route');
checkFileExists('src/app/api/projects/[id]/route.ts', 'Project detail route');
checkFileExists('src/app/api/projects/[id]/state/route.ts', 'Project state route');
checkFileExists('src/app/api/projects/[id]/analysis/status/route.ts', 'Analysis status route');
checkFileExists('src/app/api/projects/[id]/plan/route.ts', 'Plan route');
checkFileExists('src/app/api/projects/[id]/preflight/route.ts', 'Preflight route');
checkFileExists('src/app/api/projects/[id]/export-files/route.ts', 'Export files route');
checkFileExists('src/app/api/projects/[id]/download/route.ts', 'Download route');

// 2. Enhanced Chat Route
log('\n2. Testing Enhanced Chat Route...', colors.yellow);
checkFileExists('src/app/api/enhanced-chat/route.ts', 'Enhanced chat route');
checkFileContent('src/app/api/enhanced-chat/route.ts', [
  'isSandbox',
  'sandboxProjects',
  'saveCodeBlocksToProject',
  'runMainProject',
], 'Enhanced chat handles sandbox projects');

// 3. Sandbox Routes
log('\n3. Testing Sandbox Routes...', colors.yellow);
checkFileExists('src/app/api/projects/[id]/create-sandbox/route.ts', 'Create sandbox route');
checkFileExists('src/app/api/projects/[id]/sandboxes/route.ts', 'List sandboxes route');
checkFileExists('src/app/api/projects/[id]/legal-sandbox/files/route.ts', 'Sandbox files route');
checkFileExists('src/app/api/projects/[id]/legal-sandbox/plan/route.ts', 'Sandbox plan route');
checkFileExists('src/app/api/projects/[id]/legal-sandbox/analysis/status/route.ts', 'Sandbox analysis status route');

// 4. Frontend Pages
log('\n4. Testing Frontend Pages...', colors.yellow);
checkFileExists('src/app/dashboard/projects/page.tsx', 'Projects list page');
checkFileExists('src/app/dashboard/projects/[id]/page.tsx', 'Project overview page');
checkFileExists('src/app/dashboard/projects/[id]/enhanced-chat/page.tsx', 'Enhanced chat page');
checkFileExists('src/app/dashboard/projects/[id]/preview/page.tsx', 'Preview page');
checkFileExists('src/app/dashboard/projects/[id]/repo/page.tsx', 'Repo page');
checkFileExists('src/app/dashboard/projects/[id]/settings/page.tsx', 'Settings page');
checkFileExists('src/app/dashboard/projects/[id]/layout.tsx', 'Project layout');

// 5. Check Project Overview Page Connections
log('\n5. Testing Project Overview Page Connections...', colors.yellow);
checkFileContent('src/app/dashboard/projects/[id]/page.tsx', [
  'isSandbox',
  'sandboxes',
  'handleCreateSandbox',
  '/api/projects/${projectId}/sandboxes',
  '/api/projects/${projectId}/create-sandbox',
  'Sandbox Experiments',
], 'Project overview has sandbox functionality');

// 6. Check API Route Sandbox Support
log('\n6. Testing API Route Sandbox Support...', colors.yellow);
checkFileContent('src/app/api/projects/[id]/state/route.ts', [
  'sandboxProjects',
  'legalSandboxPlans',
], 'State route handles sandbox projects');
checkFileContent('src/app/api/projects/[id]/analysis/status/route.ts', [
  'sandboxProjects',
  'sandboxAnalyses',
], 'Analysis status handles sandbox projects');
checkFileContent('src/app/api/projects/[id]/plan/route.ts', [
  'sandboxProjects',
  'legalSandboxPlans',
], 'Plan route handles sandbox projects');
checkFileContent('src/app/api/projects/[id]/download/route.ts', [
  'sandboxProjects',
  'getLegalSandboxFilesForExport',
], 'Download route handles sandbox projects');
checkFileContent('src/app/api/projects/[id]/export-files/route.ts', [
  'sandboxProjects',
  'getLegalSandboxFilesForExport',
], 'Export files route handles sandbox projects');
checkFileContent('src/app/api/projects/[id]/preflight/route.ts', [
  'sandboxProjects',
  'getLegalSandboxFilesForExport',
], 'Preflight route handles sandbox projects');

// 7. Check Service Files
log('\n7. Testing Service Files...', colors.yellow);
checkFileExists('src/lib/services/sandboxProjectService.ts', 'Sandbox project service');
checkFileExists('src/lib/services/legalSandboxService.ts', 'Legal sandbox service');
checkFileExists('src/lib/services/analysisService.ts', 'Analysis service');
checkFileExists('src/lib/services/projectPlanningService.ts', 'Project planning service');
checkFileExists('src/lib/services/fileStorageService.ts', 'File storage service');
checkFileExists('src/lib/runMainProject.ts', 'Run main project utility');

// 8. Check Enhanced Chat Imports
log('\n8. Testing Enhanced Chat Imports...', colors.yellow);
checkImportExists('src/app/api/enhanced-chat/route.ts', '@/lib/runMainProject', 'Enhanced chat imports runMainProject');
checkImportExists('src/app/api/enhanced-chat/route.ts', '@/lib/services/legalSandboxService', 'Enhanced chat imports legalSandboxService');

// 9. Check Project Layout Connections
log('\n9. Testing Project Layout Connections...', colors.yellow);
checkFileContent('src/app/dashboard/projects/[id]/layout.tsx', [
  'isSandbox',
  '/legal-sandbox/plan',
  '/plan',
], 'Project layout handles sandbox plan routes');

// 10. Check Missing Error Handling
log('\n10. Testing Error Handling...', colors.yellow);
const routesToCheck = [
  'src/app/api/projects/[id]/route.ts',
  'src/app/api/projects/[id]/state/route.ts',
  'src/app/api/projects/[id]/plan/route.ts',
];

routesToCheck.forEach(route => {
  const fullPath = path.join(process.cwd(), route);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('try') && content.includes('catch')) {
      results.passed.push(`✓ ${route}: Has error handling`);
    } else {
      results.warnings.push(`⚠ ${route}: May be missing error handling`);
    }
  }
});

// 11. Check Route Parameter Validation
log('\n11. Testing Route Parameter Validation...', colors.yellow);
checkFileContent('src/app/api/projects/[id]/route.ts', [
  'ObjectId.isValid',
  'requireAuthAndProjectId',
], 'Project detail route validates ObjectId');
checkFileContent('src/app/api/projects/[id]/state/route.ts', [
  'ObjectId.isValid',
], 'State route validates ObjectId');
checkFileContent('src/app/api/projects/[id]/plan/route.ts', [
  'ObjectId.isValid',
], 'Plan route validates ObjectId');

// 12. Check Database Collection Names Consistency
log('\n12. Testing Database Collection Names...', colors.yellow);
const collections = {
  'projects': ['src/app/api/projects/route.ts', 'src/app/api/projects/[id]/route.ts'],
  'sandboxProjects': ['src/app/api/projects/[id]/create-sandbox/route.ts', 'src/app/api/projects/[id]/sandboxes/route.ts'],
  'sandboxAnalyses': ['src/app/api/projects/[id]/analysis/status/route.ts'],
  'legalSandboxPlans': ['src/app/api/projects/[id]/plan/route.ts', 'src/app/api/projects/[id]/state/route.ts'],
};

Object.entries(collections).forEach(([collection, files]) => {
  files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(`'${collection}'`) || content.includes(`"${collection}"`)) {
        results.passed.push(`✓ ${file}: Uses collection '${collection}'`);
      } else {
        results.warnings.push(`⚠ ${file}: May not use collection '${collection}'`);
      }
    }
  });
});

// 13. Check Frontend Route Consistency
log('\n13. Testing Frontend Route Consistency...', colors.yellow);
const frontendRoutes = [
  { page: 'src/app/dashboard/projects/[id]/page.tsx', routes: ['/api/projects/${projectId}', '/api/projects/${projectId}/state', '/api/projects/${projectId}/analysis/status'] },
  { page: 'src/app/dashboard/projects/[id]/enhanced-chat/page.tsx', routes: ['/api/projects/${projectId}', '/api/enhanced-chat'] },
];

frontendRoutes.forEach(({ page, routes }) => {
  const fullPath = path.join(process.cwd(), page);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    routes.forEach(route => {
      if (content.includes(route)) {
        results.passed.push(`✓ ${page}: Uses route ${route}`);
      } else {
        results.warnings.push(`⚠ ${page}: May not use route ${route}`);
      }
    });
  }
});

// 14. Check for Missing Type Definitions
log('\n14. Testing Type Definitions...', colors.yellow);
checkFileContent('src/app/dashboard/projects/[id]/page.tsx', [
  'isSandbox',
  'parentProjectId',
], 'Project overview has sandbox type definitions');

// 15. Middle (plan context from analysis) & Token Budget
log('\n15. Testing Middle & Token Budget...', colors.yellow);
checkFileExists('src/lib/services/planContextFromAnalysisService.ts', 'Plan context from analysis (middle)');
checkFileContent('src/lib/services/planContextFromAnalysisService.ts', [
  'buildPlanContextFromAnalysis',
  'checklistSummary',
  'layerPrompts',
], 'Middle builds plan context from analysis');
checkImportExists('src/lib/services/planGeneratorService.ts', '@/lib/services/planContextFromAnalysisService', 'Plan generator uses middle');
checkFileContent('src/lib/services/planGeneratorService.ts', ['buildPlanContextFromAnalysis'], 'Plan generator calls buildPlanContextFromAnalysis');
checkFileExists('src/lib/constants/tokenLimitsByTier.ts', 'Token limits by tier');
checkFileContent('src/lib/constants/tokenLimitsByTier.ts', [
  'getChatSectionBudgets',
  'getAnalysisRawSummaryMaxChars',
], 'Token limits exports chat budgets and analysis caps');
checkFileExists('src/lib/constants/tokenBudgetPlan.ts', 'Token budget plan');
checkFileContent('src/lib/constants/tokenBudgetPlan.ts', [
  'getChatResponseMaxTokens',
  'buildTokenBudgetPromptFragment',
], 'Token budget exports response cap and prompt fragment');
checkFileContent('src/app/api/enhanced-chat/route.ts', [
  'getChatSectionBudgets',
  'getChatResponseMaxTokens',
  'sectionBudgets',
  'responseMaxTokens',
], 'Enhanced chat uses tier budgets and response cap');
checkFileContent('src/app/api/enhanced-chat/route.ts', ['stopReason', 'max_tokens'], 'Enhanced chat handles cut-off (max_tokens)');

// Summary
log('\n' + '='.repeat(60), colors.cyan);
log('TEST SUMMARY', colors.cyan);
log('='.repeat(60), colors.cyan);

log(`\n✅ Passed: ${results.passed.length}`, colors.green);
log(`❌ Failed: ${results.failed.length}`, colors.red);
log(`⚠️  Warnings: ${results.warnings.length}`, colors.yellow);

if (results.failed.length > 0) {
  log('\n❌ FAILED TESTS:', colors.red);
  results.failed.forEach(test => log(`  ${test}`, colors.red));
}

if (results.warnings.length > 0) {
  log('\n⚠️  WARNINGS:', colors.yellow);
  results.warnings.forEach(warning => log(`  ${warning}`, colors.yellow));
}

if (results.passed.length > 0 && results.failed.length === 0) {
  log('\n✅ All critical tests passed!', colors.green);
  process.exit(0);
} else if (results.failed.length > 0) {
  log('\n❌ Some tests failed. Please review the errors above.', colors.red);
  process.exit(1);
} else {
  log('\n✅ All tests passed with some warnings.', colors.green);
  process.exit(0);
}
