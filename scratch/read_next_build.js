const fs = require('fs');
const path = require('path');

const dir = 'node_modules/next/dist/cli';
if (fs.existsSync(dir)) {
  console.log(fs.readdirSync(dir));
} else {
  console.log('cli dir does not exist');
}
