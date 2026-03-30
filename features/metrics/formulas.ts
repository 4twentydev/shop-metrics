export function toPanelEquivalent(
  nativeQuantity: number,
  panelsPerNativeUnit: number,
) {
  return nativeQuantity * panelsPerNativeUnit;
}
