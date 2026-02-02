const fs = require('fs');
const path = require('path');

const directories = [
  path.join('src', 'app', 'api', 'analysis', '[id]'),
  path.join('src', 'app', 'api', 'project-structure', '[id]'),
  path.join('src', 'app', 'api', 'chat', 'history', '[id]')
];

directories.forEach(dir => {
  console.log(`\nFiles in ${dir}:`);
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${stats.size} bytes)`);
    });
  } catch (err) {
    console.error(`  Error reading directory: ${err.message}`);
  }
}); 