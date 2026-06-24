// Average kg CO2e per kg of wasted food by category.
// Values sourced from published food life-cycle emission averages.
const emissionFactors = {
  'Grains & Cereals': 1.3,
  'Vegetables': 2.0,
  'Fruits': 1.1,
  'Dairy & Eggs': 3.0,
  'Meat & Fish': 27.0,
  'Seafood': 13.0,
  'Bakery': 1.5,
  'Other': 3.5,
};

function calculateCO2(quantity, unit, category) {
  let quantityKg = parseFloat(quantity) || 0;
  if (unit === 'g') {
    quantityKg = quantityKg / 1000;
  } else if (unit === 'lb') {
    quantityKg = quantityKg * 0.453592;
  }

  const factor = emissionFactors[category] || emissionFactors['Other'];
  const co2 = quantityKg * factor;
  return Math.round(co2 * 100) / 100;
}

function getMonthlyComparison(entries) {
  const totalsByMonth = entries.reduce((acc, entry) => {
    const monthKey = entry.date.slice(0, 7); // YYYY-MM
    const co2 = entry.co2_kg != null
      ? entry.co2_kg
      : calculateCO2(entry.quantity, entry.unit, entry.category || 'Other');
    acc[monthKey] = (acc[monthKey] || 0) + co2;
    return acc;
  }, {});

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;

  const currentTotal = Math.round((totalsByMonth[currentMonth] || 0) * 100) / 100;
  const previousTotal = Math.round((totalsByMonth[previousMonth] || 0) * 100) / 100;
  const hasEnoughData = previousTotal > 0;

  let percentChange = 0;
  if (hasEnoughData) {
    percentChange = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }

  let trend = 'same';
  if (hasEnoughData) {
    if (percentChange > 0) trend = 'up';
    else if (percentChange < 0) trend = 'down';
  }

  return {
    currentTotal,
    previousTotal,
    percentChange,
    hasEnoughData,
    trend,
  };
}

window.calculateCO2 = calculateCO2;
window.emissionFactors = emissionFactors;
window.getMonthlyComparison = getMonthlyComparison;
