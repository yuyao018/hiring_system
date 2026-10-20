const fs = require('fs');
const path = require('path');

// @emotion/hash uses this MurmurHash2 mixing constant. CRA/Terser prints it
// as a decimal integer, which ZAP misidentifies as a Unix timestamp. Keep the
// same numeric value in its source-equivalent hexadecimal notation.
const bundlesPath = path.join(__dirname, '..', 'build', 'static', 'js');
const constant = /(?<![\w$])1540483477(?![\w$])/g;

for (const filename of fs.readdirSync(bundlesPath).filter(name => name.endsWith('.js'))) {
  const filePath = path.join(bundlesPath, filename);
  const source = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;
  const updated = source.replace(constant, () => {
    replacements += 1;
    return '0x5bd1e995';
  });

  if (replacements > 0) {
    fs.writeFileSync(filePath, updated);
    console.log(`Preserved ${replacements} MurmurHash2 constant(s) in hexadecimal in ${filename}.`);
  }
}
