const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const outputDir = path.join(projectDir, 'dist');
const files = ['index.html', 'style.css', 'app.js', 'game.js'];

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(projectDir, file), path.join(outputDir, file));
}
fs.cpSync(path.join(projectDir, 'assets'), path.join(outputDir, 'assets'), { recursive: true });
console.log(`Built static game into ${outputDir}`);
