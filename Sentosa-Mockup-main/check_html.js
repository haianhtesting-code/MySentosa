const http = require('http');

http.get('http://localhost:3000/admin/nop-config', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('HTML length:', data.length);
    console.log('Contains Primary Approver:', data.includes('Primary Approver'));
    console.log('Contains Standard SLA:', data.includes('Standard SLA'));
    console.log('Contains Urgent SLA:', data.includes('Urgent SLA'));
    console.log('Contains Department Code:', data.includes('Department Code'));
    console.log('Contains Or Add All Users:', data.includes('Or Add All Users'));
    console.log('Contains APPROVER GROUPS:', data.includes('APPROVER GROUPS'));
    console.log('Contains STATUTORY APPROVAL MATRIX:', data.includes('STATUTORY APPROVAL MATRIX'));
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
