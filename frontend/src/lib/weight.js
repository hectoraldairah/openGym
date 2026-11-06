// Weights stay in the profile's unit in storage, so history, volume and progression
// remain comparable. An exercise's unit is a remembered input/display preference.
export const exerciseWeightUnit = (S, id) =>
  ['kg', 'lb'].includes(S.exUnits?.[id]) ? S.exUnits[id] : S.unit

export function convertWeight(value, from, to) {
  if (from === to) return value
  return from === 'lb' ? value * 0.45359237 : value / 0.45359237
}

export const displayWeight = (value, from, to) =>
  Math.round(convertWeight(value || 0, from, to) * 100) / 100
