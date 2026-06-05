export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function fingerprintsMatch(
  a: { domPathHash: string; tag: string; dataProgmaId?: string },
  b: { domPathHash: string; tag: string; dataProgmaId?: string },
): boolean {
  if (a.dataProgmaId && b.dataProgmaId) {
    return a.dataProgmaId === b.dataProgmaId
  }
  return a.domPathHash === b.domPathHash && a.tag === b.tag
}
