// ============================================
// Dashboard — entries CRUD + stats + insights
// ============================================

let currentUser = null;
let entries = [];
let chartInstance = null;

const CATEGORY_TIPS = {
  'Grains & Cereals': 'Cook grains in smaller batches — they\'re the easiest thing to over-prepare.',
  'Vegetables': 'Buy vegetables more often in smaller amounts, or freeze surplus before it turns.',
  'Fruits': 'Keep a "eat me first" basket for fruit that\'s ripening fastest.',
  'Dairy & Eggs': 'Check dairy dates weekly and use older stock first (FIFO).',
  'Meat & Fish': 'Portion and freeze meat/fish in meal-sized packs right after buying.',
  'Cooked / Leftovers': 'Cook smaller batches, or set a fixed "leftovers night" each week.',
  'Bakery': 'Buy smaller loaves, or freeze extra slices instead of letting them go stale.',
  'Other': 'Add more detail on these entries to spot a clearer pattern.'
};

const REASON_TIPS = {
  'Cooked too much': 'Try measuring portions before cooking — a kitchen scale makes this easy.',
  'Crossed expiry': 'Move older items to the front of the fridge/pantry so they get used first.',
  'Leftover from meal': 'Start with smaller first portions — seconds are easy, plate waste isn\'t.',
  'Spoiled / improperly stored': 'Check storage — airtight containers and correct fridge temps extend shelf life.',
  "Didn't like it": 'Try a small taste-test portion before committing to a full serving.',
  'Other': 'Add more detail next time to help spot a pattern.'
};

const els = {
  who: document.getElementById('who-text'),
  logout: document.getElementById('logout-btn'),
  form: document.getElementById('entry-form'),
  item: document.getElementById('f-item'),
  qty: document.getElementById('f-qty'),
  unit: document.getElementById('f-unit'),
  cat: document.getElementById('f-cat'),
  reason: document.getElementById('f-reason'),
  date: document.getElementById('f-date'),
  ledgerBody: document.getElementById('ledger-body'),
  insightsList: document.getElementById('insights-list'),
  statTotal: document.getElementById('stat-total'),
  statWeek: document.getElementById('stat-week'),
  statCat: document.getElementById('stat-cat'),
  statReason: document.getElementById('stat-reason'),
  chartCanvas: document.getElementById('cat-chart'),
};

// Default date field to today
els.date.value = new Date().toISOString().slice(0, 10);

// ---------- Auth guard ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  els.who.textContent = user.displayName || user.email;
  listenToEntries();
});

els.logout.addEventListener('click', () => auth.signOut());

// ---------- Firestore: live entries ----------
function listenToEntries() {
  db.collection('users').doc(currentUser.uid).collection('entries')
    .orderBy('date', 'desc')
    .onSnapshot((snapshot) => {
      entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderLedger();
      renderStats();
      renderChart();
      renderInsights();
    }, (err) => {
      console.error('Firestore listen error:', err);
      els.ledgerBody.innerHTML = `<div class="ledger-empty">Couldn't load entries — check your Firebase config in js/firebase-config.js</div>`;
    });
}

// ---------- Add entry ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = {
    item: els.item.value.trim(),
    quantity: parseFloat(els.qty.value),
    unit: els.unit.value,
    category: els.cat.value,
    reason: els.reason.value,
    date: els.date.value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  if (!entry.item || isNaN(entry.quantity)) return;

  try {
    await db.collection('users').doc(currentUser.uid).collection('entries').add(entry);
    els.form.reset();
    els.date.value = new Date().toISOString().slice(0, 10);
  } catch (err) {
    console.error('Add entry error:', err);
    alert('Could not save entry — check your Firebase config / Firestore rules.');
  }
});

// ---------- Delete entry ----------
async function deleteEntry(id) {
  try {
    await db.collection('users').doc(currentUser.uid).collection('entries').doc(id).delete();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// ---------- Render: ledger ----------
function renderLedger() {
  if (entries.length === 0) {
    els.ledgerBody.innerHTML = `<div class="ledger-empty">No entries yet — add your first one on the left.</div>`;
    return;
  }
  els.ledgerBody.innerHTML = entries.slice(0, 25).map(e => `
    <div class="ledger-row">
      <span class="date">${formatDate(e.date)}</span>
      <span class="item">${escapeHtml(e.item)}</span>
      <span class="cat">${escapeHtml(e.category)}</span>
      <span class="qty">${e.quantity} ${e.unit}</span>
      <span class="reason">${escapeHtml(e.reason)}</span>
      <button class="del-btn" data-id="${e.id}" title="Delete entry" aria-label="Delete entry">×</button>
    </div>
  `).join('');

  els.ledgerBody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

// ---------- Render: stat cards ----------
function renderStats() {
  els.statTotal.textContent = entries.length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekCount = entries.filter(e => new Date(e.date) >= weekAgo).length;
  els.statWeek.textContent = weekCount;

  const catCounts = countBy(entries, 'category');
  const topCat = topKey(catCounts);
  els.statCat.textContent = topCat || '—';

  const reasonCounts = countBy(entries, 'reason');
  const topReason = topKey(reasonCounts);
  els.statReason.innerHTML = topReason ? `<small>${topReason}</small>` : '—';
}

// ---------- Render: chart ----------
function renderChart() {
  const catCounts = countBy(entries, 'category');
  const labels = Object.keys(catCounts);
  const data = Object.values(catCounts);

  if (chartInstance) chartInstance.destroy();

  if (labels.length === 0) return;

  chartInstance = new Chart(els.chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Entries logged',
        data,
        backgroundColor: '#e8a33d',
        borderRadius: 3,
        maxBarThickness: 38,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#b8c4bb', font: { family: 'IBM Plex Mono', size: 10.5 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#b8c4bb', stepSize: 1, font: { family: 'IBM Plex Mono', size: 10.5 } },
          grid: { color: '#3d544a' }
        }
      }
    }
  });
}

// ---------- Render: rule-based insights ----------
function renderInsights() {
  if (entries.length < 3) {
    els.insightsList.innerHTML = `<p class="insight-empty">Log a few entries to see patterns here.</p>`;
    return;
  }

  const insights = [];
  const total = entries.length;

  const catCounts = countBy(entries, 'category');
  const topCat = topKey(catCounts);
  if (topCat) {
    const pct = Math.round((catCounts[topCat] / total) * 100);
    insights.push(`${pct}% of your logged waste is <b>${topCat}</b>. ${CATEGORY_TIPS[topCat] || ''}`);
  }

  const reasonCounts = countBy(entries, 'reason');
  const topReason = topKey(reasonCounts);
  if (topReason) {
    const pct = Math.round((reasonCounts[topReason] / total) * 100);
    insights.push(`${pct}% of entries are logged as "<b>${topReason}</b>". ${REASON_TIPS[topReason] || ''}`);
  }

  const dayCounts = {};
  entries.forEach(e => {
    const day = new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const topDay = topKey(dayCounts);
  if (topDay && Object.keys(dayCounts).length > 1) {
    insights.push(`You log the most waste on <b>${topDay}s</b>. Worth planning smaller portions that day.`);
  }

  els.insightsList.innerHTML = insights.map(text => `
    <div class="insight-item"><span class="bullet">→</span><span>${text}</span></div>
  `).join('');
}

// ---------- Helpers ----------
function countBy(arr, key) {
  const out = {};
  arr.forEach(e => { out[e[key]] = (out[e[key]] || 0) + 1; });
  return out;
}

function topKey(countsObj) {
  const entries = Object.entries(countsObj);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
