const CSV_FILE = "data/pension_callcenter_20221231.csv";

const state = {
  rows: [],
  filtered: [],
  topN: 10,
};

const elements = {
  yearFilter: document.getElementById("yearFilter"),
  typeFilter: document.getElementById("typeFilter"),
  topN: document.getElementById("topN"),
  topNValue: document.getElementById("topNValue"),
  kpiTotal: document.getElementById("kpiTotal"),
  kpiRows: document.getElementById("kpiRows"),
  kpiTypes: document.getElementById("kpiTypes"),
  kpiSubTypes: document.getElementById("kpiSubTypes"),
  yearBars: document.getElementById("yearBars"),
  typeBars: document.getElementById("typeBars"),
  classBars: document.getElementById("classBars"),
  subtypeTable: document.getElementById("subtypeTable"),
  status: document.getElementById("status"),
};

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += char;
    }
  }

  cells.push(cur);
  return cells;
}

function parseCsvText(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const item = {};

    headers.forEach((header, idx) => {
      item[header] = (cells[idx] ?? "").trim();
    });

    item.상담건수 = Number(item.상담건수 || 0);
    return item;
  });
}

async function loadRows() {
  const response = await fetch(encodeURI(CSV_FILE));
  if (!response.ok) {
    throw new Error(`CSV 요청 실패 (${response.status})`);
  }

  const buf = await response.arrayBuffer();
  let text;

  try {
    text = new TextDecoder("utf-8").decode(buf);
  } catch {
    text = new TextDecoder("euc-kr").decode(buf);
  }

  return parseCsvText(text);
}

function formatNumber(n) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function makeGroupSum(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const groupKey = row[key];
    const prev = map.get(groupKey) ?? 0;
    map.set(groupKey, prev + row.상담건수);
  });

  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function setStatus(text, isError = false) {
  elements.status.textContent = text;
  elements.status.style.color = isError ? "#ffc5c5" : "";
}

function populateFilters(rows) {
  const years = [...new Set(rows.map((r) => r.연도))].sort();
  const types = [...new Set(rows.map((r) => r.상담유형))].sort((a, b) => a.localeCompare(b, "ko"));

  elements.yearFilter.innerHTML = ['<option value="전체">전체</option>']
    .concat(years.map((y) => `<option value="${y}">${y}</option>`))
    .join("");

  elements.typeFilter.innerHTML = ['<option value="전체">전체</option>']
    .concat(types.map((t) => `<option value="${t}">${t}</option>`))
    .join("");
}

function applyFilters() {
  const year = elements.yearFilter.value;
  const type = elements.typeFilter.value;

  state.filtered = state.rows.filter((row) => {
    const yearOk = year === "전체" || row.연도 === year;
    const typeOk = type === "전체" || row.상담유형 === type;
    return yearOk && typeOk;
  });
}

function renderBars(target, items, topN) {
  target.innerHTML = "";
  if (items.length === 0) {
    target.innerHTML = '<p class="status">표시할 데이터가 없습니다.</p>';
    return;
  }

  const sliced = items.slice(0, topN);
  const max = sliced[0].value || 1;

  sliced.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const pct = (item.value / max) * 100;
    row.innerHTML = `
      <div class="bar-meta">
        <span class="bar-label">${item.name}</span>
        <span class="bar-value">${formatNumber(item.value)}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct.toFixed(2)}%"></div>
      </div>
    `;
    target.appendChild(row);
  });
}

function renderSubtypeTable(subtypes, topN) {
  elements.subtypeTable.innerHTML = "";

  const sliced = subtypes.slice(0, topN);
  if (sliced.length === 0) {
    elements.subtypeTable.innerHTML = '<tr><td colspan="3">표시할 데이터가 없습니다.</td></tr>';
    return;
  }

  sliced.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.name}</td>
      <td>${formatNumber(row.value)}</td>
    `;
    elements.subtypeTable.appendChild(tr);
  });
}

function renderKpis(rows) {
  const totalCalls = rows.reduce((sum, row) => sum + row.상담건수, 0);
  const typeCount = new Set(rows.map((r) => r.상담유형)).size;
  const subTypeCount = new Set(rows.map((r) => r.상담세분류)).size;

  elements.kpiTotal.textContent = formatNumber(totalCalls);
  elements.kpiRows.textContent = formatNumber(rows.length);
  elements.kpiTypes.textContent = formatNumber(typeCount);
  elements.kpiSubTypes.textContent = formatNumber(subTypeCount);
}

function render() {
  applyFilters();
  const rows = state.filtered;
  const topN = state.topN;

  renderKpis(rows);

  const byYear = makeGroupSum(rows, "연도").sort((a, b) => a.name.localeCompare(b.name));
  const byType = makeGroupSum(rows, "상담유형");
  const byClass = makeGroupSum(rows, "상담분류");
  const bySubtype = makeGroupSum(rows, "상담세분류");

  renderBars(elements.yearBars, byYear, byYear.length);
  renderBars(elements.typeBars, byType, topN);
  renderBars(elements.classBars, byClass, topN);
  renderSubtypeTable(bySubtype, topN);

  const yearTxt = elements.yearFilter.value;
  const typeTxt = elements.typeFilter.value;
  setStatus(`필터: 연도 ${yearTxt}, 상담유형 ${typeTxt} | 표시 레코드 ${formatNumber(rows.length)}건`);
}

function bindEvents() {
  elements.yearFilter.addEventListener("change", render);
  elements.typeFilter.addEventListener("change", render);
  elements.topN.addEventListener("input", () => {
    state.topN = Number(elements.topN.value);
    elements.topNValue.textContent = String(state.topN);
    render();
  });
}

async function init() {
  try {
    state.rows = await loadRows();
    if (state.rows.length === 0) {
      setStatus("CSV 데이터가 비어 있습니다.", true);
      return;
    }

    populateFilters(state.rows);
    bindEvents();
    render();
  } catch (error) {
    setStatus(`데이터 로드 실패: ${error.message}`, true);
  }
}

init();


