import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAdminTokenGrants, redeemTuneTokenCode} from '../src/storeCodes.js';

test('code 69358 adds 1,000 Tune Tokens and persists as redeemed',()=>{
  const initial={balance:15,ownedColors:['white'],redeemedCodes:[]};
  const result=redeemTuneTokenCode(initial,'69358');

  assert.equal(result.status,'redeemed');
  assert.equal(result.tokens,1000);
  assert.equal(result.store.balance,1015);
  assert.deepEqual(result.store.redeemedCodes,['69358']);
  assert.equal(initial.balance,15);
});

test('a redeemed code cannot be redeemed twice on the same device',()=>{
  const result=redeemTuneTokenCode({balance:1000,redeemedCodes:['69358']},'69358');
  assert.deepEqual(result,{status:'already-redeemed',tokens:0});
});

test('unknown and malformed codes do not change the stored balance',()=>{
  for(const code of ['12345','6935','693580','abcde','']){
    const result=redeemTuneTokenCode({balance:7,redeemedCodes:[]},code);
    assert.deepEqual(result,{status:'invalid',tokens:0});
  }
});

test('redemption safely initializes a missing or malformed balance',()=>{
  const result=redeemTuneTokenCode({balance:'not-a-number',redeemedCodes:null},'69358');
  assert.equal(result.status,'redeemed');
  assert.equal(result.store.balance,1000);
  assert.deepEqual(result.store.redeemedCodes,['69358']);
});

test('server token grants add 5,000 once per saved device grant ID',()=>{
  const store={balance:20,appliedAdminGrantIds:['prior-grant']};
  const grants=[
    {id:'prior-grant',tokens:5000},
    {id:'new-grant',tokens:5000},
    {id:'invalid-grant',tokens:1000},
  ];
  const first=applyAdminTokenGrants(store,grants);
  const repeated=applyAdminTokenGrants(first,grants);

  assert.equal(first.balance,5020);
  assert.deepEqual(first.appliedAdminGrantIds,['prior-grant','new-grant']);
  assert.equal(repeated.balance,5020);
});
