const fmtMoney = n => {
    if (!Number.isFinite(Number(n))) return '—';
    n = Number(n);
    return '₫ ' + (Math.abs(n) >= 1e9 ? (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + 'B' : (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'M');
};
const fmtFull = n => Number.isFinite(Number(n)) ? '₫ ' + Math.round(Number(n)).toLocaleString('vi-VN') : '—';
const fmtPct = n => (n >= 0 ? '+' : '−') + Math.abs(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
const markets = {
    all: { factor: 1, revenue: 1280000000, cost: 851400000, orders: 2486, growth: 12.4, costGrowth: 4.2, profitGrowth: 18.6, orderGrowth: 8.7 },
    jp: { factor: .59, revenue: 755200000, cost: 492600000, orders: 1421, growth: 15.8, costGrowth: 3.1, profitGrowth: 23.4, orderGrowth: 11.2 },
    id: { factor: .19, revenue: 243200000, cost: 168500000, orders: 527, growth: 9.3, costGrowth: 5.8, profitGrowth: 12.1, orderGrowth: 7.6 },
    mm: { factor: .12, revenue: 153600000, cost: 107400000, orders: 336, growth: 7.2, costGrowth: 6.4, profitGrowth: 8.9, orderGrowth: 5.1 },
    vn: { factor: .10, revenue: 128000000, cost: 82900000, orders: 202, growth: 11.1, costGrowth: 2.4, profitGrowth: 20.3, orderGrowth: 9.4 }
};
const marketNames = { all: 'Tất cả thị trường', jp: 'Nhật Bản', id: 'Indonesia', mm: 'Myanmar', vn: 'Việt Nam' };
const periods = {
    month: { label: 'Tháng 10, 2026', labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], table: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], revenue: [286, 315, 342, 337], profit: [91, 102, 117, 118] },
    quarter: { label: 'Quý III, 2026', labels: ['Tháng 07', 'Tháng 08', 'Tháng 09'], table: ['Tháng 07, 2026', 'Tháng 08, 2026', 'Tháng 09, 2026'], revenue: [365, 410, 505], profit: [108, 129, 169] },
    year: { label: 'Năm 2026', labels: ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10', 'T11', 'T12'], table: ['Tháng 01, 2026', 'Tháng 02, 2026', 'Tháng 03, 2026', 'Tháng 04, 2026', 'Tháng 05, 2026', 'Tháng 06, 2026', 'Tháng 07, 2026', 'Tháng 08, 2026', 'Tháng 09, 2026', 'Tháng 10, 2026', 'Tháng 11, 2026', 'Tháng 12, 2026'], revenue: [820, 890, 950, 1010, 1080, 990, 1150, 1200, 1320, 1280, 1420, 1550], profit: [240, 265, 280, 310, 330, 290, 350, 365, 405, 390, 440, 480] }
};
let activeMarket = 'all', activePeriod = 'month', activeMetric = 'revenue', selectedMonth = 10, selectedQuarter = 3, selectedYear = 2026, chart;
const el = id => document.getElementById(id);
function getPeriodConfig() {
    const base = periods[activePeriod];
    if (activePeriod === 'month') return { ...base, label: `Tháng ${String(selectedMonth).padStart(2, '0')}, ${selectedYear}`, labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], table: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] };
    if (activePeriod === 'quarter') {
        const first = (selectedQuarter - 1) * 3 + 1;
        const names = Array.from({ length: 3 }, (_, i) => `Tháng ${String(first + i).padStart(2, '0')}`);
        return { ...base, label: `Quý ${['I', 'II', 'III', 'IV'][selectedQuarter - 1]}, ${selectedYear}`, labels: names, table: names.map(x => `${x}, ${selectedYear}`) };
    }
    return { ...base, label: `Năm ${selectedYear}`, table: base.table.map((_, i) => `Tháng ${String(i + 1).padStart(2, '0')}, ${selectedYear}`) };
}
function updateDateOptions() {
    const sel = el('dateFilter'), label = el('dateFilterLabel');
    if (activePeriod === 'month') {
        label.textContent = 'CHỌN THÁNG';
        sel.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${String(i + 1).padStart(2, '0')}</option>`).join('') + `<option value="year:${selectedYear}">Năm ${selectedYear}</option>`;
        sel.value = String(selectedMonth);
    } else if (activePeriod === 'quarter') {
        label.textContent = 'CHỌN QUÝ';
        sel.innerHTML = Array.from({ length: 4 }, (_, i) => `<option value="${i + 1}">Quý ${['I', 'II', 'III', 'IV'][i]}</option>`).join('');
        sel.value = String(selectedQuarter);
    } else {
        label.textContent = 'CHỌN NĂM';
        sel.innerHTML = Array.from({ length: 8 }, (_, i) => `<option value="${2026 - i}">${2026 - i}</option>`).join('');
        sel.value = String(selectedYear);
    }
}
function makeTrend(values) { return values.map((_, i) => values[0] + (values[values.length - 1] - values[0]) * i / (values.length - 1 || 1)); }
function trendHTML(n) { return `<span class="growth ${n >= 0 ? 'positive' : 'negative'}">${n >= 0 ? '↗' : '↘'} ${fmtPct(n)}</span>`; }
function renderBars(id, seed = 1) { let values = [16, 24, 19, 30, 26, 35, 29, 42].map((v, i) => Math.max(6, v + ((seed * i) % 9) - 4)); el(id).innerHTML = values.map(v => `<i style="height:${v}px"></i>`).join(''); }
function makeRevenueTable(cfg, market) {
    const vals = cfg.revenue.map(v => v * market.factor * 1000000);
    const growths = vals.map((v, i) => i === 0 ? market.growth : ((v - vals[i - 1]) / Math.max(vals[i - 1], 1)) * 100);
    const max = Math.max(...vals);
    el('revenueTable').innerHTML = cfg.table.map((label, i) => `<tr><td class="table-date">${label}</td><td class="money-cell">${fmtFull(vals[i])}</td><td>${i === 0 ? '—' : `${growths[i] >= 0 ? 'Tăng' : 'Giảm'} ${Math.abs(growths[i]).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% so với kỳ trước`}</td><td>${i === 0 ? '<span style="color:#9aa49d">—</span>' : trendHTML(growths[i])}</td></tr>`).join('');
    el('tableCount').textContent = `Hiển thị ${cfg.table.length} ${activePeriod === 'month' ? 'tuần' : activePeriod === 'quarter' ? 'tháng' : 'tháng'} trong ${cfg.label}`;
}
function renderSales(market) {
    const people = [
        { name: 'Nguyễn Minh Anh', role: 'Senior Sales', initial: 'MA', market: 'Nhật Bản', orders: 428, revenue: 226400000, commission: 15848000 },
        { name: 'Trần Quốc Bảo', role: 'Sales Executive', initial: 'QB', market: 'Nhật Bản', orders: 362, revenue: 184800000, commission: 12936000 },
        { name: 'Lê Thảo My', role: 'Sales Executive', initial: 'TM', market: 'Indonesia', orders: 296, revenue: 148200000, commission: 10374000 },
        { name: 'Phạm Gia Huy', role: 'Sales Executive', initial: 'GH', market: 'Việt Nam', orders: 251, revenue: 126500000, commission: 8855000 },
        { name: 'Aung Min Thant', role: 'Sales Executive', initial: 'AM', market: 'Myanmar', orders: 218, revenue: 108900000, commission: 7623000 }
    ];
    const marketLabel = { jp: 'Nhật Bản', id: 'Indonesia', mm: 'Myanmar', vn: 'Việt Nam' };
    const filtered = market === 'all' ? people : people.filter(p => p.market === marketLabel[market]);
    const show = filtered.length ? filtered : people.slice(0, 3);
    const factor = market === 'all' ? 1 : markets[market].factor * 1.7;
    el('salesTable').innerHTML = show.map((p, i) => { let f = market === 'all' ? 1 : factor; return `<tr><td><div class="employee"><div class="employee-avatar" style="background:${['#eaf3ec', '#f8eee6', '#eeeafd', '#e7f0fd', '#f9e9eb'][i % 5]};color:${['#4d8566', '#bb8659', '#8065b5', '#527bb8', '#ba6a73'][i % 5]}">${p.initial}</div><div><div class="employee-name">${p.name}</div><div class="employee-role">${p.role}</div></div></div></td><td><span class="market-chip">${p.market}</span></td><td>${Math.round(p.orders * f).toLocaleString('vi-VN')}</td><td class="money-cell">${fmtFull(p.revenue * f)}</td><td class="commission">${fmtFull(p.commission * f)}</td></tr>` }).join('');
}
function render() {
    const m = markets[activeMarket], cfg = getPeriodConfig();
    el('periodLabel').textContent = cfg.label;
    el('profitTrend').textContent = '↗ ' + m.profitGrowth.toLocaleString('vi-VN') + '%'; el('revenueTrend').textContent = '↗ ' + m.growth.toLocaleString('vi-VN') + '%'; el('costTrend').textContent = (m.costGrowth >= 0 ? '↗ ' : '↘ ') + Math.abs(m.costGrowth).toLocaleString('vi-VN') + '%'; el('ordersTrend').textContent = '↗ ' + m.orderGrowth.toLocaleString('vi-VN') + '%';
    // KPI totals are aligned with the selected chart/table period.
    const periodRevenue = cfg.revenue.reduce((sum, v) => sum + v, 0) * m.factor * 1000000;
    const kRevenue = periodRevenue;
    const kCost = kRevenue * (m.cost / m.revenue);
    const kProfit = kRevenue - kCost;
    const kOrders = Math.round(m.orders * (kRevenue / m.revenue));
    el('revenueValue').textContent = fmtMoney(kRevenue); el('costValue').textContent = fmtMoney(kCost); el('profitValue').textContent = fmtMoney(kProfit); el('ordersValue').textContent = kOrders.toLocaleString('vi-VN');
    const values = cfg[activeMetric].map(v => v * m.factor);
    const trend = makeTrend(values), min = Math.min(...values), max = Math.max(...values), avg = values.reduce((a, b) => a + b, 0) / values.length;
    el('chartMax').textContent = fmtMoney(max * 1000000); el('chartAvg').textContent = fmtMoney(avg * 1000000); el('chartMin').textContent = fmtMoney(min * 1000000);
    el('highlightMax').textContent = fmtMoney(max * 1000000); el('highlightMonth').innerHTML = `${cfg.labels[values.indexOf(max)]} <span>▲ ${m.growth.toLocaleString('vi-VN')}%</span>`;
    el('bestGrowth').textContent = '+' + (m.growth + 12.4).toLocaleString('vi-VN') + '%'; el('bestGrowthLabel').textContent = `${cfg.labels[values.indexOf(max)]} so với kỳ trước`; el('worstDrop').textContent = '−' + (8.2 + (activeMarket === 'all' ? 0 : 1.1)).toLocaleString('vi-VN') + '%'; el('worstDropLabel').textContent = `${cfg.labels[Math.min(1, cfg.labels.length - 1)]} so với kỳ trước`;
    if (chart) chart.destroy();
    const ctx = el('revenueChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 250); gradient.addColorStop(0, 'rgba(35,145,99,.20)'); gradient.addColorStop(1, 'rgba(35,145,99,0)');
    chart = new Chart(ctx, { type: 'line', data: { labels: cfg.labels, datasets: [{ label: activeMetric === 'revenue' ? 'Doanh thu' : 'Lợi nhuận', data: values, fill: true, backgroundColor: gradient, borderColor: '#20885f', borderWidth: 2.5, tension: .38, pointRadius: values.map(v => (v === max || v === min) ? 4 : 2), pointHoverRadius: 5, pointBackgroundColor: values.map(v => v === max ? '#16885d' : v === min ? '#e2a365' : '#fff'), pointBorderColor: values.map(v => v === max ? '#16885d' : v === min ? '#e2a365' : '#20885f'), pointBorderWidth: 2 }, { label: 'Xu hướng', data: trend, borderColor: '#e2a365', borderWidth: 2, borderDash: [5, 5], tension: .35, pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#173f30', padding: 11, callbacks: { label: c => `${c.dataset.label}: ${fmtMoney(c.raw * 1000000)}` } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#849188', font: { family: 'DM Sans', size: 11 }, maxRotation: 0 } }, y: { beginAtZero: false, grid: { color: '#eff2f0', drawTicks: false }, border: { display: false, dash: [3, 4] }, ticks: { color: '#849188', font: { family: 'DM Sans', size: 11 }, padding: 9, callback: v => Math.round(v) + 'M' } } } } });
    makeRevenueTable(cfg, m); renderSales(activeMarket); renderBars('revenueBars', 2); renderBars('costBars', 4); renderBars('ordersBars', 3);
}
document.querySelectorAll('#marketFilter button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('#marketFilter button').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); activeMarket = b.dataset.market; render(); }));
document.querySelectorAll('#periodFilter button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('#periodFilter button').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); activePeriod = b.dataset.period; updateDateOptions(); render(); }));
el('dateFilter').addEventListener('change', e => { const v = e.target.value; if (activePeriod === 'month') { if (v.startsWith('year:')) selectedYear = Number(v.split(':')[1]); else selectedMonth = Number(v); } else if (activePeriod === 'quarter') selectedQuarter = Number(v); else selectedYear = Number(v); render(); });
document.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('[data-chart]').forEach(x => x.classList.remove('active')); b.classList.add('active'); activeMetric = b.dataset.chart; render(); }));
function csvDownload(filename, rows) { const blob = new Blob(['\ufeff' + rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); showToast('Đã xuất file CSV'); }
function showToast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2300); }
el('tableExport').addEventListener('click', () => { const rows = [['Thời gian', 'Doanh thu', 'So với kỳ trước', 'Tăng trưởng'], ...Array.from(el('revenueTable').rows).map(r => Array.from(r.cells).map(c => c.innerText))]; csvDownload('chi-tiet-doanh-thu-demo.csv', rows); });
el('salesExport').addEventListener('click', () => { const rows = [['Nhân viên', 'Thị trường', 'Đơn thành công', 'Doanh thu', 'Hoa hồng'], ...Array.from(el('salesTable').rows).map(r => Array.from(r.cells).map(c => c.innerText.replace(/\n/g, ' ')))]; csvDownload('top-nhan-vien-demo.csv', rows); });
el('exportBtn').addEventListener('click', () => csvDownload('bao-cao-doanh-thu-demo.csv', [['Chỉ số', 'Giá trị'], ['Thị trường', marketNames[activeMarket]], ['Kỳ', getPeriodConfig().label], ['Doanh thu', el('revenueValue').textContent], ['Chi phí', el('costValue').textContent], ['Lợi nhuận', el('profitValue').textContent], ['Tổng đơn', el('ordersValue').textContent]]));
updateDateOptions(); render();