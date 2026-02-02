#!/usr/bin/env node

/**
 * G.R.I.P. Test Coverage Report Generator
 * 
 * This script analyzes the codebase to identify which components, services, and hooks
 * have test coverage and which ones need additional tests.
 * 
 * Run with: node src/scripts/generateTestCoverageReport.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  basePath: path.resolve(__dirname, '../../'),
  componentDirs: ['src/components'],
  serviceDirs: ['src/lib/services'],
  hookDirs: ['src/hooks'],
  testDirs: ['src/tests'],
  excludeDirs: ['node_modules', '.next', 'public'],
  outputFile: 'test-coverage-report.md',
  fileExtensions: ['.js', '.jsx', '.ts', '.tsx']
};

// Utility functions
function findFiles(dir, extensions, excludeDirs = []) {
  let results = [];
  
  if (excludeDirs.includes(path.basename(dir))) {
    return results;
  }
  
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions, excludeDirs));
    } else if (extensions.includes(path.extname(file).toLowerCase())) {
      results.push(filePath);
    }
  });
  
  return results;
}

function findTestFiles(dir, extensions) {
  return findFiles(dir, extensions)
    .filter(file => file.includes('.test.') || file.includes('.spec.'));
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(CONFIG.basePath.replace(/\\/g, '/') + '/', '');
}

function extractComponentName(filePath) {
  const fileName = path.basename(filePath);
  return fileName.replace(/\.(jsx?|tsx?)$/, '');
}

function getTestStatus(componentPath, testFiles) {
  const componentName = extractComponentName(componentPath);
  const normalizedPath = normalizePath(componentPath);
  
  // Look for exact test file match
  const exactMatch = testFiles.find(testFile => {
    return testFile.includes(`/${componentName}.test.`) || 
           testFile.includes(`/${componentName}.spec.`);
  });
  
  if (exactMatch) {
    return { 
      status: 'tested',
      testPath: normalizePath(exactMatch)
    };
  }
  
  // Look for test files that might be testing this component
  const possibleMatch = testFiles.find(testFile => {
    const testContent = fs.readFileSync(testFile, 'utf8');
    return testContent.includes(componentName) && 
           (testContent.includes(`import`) || testContent.includes(`require`));
  });
  
  if (possibleMatch) {
    return { 
      status: 'possibly-tested',
      testPath: normalizePath(possibleMatch)
    };
  }
  
  return { 
    status: 'untested',
    testPath: null
  };
}

function generateReport() {
  console.log('Generating test coverage report...');
  
  // Find all source files
  const componentFiles = CONFIG.componentDirs.reduce((acc, dir) => {
    const fullDir = path.join(CONFIG.basePath, dir);
    if (fs.existsSync(fullDir)) {
      return acc.concat(findFiles(fullDir, CONFIG.fileExtensions, CONFIG.excludeDirs));
    }
    return acc;
  }, []);
  
  const serviceFiles = CONFIG.serviceDirs.reduce((acc, dir) => {
    const fullDir = path.join(CONFIG.basePath, dir);
    if (fs.existsSync(fullDir)) {
      return acc.concat(findFiles(fullDir, CONFIG.fileExtensions, CONFIG.excludeDirs));
    }
    return acc;
  }, []);
  
  const hookFiles = CONFIG.hookDirs.reduce((acc, dir) => {
    const fullDir = path.join(CONFIG.basePath, dir);
    if (fs.existsSync(fullDir)) {
      return acc.concat(findFiles(fullDir, CONFIG.fileExtensions, CONFIG.excludeDirs));
    }
    return acc;
  }, []);
  
  // Find all test files
  const testFiles = CONFIG.testDirs.reduce((acc, dir) => {
    const fullDir = path.join(CONFIG.basePath, dir);
    if (fs.existsSync(fullDir)) {
      return acc.concat(findTestFiles(fullDir, CONFIG.fileExtensions));
    }
    return acc;
  }, []);
  
  // Analyze test coverage
  const componentCoverage = componentFiles.map(file => {
    const status = getTestStatus(file, testFiles);
    return {
      file: normalizePath(file),
      name: extractComponentName(file),
      ...status
    };
  });
  
  const serviceCoverage = serviceFiles.map(file => {
    const status = getTestStatus(file, testFiles);
    return {
      file: normalizePath(file),
      name: extractComponentName(file),
      ...status
    };
  });
  
  const hookCoverage = hookFiles.map(file => {
    const status = getTestStatus(file, testFiles);
    return {
      file: normalizePath(file),
      name: extractComponentName(file),
      ...status
    };
  });
  
  // Generate statistics
  const componentStats = {
    total: componentCoverage.length,
    tested: componentCoverage.filter(c => c.status === 'tested').length,
    possiblyTested: componentCoverage.filter(c => c.status === 'possibly-tested').length,
    untested: componentCoverage.filter(c => c.status === 'untested').length,
  };
  
  const serviceStats = {
    total: serviceCoverage.length,
    tested: serviceCoverage.filter(s => s.status === 'tested').length,
    possiblyTested: serviceCoverage.filter(s => s.status === 'possibly-tested').length,
    untested: serviceCoverage.filter(s => s.status === 'untested').length,
  };
  
  const hookStats = {
    total: hookCoverage.length,
    tested: hookCoverage.filter(h => h.status === 'tested').length,
    possiblyTested: hookCoverage.filter(h => h.status === 'possibly-tested').length,
    untested: hookCoverage.filter(h => h.status === 'untested').length,
  };
  
  const totalStats = {
    total: componentStats.total + serviceStats.total + hookStats.total,
    tested: componentStats.tested + serviceStats.tested + hookStats.tested,
    possiblyTested: componentStats.possiblyTested + serviceStats.possiblyTested + hookStats.possiblyTested,
    untested: componentStats.untested + serviceStats.untested + hookStats.untested,
  };
  
  // Calculate percentages
  const calculatePercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };
  
  componentStats.testedPercent = calculatePercentage(componentStats.tested, componentStats.total);
  componentStats.possiblyTestedPercent = calculatePercentage(componentStats.possiblyTested, componentStats.total);
  componentStats.untestedPercent = calculatePercentage(componentStats.untested, componentStats.total);
  
  serviceStats.testedPercent = calculatePercentage(serviceStats.tested, serviceStats.total);
  serviceStats.possiblyTestedPercent = calculatePercentage(serviceStats.possiblyTested, serviceStats.total);
  serviceStats.untestedPercent = calculatePercentage(serviceStats.untested, serviceStats.total);
  
  hookStats.testedPercent = calculatePercentage(hookStats.tested, hookStats.total);
  hookStats.possiblyTestedPercent = calculatePercentage(hookStats.possiblyTested, hookStats.total);
  hookStats.untestedPercent = calculatePercentage(hookStats.untested, hookStats.total);
  
  totalStats.testedPercent = calculatePercentage(totalStats.tested, totalStats.total);
  totalStats.possiblyTestedPercent = calculatePercentage(totalStats.possiblyTested, totalStats.total);
  totalStats.untestedPercent = calculatePercentage(totalStats.untested, totalStats.total);
  
  // Generate report content
  let reportContent = `# G.R.I.P. Test Coverage Report\n\n`;
  reportContent += `Generated on ${new Date().toLocaleString()}\n\n`;
  
  // Summary section
  reportContent += `## Summary\n\n`;
  reportContent += `| Type | Total | Tested | Possibly Tested | Untested |\n`;
  reportContent += `|------|-------|--------|-----------------|----------|\n`;
  reportContent += `| Components | ${componentStats.total} | ${componentStats.tested} (${componentStats.testedPercent}%) | ${componentStats.possiblyTested} (${componentStats.possiblyTestedPercent}%) | ${componentStats.untested} (${componentStats.untestedPercent}%) |\n`;
  reportContent += `| Services | ${serviceStats.total} | ${serviceStats.tested} (${serviceStats.testedPercent}%) | ${serviceStats.possiblyTested} (${serviceStats.possiblyTestedPercent}%) | ${serviceStats.untested} (${serviceStats.untestedPercent}%) |\n`;
  reportContent += `| Hooks | ${hookStats.total} | ${hookStats.tested} (${hookStats.testedPercent}%) | ${hookStats.possiblyTested} (${hookStats.possiblyTestedPercent}%) | ${hookStats.untested} (${hookStats.untestedPercent}%) |\n`;
  reportContent += `| **Total** | **${totalStats.total}** | **${totalStats.tested} (${totalStats.testedPercent}%)** | **${totalStats.possiblyTested} (${totalStats.possiblyTestedPercent}%)** | **${totalStats.untested} (${totalStats.untestedPercent}%)** |\n\n`;
  
  // Components section
  reportContent += `## Components\n\n`;
  reportContent += `| Component | Status | Test File |\n`;
  reportContent += `|-----------|--------|----------|\n`;
  
  componentCoverage.sort((a, b) => {
    // Sort by status (untested first) then by name
    if (a.status !== b.status) {
      return a.status === 'untested' ? -1 : (a.status === 'possibly-tested' ? (b.status === 'untested' ? 1 : -1) : 1);
    }
    return a.name.localeCompare(b.name);
  }).forEach(component => {
    const statusEmoji = component.status === 'tested' ? '✅' : (component.status === 'possibly-tested' ? '⚠️' : '❌');
    const testFileLink = component.testPath ? `[Test File](${component.testPath})` : '-';
    reportContent += `| [${component.name}](${component.file}) | ${statusEmoji} ${component.status} | ${testFileLink} |\n`;
  });
  
  // Services section
  reportContent += `\n## Services\n\n`;
  reportContent += `| Service | Status | Test File |\n`;
  reportContent += `|---------|--------|----------|\n`;
  
  serviceCoverage.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'untested' ? -1 : (a.status === 'possibly-tested' ? (b.status === 'untested' ? 1 : -1) : 1);
    }
    return a.name.localeCompare(b.name);
  }).forEach(service => {
    const statusEmoji = service.status === 'tested' ? '✅' : (service.status === 'possibly-tested' ? '⚠️' : '❌');
    const testFileLink = service.testPath ? `[Test File](${service.testPath})` : '-';
    reportContent += `| [${service.name}](${service.file}) | ${statusEmoji} ${service.status} | ${testFileLink} |\n`;
  });
  
  // Hooks section
  reportContent += `\n## Hooks\n\n`;
  reportContent += `| Hook | Status | Test File |\n`;
  reportContent += `|------|--------|----------|\n`;
  
  hookCoverage.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'untested' ? -1 : (a.status === 'possibly-tested' ? (b.status === 'untested' ? 1 : -1) : 1);
    }
    return a.name.localeCompare(b.name);
  }).forEach(hook => {
    const statusEmoji = hook.status === 'tested' ? '✅' : (hook.status === 'possibly-tested' ? '⚠️' : '❌');
    const testFileLink = hook.testPath ? `[Test File](${hook.testPath})` : '-';
    reportContent += `| [${hook.name}](${hook.file}) | ${statusEmoji} ${hook.status} | ${testFileLink} |\n`;
  });
  
  // Recommendations section
  reportContent += `\n## Recommendations\n\n`;
  
  if (totalStats.untested > 0) {
    reportContent += `### Priority Items (Untested)\n\n`;
    
    // Critical components
    const criticalComponents = componentCoverage
      .filter(c => c.status === 'untested' && 
                  (c.name.includes('Provider') || 
                   c.name.includes('Context') || 
                   c.name.includes('Layout') ||
                   c.name.includes('Form')))
      .map(c => `- [ ] ${c.name} (${c.file})`);
    
    if (criticalComponents.length > 0) {
      reportContent += `#### Critical Components\n\n`;
      reportContent += criticalComponents.join('\n') + '\n\n';
    }
    
    // Critical services
    const criticalServices = serviceCoverage
      .filter(s => s.status === 'untested' && 
                  (s.name.includes('Service') || 
                   s.name.includes('Provider') || 
                   s.name.includes('Auth')))
      .map(s => `- [ ] ${s.name} (${s.file})`);
    
    if (criticalServices.length > 0) {
      reportContent += `#### Critical Services\n\n`;
      reportContent += criticalServices.join('\n') + '\n\n';
    }
    
    // Critical hooks
    const criticalHooks = hookCoverage
      .filter(h => h.status === 'untested' && 
                  (h.name.includes('use') || 
                   h.name.includes('Provider') || 
                   h.name.includes('Context')))
      .map(h => `- [ ] ${h.name} (${h.file})`);
    
    if (criticalHooks.length > 0) {
      reportContent += `#### Critical Hooks\n\n`;
      reportContent += criticalHooks.join('\n') + '\n\n';
    }
  }
  
  // Write report file
  const outputPath = path.join(CONFIG.basePath, CONFIG.outputFile);
  fs.writeFileSync(outputPath, reportContent);
  
  console.log(`Report generated: ${outputPath}`);
  
  // Return summary stats for scripts that might use this as a module
  return {
    totalStats,
    componentStats,
    serviceStats,
    hookStats
  };
}

// Run the report generator
if (require.main === module) {
  try {
    generateReport();
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

module.exports = { generateReport }; 