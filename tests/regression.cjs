const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { calculateFeeroi } = require('../calculator.js');
const base = { sell: 29900, cost: 12000, ship: 3000, ad: 2500, feePct: 5.8, units: 200 };
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
check('default contribution and monthly total', () => {
  const actual = calculateFeeroi(base);
  assert.equal(actual.fee, 1734.2);
  assert.equal(actual.profit, 10665.8);
  assert.equal(actual.month, 2133160);
});
check('zero advertising is undefined multiple, never infinity', () => assert.equal(calculateFeeroi({ ...base, ad: 0 }).multiple, null));
check('negative pre-ad contribution cannot break even at zero advertising', () => assert.equal(calculateFeeroi({ ...base, sell: 1000 }).breakEvenAd, null));
check('zero sales volume produces zero monthly amount', () => assert.equal(calculateFeeroi({ ...base, units: 0 }).month, 0));
check('exact break-even yields multiple one and zero profit', () => {
  const before = calculateFeeroi(base).beforeAd;
  const result = calculateFeeroi({ ...base, ad: before });
  assert.equal(result.multiple, 1);
  assert.equal(result.profit, 0);
});
for (const [key, value] of [['sell', -1], ['cost', Infinity], ['ship', ''], ['ad', NaN], ['feePct', 100.1], ['feePct', -0.1], ['units', 1.5], ['units', 1000001], ['sell', 1e20]]) {
  check('reject invalid ' + key + ':' + value, () => assert.throws(() => calculateFeeroi({ ...base, [key]: value }), RangeError));
}
const elements = new Map();
function element(id) {
  return { id, value: '', textContent: '', className: '', children: [], listeners: {}, attrs: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeAttribute(name) { delete this.attrs[name]; }, setAttribute(name, value) { this.attrs[name] = value; },
    replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
    set innerHTML(_) { throw new Error('HTML sink used'); }
  };
}
for (const id of [...Object.keys(base), 'platform', 'calcError', 'feeAmt', 'perProfit', 'adRoi', 'beAd', 'kpiProfit', 'kpiRoi', 'rows', 'summary']) elements.set(id, element(id));
for (const [id, value] of Object.entries(base)) elements.get(id).value = String(value);
const context = { document: { getElementById: (id) => elements.get(id), createElement: (tag) => element(tag) } };
vm.runInNewContext(readFileSync(require.resolve('../calculator.js'), 'utf8'), context);
check('initial render calculates safe table rows', () => assert.equal(elements.get('rows').children.length, 6));
check('manual fee edits select custom channel', () => {
  elements.get('feePct').value = '7';
  elements.get('feePct').listeners.input();
  assert.equal(elements.get('platform').value, 'custom');
});
check('invalid input clears stale results and table', () => {
  elements.get('sell').value = '-1';
  elements.get('sell').listeners.input();
  assert.equal(elements.get('perProfit').textContent, '—');
  assert.equal(elements.get('rows').children.length, 0);
  assert.ok(elements.get('calcError').textContent);
});
check('valid correction restores calculation', () => {
  elements.get('sell').value = '29900';
  elements.get('sell').listeners.input();
  assert.equal(elements.get('calcError').textContent, '');
  assert.equal(elements.get('rows').children.length, 6);
});
console.log(`${checks} regression checks passed.`);
