const http = require('http');
http.get('http://localhost:3002', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
