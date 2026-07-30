const test = require('node:test');
const assert = require('node:assert/strict');
process.env.VERIFY_MN_API_KEY = 'test-key-not-real';
const { verifyPhone } = require('../api/_lib/verifyMn');

function response(status, body) { return { ok: status >= 200 && status < 300, status, json: async () => body }; }

test('PENDING transitions to VERIFIED', async () => {
  let checks = 0;
  const fetchImpl = async (url, init) => init?.method === 'POST'
    ? response(200, { sessionId:'s1', expiresAt:new Date(Date.now()+60000).toISOString(), smsUri:'sms:144773?body=0042' })
    : response(200, { sessionStatus: ++checks === 1 ? 'PENDING' : 'VERIFIED' });
  assert.equal(await verifyPhone('99112233', { fetchImpl, sleep:async()=>{}, pollIntervalMs:1 }), true);
  assert.equal(checks, 2);
});

test('EXPIRED returns false', async () => {
  const fetchImpl = async (url, init) => init?.method === 'POST'
    ? response(200, { sessionId:'s2', expiresAt:new Date(Date.now()+60000).toISOString() })
    : response(200, { sessionStatus:'EXPIRED' });
  assert.equal(await verifyPhone('99112233', { fetchImpl, sleep:async()=>{} }), false);
});

test('401 bad API key response returns false', async () => {
  const fetchImpl = async () => response(401, { error:'Unauthorized' });
  assert.equal(await verifyPhone('99112233', { fetchImpl }), false);
});
