export function roundMetric(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function sumMetric(values: number[], precision = 2) {
  return roundMetric(values.reduce((total, value) => total + value, 0), precision);
}

export function toPanelEquivalent(
  nativeQuantity: number,
  panelsPerNativeUnit: number,
) {
  return roundMetric(nativeQuantity * panelsPerNativeUnit);
}

export function calculateCompletionPercentage(
  completedPanels: number,
  expectedPanels: number,
) {
  if (expectedPanels <= 0) {
    return null;
  }

  return roundMetric((completedPanels / expectedPanels) * 100);
}

export function calculateVariance(actualValue: number, targetValue: number) {
  return roundMetric(actualValue - targetValue);
}

export function calculateAttainmentPercentage(
  actualValue: number,
  targetValue: number,
) {
  if (targetValue <= 0) {
    return null;
  }

  return roundMetric((actualValue / targetValue) * 100);
}
