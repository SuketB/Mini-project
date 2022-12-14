const lineReader = require('line-reader');

lineReader.eachLine('../logger.txt', function(line, last) {
  console.log(`Line from file: ${line}`);
  if(last) {
    console.log('Last line printed.');
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
  }
});