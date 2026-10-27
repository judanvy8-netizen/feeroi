'use strict';

function calculateFeeroi(values) {
  const limits = { sell: 1e9, cost: 1e9, ship: 1e9, ad: 1e9, feePct: 100, units: 1e6 };
  const input = {};
  for (const [key, max] of Object.entries(limits)) {
    const raw = values[key];
    const value = Number(raw);
    if (raw === '' || raw == null || !Number.isFinite(value) || value < 0 || value > max || (key === 'units' && !Number.isInteger(value))) {
      throw new RangeError(key);
    }
    input[key] = value;
  }
  const fee = input.sell * input.feePct / 100;
  const beforeAd = input.sell - input.cost - input.ship - fee;
  const profit = beforeAd - input.ad;
  return { ...input, fee, beforeAd, profit, multiple: input.ad > 0 ? beforeAd / input.ad : null, breakEvenAd: beforeAd >= 0 ? beforeAd : null, month: profit * input.units };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { calculateFeeroi };

if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const won = (value) => Math.round(value).toLocaleString('ko-KR') + '원';
  const ids = ['sell', 'cost', 'ship', 'ad', 'feePct', 'units'];
  const labels = { sell: '판매가', cost: '매입 원가', ship: '배송·부자재', ad: '광고비', feePct: '수수료율', units: '월 판매 수량' };
  function calc() {
    ids.forEach((id) => $(id).removeAttribute('aria-invalid'));
    let result;
    try {
      result = calculateFeeroi(Object.fromEntries(ids.map((id) => [id, $(id).value])));
    } catch (error) {
      const id = error.message;
      if (ids.includes(id)) $(id).setAttribute('aria-invalid', 'true');
      $('calcError').textContent = `${labels[id] || '입력값'}을 확인해 주세요. 금액은 0~10억 원, 수수료율은 0~100%, 수량은 0~100만의 정수로 입력하세요.`;
      ['feeAmt', 'perProfit', 'adRoi', 'beAd'].forEach((key) => $(key).textContent = '—');
      $('kpiProfit').className = 'kpi';
      $('kpiRoi').className = 'kpi';
      $('rows').replaceChildren();
      $('summary').textContent = '입력값을 수정하면 결과가 표시됩니다.';
      return;
    }
    $('calcError').textContent = '';
    const { sell, cost, ship, ad, fee, units, beforeAd, profit, multiple, breakEvenAd, month } = result;
    $('feeAmt').textContent = won(fee);
    $('perProfit').textContent = won(profit);
    $('adRoi').textContent = multiple === null ? '해당 없음' : multiple.toFixed(2) + 'x';
    $('beAd').textContent = breakEvenAd === null ? '달성 불가' : won(breakEvenAd);
    $('kpiProfit').className = 'kpi ' + (profit >= 0 ? 'ok' : 'bad');
    $('kpiRoi').className = multiple === null ? 'kpi' : 'kpi ' + (multiple >= 2 ? 'ok' : multiple >= 1 ? 'warn' : 'bad');
    const rows = [
      ['판매가', sell], ['매입 원가', -cost], ['배송·부자재', -ship],
      ['플랫폼 수수료', -fee], ['광고비', -ad], ['월 추정 공헌이익 (' + units + '건)', month],
    ];
    $('rows').replaceChildren(...rows.map(([label, value]) => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = label;
      const amount = document.createElement('td');
      amount.className = 'num';
      amount.textContent = won(value);
      row.append(name, amount);
      return row;
    }));
    $('summary').textContent = beforeAd < 0
      ? `광고비를 0원으로 내려도 건당 ${won(-beforeAd)} 적자입니다. 판매가·원가·배송비·수수료를 조정해야 손익분기에 도달할 수 있습니다.`
      : profit >= 0
        ? `현재 설정에서는 건당 ${won(profit)} 남고, 월 ${units}건 기준 공헌이익은 약 ${won(month)}입니다. 건당 손익분기 광고비는 ${won(breakEvenAd)}입니다.`
        : `현재는 건당 ${won(-profit)} 적자입니다. 광고비를 ${won(breakEvenAd)} 이하로 낮추면 입력한 비용 기준으로 손익분기에 도달할 수 있습니다.`;
  }
  $('platform').addEventListener('change', () => {
    if ($('platform').value !== 'custom') $('feePct').value = (Number($('platform').value) * 100).toFixed(1);
    calc();
  });
  ids.forEach((id) => $(id).addEventListener('input', () => {
    if (id === 'feePct') $('platform').value = 'custom';
    calc();
  }));
  calc();
}
