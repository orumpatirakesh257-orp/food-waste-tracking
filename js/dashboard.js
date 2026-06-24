// ============ Feedback Form ============
const feedbackEls = {
  btn: document.getElementById('feedback-btn'),
  modal: document.getElementById('feedback-modal'),
  overlay: document.getElementById('feedback-overlay'),
  closeBtn: document.getElementById('feedback-close'),
  form: document.getElementById('feedback-form'),
  message: document.getElementById('feedback-message'),
  location: document.getElementById('feedback-location'),
  email: document.getElementById('feedback-email'),
  detectBtn: document.getElementById('detect-location-btn'),
  locationStatus: document.getElementById('location-status'),
  submitBtn: document.getElementById('feedback-submit-btn'),
};

feedbackEls.btn.addEventListener('click', () => {
  feedbackEls.modal.classList.remove('hidden');
});

feedbackEls.closeBtn.addEventListener('click', () => {
  feedbackEls.modal.classList.add('hidden');
});

feedbackEls.overlay.addEventListener('click', () => {
  feedbackEls.modal.classList.add('hidden');
});

feedbackEls.detectBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  detectAndSetLocation();
});

async function detectAndSetLocation() {
  feedbackEls.detectBtn.disabled = true;
  showLocationStatus('⏳ Detecting location...', 'info');

  if (!navigator.geolocation) {
    showLocationStatus('Geolocation not supported in your browser', 'error');
    feedbackEls.detectBtn.disabled = false;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const location = await reverseGeocodeLocation(latitude, longitude);
        feedbackEls.location.value = location || '';
        showLocationStatus(`✓ Location: ${location}`, 'success');
      } catch (err) {
        console.error('Reverse geocode error:', err);
        showLocationStatus('Could not determine location name', 'error');
      }
      feedbackEls.detectBtn.disabled = false;
    },
    (error) => {
      console.error('Geolocation error:', error);
      if (error.code === error.PERMISSION_DENIED) {
        showLocationStatus('Location permission denied. Please enter manually.', 'error');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        showLocationStatus('Location unavailable. Please enter manually.', 'error');
      } else {
        showLocationStatus('Could not get location. Please enter manually.', 'error');
      }
      feedbackEls.detectBtn.disabled = false;
    }
  );
}

async function reverseGeocodeLocation(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    
    // Extract city/area and state from address
    const address = data.address || {};
    const city = address.city || address.town || address.village || '';
    const state = address.state || '';
    
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else if (state) {
      return state;
    } else {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

function showLocationStatus(message, type = 'info') {
  feedbackEls.locationStatus.textContent = message;
  feedbackEls.locationStatus.style.display = 'block';
  feedbackEls.locationStatus.className = `location-status ${type}`;
}

feedbackEls.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  feedbackEls.submitBtn.disabled = true;
  feedbackEls.submitBtn.textContent = 'Sending...';

  try {
    const feedbackData = {
      message: feedbackEls.message.value.trim(),
      location: feedbackEls.location.value.trim() || null,
      email: feedbackEls.email.value.trim() || null,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('feedback').add(feedbackData);
    
    showToast('Feedback sent! Thank you.', 'success');
    feedbackEls.form.reset();
    feedbackEls.locationStatus.style.display = 'none';
    feedbackEls.modal.classList.add('hidden');
  } catch (err) {
    console.error('Feedback submission error:', err);
    showToast('Failed to send feedback. Try again.', 'error');
  } finally {
    feedbackEls.submitBtn.disabled = false;
    feedbackEls.submitBtn.textContent = 'Send feedback';
  }
});

let currentUser = null;
let entries = [];
let chartInstance = null;
let userProfile = {};
let chartMode = 'weight';
const CO2_EQUIV_PER_KM = 0.12;

// Groq API configuration
const GROQ_API_KEY = localStorage.getItem('GROQ_API_KEY') || '';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-vision-preview';
const GROQ_TEXT_MODEL = 'mixtral-8x7b-32768';

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

// ---------- Toast Notifications ----------
function showToast(message, type = 'info', duration = 3000) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------- Elements ----------
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
  submitBtn: document.getElementById('submit-btn'),
  ledgerBody: document.getElementById('ledger-body'),
  insightsList: document.getElementById('insights-list'),
  refreshInsightsBtn: document.getElementById('refresh-insights-btn'),
  statWeekKg: document.getElementById('stat-week-kg'),
  statMonthKg: document.getElementById('stat-month-kg'),
  statMostWasted: document.getElementById('stat-most-wasted'),
  statTotal: document.getElementById('stat-total'),
  chartCanvas: document.getElementById('cat-chart'),
  chartWeightBtn: document.getElementById('chart-weight-btn'),
  chartCO2Btn: document.getElementById('chart-co2-btn'),
  co2SummaryText: document.getElementById('co2-summary-text'),
  co2CurrentTotal: document.getElementById('co2-current-total'),
  co2Equivalent: document.getElementById('co2-equivalent'),
  weeklyGoalInput: document.getElementById('weekly-goal-input'),
  weeklyGoalSave: document.getElementById('weekly-goal-save'),
  progressBarWrap: document.getElementById('progress-bar-wrap'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  streakBadge: document.getElementById('streak-badge'),
  streakText: document.getElementById('streak-text'),
  csvExportBtn: document.getElementById('csv-export-btn'),
  leaderboardBody: document.getElementById('leaderboard-body'),
  refreshLeaderboardBtn: document.getElementById('refresh-leaderboard-btn'),
};

// Default date field to today
els.date.value = new Date().toISOString().slice(0, 10);

// Toggle custom inputs when 'Other' is selected
els.cat.addEventListener('change', function() {
  document.getElementById('custom-category').style.display =
    this.value === 'Other' ? 'block' : 'none';
});

els.reason.addEventListener('change', function() {
  document.getElementById('custom-reason').style.display =
    this.value === 'Other' ? 'block' : 'none';
});

// ---------- Auth guard ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  els.who.textContent = user.displayName || user.email;
  listenToUserProfile();
  listenToEntries();
});

els.logout.addEventListener('click', () => auth.signOut());
els.chartWeightBtn.addEventListener('click', () => setChartMode('weight'));
els.chartCO2Btn.addEventListener('click', () => setChartMode('co2'));
els.refreshLeaderboardBtn.addEventListener('click', async () => {
  els.refreshLeaderboardBtn.disabled = true;
  await renderLeaderboard();
  els.refreshLeaderboardBtn.disabled = false;
});

function setChartMode(mode) {
  chartMode = mode;
  els.chartWeightBtn.classList.toggle('active', mode === 'weight');
  els.chartCO2Btn.classList.toggle('active', mode === 'co2');
  renderChart();
}

// ---------- Firestore: user profile ----------
function listenToUserProfile() {
  db.collection('users').doc(currentUser.uid).onSnapshot((doc) => {
    if (doc.exists) {
      userProfile = doc.data();
      if (userProfile.weeklyGoal) {
        els.weeklyGoalInput.value = userProfile.weeklyGoal;
      }
      updateStreakDisplay();
      renderProgressBar();
      renderLeaderboard();
    }
  });
}

// ---------- Firestore: live entries ----------
function listenToEntries() {
  db.collection('users').doc(currentUser.uid).collection('entries')
    .orderBy('date', 'desc')
    .onSnapshot((snapshot) => {
      entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderLedger();
      renderStats();
      renderChart();
      updateCO2ComparisonCard();
      renderInsights();
      renderLeaderboard();
    }, (err) => {
      console.error('Firestore listen error:', err);
      els.ledgerBody.innerHTML = `<div class="ledger-empty">Couldn't load entries — check your Firebase config in js/firebase-config.js</div>`;
    });
}

// ---------- Add entry ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Disable button to prevent double submission
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Saving...';
  
  try {
    const categoryRaw = els.cat.value;
    const finalCategory = categoryRaw === 'Other'
      ? document.getElementById('custom-category').value.trim()
      : categoryRaw;

    const reasonRaw = els.reason.value;
    const finalReason = reasonRaw === 'Other'
      ? document.getElementById('custom-reason').value.trim()
      : reasonRaw;

    const entry = {
      item: els.item.value.trim(),
      quantity: parseFloat(els.qty.value),
      unit: els.unit.value,
      category: finalCategory,
      reason: finalReason,
      date: els.date.value,
      co2_kg: calculateCO2(parseFloat(els.qty.value), els.unit.value, finalCategory),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (!entry.item || isNaN(entry.quantity)) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Update streak
    await updateStreak(entry.date);

    await db.collection('users').doc(currentUser.uid).collection('entries').add(entry);
    showToast('Entry logged ✓', 'success');
    
    els.form.reset();
    els.date.value = new Date().toISOString().slice(0, 10);
  } catch (err) {
    console.error('Add entry error:', err);
    showToast('Failed to save. Try again.', 'error');
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'Add to ledger';
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
async function renderLeaderboard() {
  const householdKey = userProfile.householdId || userProfile.groupId;
  if (!householdKey) {
    els.leaderboardBody.innerHTML = `<p class="leaderboard-empty">Household not configured yet — leaderboard requires a household/group.</p>`;
    return;
  }

  const now = new Date();
  const currentWeek = getWeekBounds(now);
  const previousWeek = getWeekBounds(new Date(currentWeek.start.getTime() - 1));

  els.leaderboardBody.innerHTML = `<p class="leaderboard-empty">Loading leaderboard…</p>`;

  try {
    const groupField = userProfile.householdId ? 'householdId' : 'groupId';
    const userQuery = db.collection('users')
      .where(groupField, '==', householdKey);

    const householdSnapshot = await userQuery.get();
    if (householdSnapshot.empty) {
      els.leaderboardBody.innerHTML = `<p class="leaderboard-empty">No household members found.</p>`;
      return;
    }

    const rows = [];
    const userDocs = householdSnapshot.docs;

    for (const userDoc of userDocs) {
      const userData = userDoc.data();
      const memberId = userDoc.id;
      const memberName = userData.displayName || userData.name || userData.email || 'Member';

      const entrySnapshot = await db.collection('users')
        .doc(memberId)
        .collection('entries')
        .where('date', '>=', previousWeek.startStr)
        .where('date', '<', currentWeek.endStr)
        .get();

      const allEntries = entrySnapshot.docs.map(doc => doc.data());
      const currentTotal = sumCo2ByDateRange(allEntries, currentWeek.startStr, currentWeek.endStr);
      const previousTotal = sumCo2ByDateRange(allEntries, previousWeek.startStr, previousWeek.endStr);

      const noEntriesThisWeek = currentTotal === 0 && previousTotal > 0;
      const buildingBaseline = previousTotal === 0;
      const percentChange = buildingBaseline ? null : Number((((previousTotal - currentTotal) / previousTotal) * 100).toFixed(1));

      rows.push({
        userId: memberId,
        name: memberName,
        currentTotal,
        previousTotal,
        percentChange,
        noEntriesThisWeek,
        buildingBaseline,
      });
    }

    const ranked = rows.filter(r => !r.buildingBaseline && !r.noEntriesThisWeek && r.previousTotal > 0);
    const noEntries = rows.filter(r => r.noEntriesThisWeek);
    const baseline = rows.filter(r => r.buildingBaseline);

    ranked.sort((a, b) => b.percentChange - a.percentChange);

    const rendered = [];
    let rankCounter = 1;

    for (const row of ranked) {
      rendered.push(renderLeaderboardRow(row, rankCounter));
      rankCounter += 1;
    }

    for (const row of noEntries) {
      rendered.push(renderLeaderboardRow(row, null));
    }

    for (const row of baseline) {
      rendered.push(renderLeaderboardRow(row, null));
    }

    els.leaderboardBody.innerHTML = rendered.join('');
  } catch (error) {
    console.error('Leaderboard error:', error);
    els.leaderboardBody.innerHTML = `<p class="leaderboard-empty">Failed to load leaderboard. Try refreshing.</p>`;
  }
}

function renderLeaderboardRow(row, rank) {
  const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `${rank}` : '—';
  let changeLabel = '';
  let changeClass = '';
  let secondaryText = `Current: ${row.currentTotal.toFixed(1)} kg CO2e`;

  if (row.buildingBaseline) {
    changeLabel = 'Building baseline';
    changeClass = 'leaderboard-change';
  } else if (row.noEntriesThisWeek) {
    changeLabel = 'No entries yet this week';
    changeClass = 'leaderboard-change';
  } else {
    const arrow = row.percentChange >= 0 ? '↓' : '↑';
    changeClass = row.percentChange >= 0 ? 'leaderboard-change reduction' : 'leaderboard-change increase';
    changeLabel = `${arrow} ${Math.abs(row.percentChange).toFixed(1)}%`;
  }

  return `
    <div class="leaderboard-row">
      <div class="leaderboard-rank">${rankLabel}</div>
      <div>
        <div class="leaderboard-name">${escapeHtml(row.name)}</div>
        <span class="leaderboard-secondary">${escapeHtml(secondaryText)}</span>
      </div>
      <div class="leaderboard-meta">
        <div class="${changeClass}">${escapeHtml(changeLabel)}</div>
      </div>
    </div>
  `;
}

function getWeekBounds(date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(current.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const startStr = formatDateISO(start);
  const endStr = formatDateISO(end);
  return { start, end, startStr, endStr };
}

function sumCo2ByDateRange(entriesToSum, startStr, endStr) {
  return entriesToSum.reduce((sum, entry) => {
    const date = entry.date || '';
    if (date >= startStr && date < endStr) {
      return sum + (parseFloat(entry.co2_kg) || 0);
    }
    return sum;
  }, 0);
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  // This Week (kg)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKg = getWeeklyWaste();
  els.statWeekKg.textContent = weekKg.toFixed(2) + ' kg';

  // This Month (kg)
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthKg = entries
    .filter(e => new Date(e.date) >= monthAgo)
    .reduce((sum, e) => sum + quantityToKg(e.quantity, e.unit), 0);
  els.statMonthKg.textContent = monthKg.toFixed(2) + ' kg';

  // Most Wasted Item
  const itemQty = {};
  entries.forEach(e => {
    const qtyKg = e.unit === 'kg' ? e.quantity : e.unit === 'g' ? e.quantity / 1000 : 0;
    itemQty[e.item] = (itemQty[e.item] || 0) + qtyKg;
  });
  const mostWastedItem = Object.keys(itemQty).length > 0 
    ? Object.entries(itemQty).sort((a, b) => b[1] - a[1])[0][0] 
    : '—';
  els.statMostWasted.textContent = mostWastedItem || '—';

  renderProgressBar();
}

function getWeeklyWaste() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return entries
    .filter(e => new Date(e.date) >= weekAgo)
    .reduce((sum, e) => sum + quantityToKg(e.quantity, e.unit), 0);
}

// ---------- Weekly Goal & Progress Bar ----------
function renderProgressBar() {
  if (!userProfile.weeklyGoal) {
    els.progressBarWrap.style.display = 'none';
    return;
  }

  els.progressBarWrap.style.display = 'block';
  const currentWeekKg = getWeeklyWaste();
  const goal = userProfile.weeklyGoal;
  const percentage = Math.min((currentWeekKg / goal) * 100, 100);

  els.progressFill.style.width = percentage + '%';
  els.progressFill.classList.remove('amber', 'red');
  
  if (percentage >= 80) {
    els.progressFill.classList.add('red');
  } else if (percentage >= 50) {
    els.progressFill.classList.add('amber');
  }

  els.progressText.innerHTML = `<span>${currentWeekKg.toFixed(1)} kg / ${goal} kg goal this week</span>`;
}

els.weeklyGoalSave.addEventListener('click', async () => {
  const goal = parseFloat(els.weeklyGoalInput.value);
  if (isNaN(goal) || goal <= 0) {
    showToast('Enter a valid goal', 'error');
    return;
  }

  try {
    await db.collection('users').doc(currentUser.uid).update({
      weeklyGoal: goal,
    });
    showToast('Weekly goal saved ✓', 'success');
    renderProgressBar();
  } catch (err) {
    showToast('Failed to save goal', 'error');
  }
});

// ---------- Streak Counter ----------
async function updateStreak(newEntryDate) {
  try {
    const docRef = db.collection('users').doc(currentUser.uid);
    const doc = await docRef.get();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let streakCount = 1;
    let lastLogDate = new Date(newEntryDate).getTime();

    if (doc.exists) {
      const data = doc.data();
      if (data.lastLogDate) {
        const lastDate = new Date(data.lastLogDate);
        const lastLogDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        const yesterdayDate = new Date(today);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);

        if (lastLogDay.getTime() === yesterdayDate.getTime()) {
          streakCount = (data.streakCount || 0) + 1;
        } else if (lastLogDay.getTime() === today.getTime()) {
          streakCount = data.streakCount || 1;
        }
      }
    }

    await docRef.set({
      lastLogDate: new Date(),
      streakCount: streakCount,
    }, { merge: true });

  } catch (err) {
    console.error('Streak update error:', err);
  }
}

function updateStreakDisplay() {
  if (userProfile.streakCount && userProfile.streakCount > 0) {
    els.streakBadge.style.display = 'block';
    els.streakText.textContent = `🔥 ${userProfile.streakCount} day streak`;
  } else {
    els.streakBadge.style.display = 'none';
  }
}

// ---------- Render: chart ----------
function renderChart() {
  const totals = {};
  const useCO2 = chartMode === 'co2';

  entries.forEach(entry => {
    const category = entry.category || 'Other';
    const value = useCO2
      ? (entry.co2_kg != null ? entry.co2_kg : calculateCO2(entry.quantity, entry.unit, category))
      : quantityToKg(entry.quantity, entry.unit);
    totals[category] = (totals[category] || 0) + value;
  });

  const labels = Object.keys(totals);
  const data = labels.map(label => Math.round((totals[label] || 0) * 100) / 100);
  const datasetLabel = useCO2 ? 'CO2e (kg)' : 'Weight (kg)';

  // Destroy previous chart instance to prevent memory leaks and flickering
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (labels.length === 0) return;

  // Calculate max Y value with 20% padding for readability
  const maxValue = Math.max(...data);
  const yMax = Math.ceil(maxValue * 1.2);

  chartInstance = new Chart(els.chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: datasetLabel,
        data,
        backgroundColor: '#e8a33d',
        borderRadius: 3,
        maxBarThickness: 40,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0  // Disable animations to prevent flickering on updates
      },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#b8c4bb', font: { family: 'IBM Plex Mono', size: 10.5 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          max: yMax || undefined,
          ticks: { color: '#b8c4bb', font: { family: 'IBM Plex Mono', size: 10.5 } },
          grid: { color: '#3d544a' }
        }
      }
    }
  });
}

// ---------- Render: AI insights (Groq) ----------
async function renderInsights() {
  if (entries.length < 3) {
    els.insightsList.innerHTML = `<p class="insight-empty">Log a few entries to see patterns here.</p>`;
    return;
  }

  // If Groq API key is available, use AI insights
  if (GROQ_API_KEY) {
    await renderAIInsights();
  } else {
    renderRuleBasedInsights();
  }
}

async function renderAIInsights() {
  try {
    els.insightsList.innerHTML = `<p class="insight-empty">Loading insights...</p>`;

    const recentEntries = entries.slice(0, 30).map(e => 
      `- ${e.date}: ${e.item} (${e.quantity}${e.unit}), reason: ${e.reason}`
    ).join('\n');

    const prompt = `You are a food waste reduction advisor. Based on this user's food waste log, give 3 specific, actionable tips to reduce waste. Be concise (1-2 sentences each). Return as a numbered list.

Recent entries:
${recentEntries}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      renderRuleBasedInsights();
      return;
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || '';
    
    // Parse insights into bullet points
    const tips = insights
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => /^\d+\./.test(line.trim()) || line.trim().length > 10)
      .slice(0, 3)
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    if (tips.length === 0) {
      renderRuleBasedInsights();
      return;
    }

    els.insightsList.innerHTML = tips
      .map(tip => `<div class="insight-item"><span class="bullet">💡</span><span>${escapeHtml(tip)}</span></div>`)
      .join('');

  } catch (err) {
    console.error('AI insights error:', err);
    renderRuleBasedInsights();
  }
}

function renderRuleBasedInsights() {
  if (entries.length < 3) {
    els.insightsList.innerHTML = `<p class="insight-empty">Log a few entries to see patterns here.</p>`;
    return;
  }

  const comparison = getMonthlyComparison(entries);
  const insights = [];
  insights.push(getComparisonInsightText(comparison));
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

  els.insightsList.innerHTML = insights
    .map(text => `<div class="insight-item"><span class="bullet">→</span><span>${text}</span></div>`)
    .join('');
}

els.refreshInsightsBtn.addEventListener('click', async () => {
  els.refreshInsightsBtn.disabled = true;
  await renderInsights();
  els.refreshInsightsBtn.disabled = false;
});

// ---------- CSV Export ----------
els.csvExportBtn.addEventListener('click', () => {
  if (entries.length === 0) {
    showToast('No entries to export', 'error');
    return;
  }

  const csv = [
    ['Date', 'Item', 'Category', 'Quantity', 'Unit', 'Reason'],
    ...entries.map(e => [
      e.date,
      e.item,
      e.category,
      e.quantity,
      e.unit,
      e.reason,
    ])
  ];

  const csvContent = csv.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `greenlog-export.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  showToast('Export complete ✓', 'success');
});

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

function quantityToKg(quantity, unit) {
  let qty = parseFloat(quantity) || 0;
  if (unit === 'g') return qty / 1000;
  if (unit === 'lb') return qty * 0.453592;
  return qty;
}

function updateCO2ComparisonCard() {
  const comparison = getMonthlyComparison(entries.map(entry => ({
    ...entry,
    co2_kg: entry.co2_kg != null ? entry.co2_kg : calculateCO2(entry.quantity, entry.unit, entry.category)
  })));

  els.co2CurrentTotal.textContent = `${comparison.currentTotal.toFixed(2)} kg CO2e`;
  const kmEquivalent = Math.round(comparison.currentTotal / CO2_EQUIV_PER_KM);
  els.co2Equivalent.textContent = `Equivalent to ${kmEquivalent.toLocaleString()} km of car travel`;

  if (!comparison.hasEnoughData) {
    els.co2SummaryText.textContent = 'Add more entries to compare against last month.';
  } else if (comparison.trend === 'down') {
    els.co2SummaryText.textContent = `Good job — ${Math.abs(comparison.percentChange)}% lower than last month.`;
  } else if (comparison.trend === 'up') {
    els.co2SummaryText.textContent = `${comparison.percentChange}% higher than last month. Focus on reducing top waste categories.`;
  } else {
    els.co2SummaryText.textContent = 'CO2e is about the same as last month.';
  }
}

function getComparisonInsightText(comparison) {
  if (!comparison.hasEnoughData) {
    return 'Collect one more month of data to compare CO2 emissions trend.';
  }
  if (comparison.trend === 'down') {
    return `Your CO2 emissions are ${Math.abs(comparison.percentChange)}% lower than last month — nice reduction.`;
  }
  if (comparison.trend === 'up') {
    return `Your CO2 emissions are ${comparison.percentChange}% higher than last month. Try reducing waste in high-impact categories.`;
  }
  return 'Your CO2 emissions are about the same as last month.';
}

