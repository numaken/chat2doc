const fs = require('fs');

const content = fs.readFileSync('debug_test_content.txt', 'utf8');
const payload = JSON.stringify({
  conversationText: content
});

fs.writeFileSync('debug_payload.json', payload);
console.log('Payload created with', content.length, 'characters');