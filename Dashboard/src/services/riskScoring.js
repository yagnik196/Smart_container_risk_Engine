// rule-based scoring with explanation generation

const normalize = (score) => {
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
};

export const calculateRiskScore = (row) => {
  let score = 0.1; // base
  let explanations = [];

  const decWeight = parseFloat(row.Declared_Weight) || 0;
  const measWeight = parseFloat(row.Measured_Weight) || 0;
  if (decWeight && measWeight) {
    const diff = Math.abs(decWeight - measWeight) / decWeight;
    if (diff > 0.2) {
      score += 0.3;
      explanations.push(`Significant weight difference (${(diff * 100).toFixed(1)}%)`);
    } else if (diff > 0.1) {
      score += 0.15;
      explanations.push(`Moderate weight difference (${(diff * 100).toFixed(1)}%)`);
    }
  }

  const decValue = parseFloat(row.Declared_Value) || 0;
  const ratio = decWeight ? decValue / decWeight : 0;
  if (ratio > 200) {
    score += 0.25;
    explanations.push(`High value-to-weight ratio (${ratio.toFixed(2)}x)`);
  } else if (ratio > 150) {
    score += 0.12;
    explanations.push(`Elevated value-to-weight ratio (${ratio.toFixed(2)}x)`);
  }

  if (row.Clearance_Status && row.Clearance_Status.toLowerCase() === 'pending') {
    score += 0.1;
    explanations.push('Pending clearance status');
  }

  if (decValue > 50000) {
    score += 0.1;
    explanations.push(`High container value ($${decValue.toLocaleString()})`);
  }

  return {
    score: normalize(score),
    explanation: explanations.length > 0 ? explanations.join('; ') : 'Standard container - no anomalies detected'
  };
};

export const categorizeRisk = (riskScore) => {
  return riskScore > 0.6 ? 'Critical' : 'Low Risk';
};
