const PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669',
  '#0891b2',
];

export function ventureColor(ventureId: string): string {
  let hash = 0;
  for (let i = 0; i < ventureId.length; i++) {
    hash = ventureId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
