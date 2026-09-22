const assert = require('assert');

console.log('\n🧪 HunzWeb-O51W - Basic Tests\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('📁 Config Module');
test('config module loadable', () => {
  const config = require('../config');
  assert(config, 'Config harus return object');
});
test('config has app name HunzWeb-O51W', () => {
  const config = require('../config');
  assert(config.app.name === 'HunzWeb-O51W', 'App name harus HunzWeb-O51W');
});
test('config has AI name HunzAI-O51W', () => {
  const config = require('../config');
  assert(config.ai.name === 'HunzAI-O51W', 'AI name harus HunzAI-O51W');
});

console.log('\n🤖 HunzAI Service Module');
test('ai-service loadable', () => {
  const AI = require('../services/ai-service');
  assert(typeof AI === 'function', 'HunzAIService harus class');
});
test('ai-service fallback reply works', () => {
  const AI = require('../services/ai-service');
  const ai = new AI();
  const result = ai.fallbackReply('halo');
  assert(result.text, 'Harus return text');
});
test('ai-service name is HunzAI-O51W', () => {
  const AI = require('../services/ai-service');
  const ai = new AI();
  assert(ai.name === 'HunzAI-O51W', 'AI name harus HunzAI-O51W');
});

console.log('\n📱 WA Service Module');
test('wa-service loadable', () => {
  const WA = require('../services/wa-service');
  assert(typeof WA === 'function', 'WAService harus class');
});

console.log('\n🛣  API Routes Module');
test('api routes loadable', () => {
  const routes = require('../routes/api');
  assert(typeof routes === 'function', 'apiRoutes harus function');
});

console.log('');
console.log('─'.repeat(50));
console.log(`  Total: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
console.log('─'.repeat(50));
console.log('');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Semua test berhasil!\n');
  process.exit(0);
     }
