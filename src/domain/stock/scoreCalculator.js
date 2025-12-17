/**
 * Calculates the breakdown of the Investor Score into its 4 components.
 *
 * Score Components (Total: 100 points):
 * - PEG Ratio (max 30 pts): <1 = 30pts, 1-2 = 20pts, >2 = 10pts
 * - ROE (max 30 pts): >20% = 30pts, >10% = 20pts, >0% = 10pts
 * - Profit Margin (max 20 pts): >20% = 20pts, >10% = 15pts, >0% = 10pts
 * - EPS Growth Next 5Y (max 20 pts): >30% = 20pts, >20% = 15pts, >10% = 10pts
 *
 * @param {Object} stock - Stock object with PEG, ROE, Profit M, and EPS Next 5Y fields
 * @returns {Array} Array of score breakdown objects with metric, value, and max
 */
export function calculateScoreBreakdown(stock) {
  const {
    PEG,
    ROE,
    'Profit M': profitMargin,
    'EPS Next 5Y': epsGrowth5Y
  } = stock;

  // PEG Ratio (max 30 pts)
  let pegScore = 10; // default
  if (PEG !== null && PEG !== undefined) {
    if (PEG < 1) {
      pegScore = 30;
    } else if (PEG >= 1 && PEG <= 2) {
      pegScore = 20;
    }
  }

  // ROE (max 30 pts)
  let roeScore = 10; // default
  if (ROE !== null && ROE !== undefined) {
    const roePercent = ROE * 100; // Convert to percentage
    if (roePercent > 20) {
      roeScore = 30;
    } else if (roePercent > 10) {
      roeScore = 20;
    }
  }

  // Profit Margin (max 20 pts)
  let profitScore = 10; // default
  if (profitMargin !== null && profitMargin !== undefined) {
    const profitPercent = profitMargin * 100;
    if (profitPercent > 20) {
      profitScore = 20;
    } else if (profitPercent > 10) {
      profitScore = 15;
    }
  }

  // EPS Growth Next 5Y (max 20 pts)
  let epsScore = 10; // default
  if (epsGrowth5Y !== null && epsGrowth5Y !== undefined) {
    const epsPercent = epsGrowth5Y * 100;
    if (epsPercent > 30) {
      epsScore = 20;
    } else if (epsPercent > 20) {
      epsScore = 15;
    }
  }

  return [
    { metric: 'PEG Ratio', value: pegScore, max: 30 },
    { metric: 'ROE', value: roeScore, max: 30 },
    { metric: 'Profit Margin', value: profitScore, max: 20 },
    { metric: 'EPS Growth (5Y)', value: epsScore, max: 20 }
  ];
}
