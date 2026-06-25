export function assertIndexedDbAvailable(win: Pick<Window, 'indexedDB'> = window) {
  if (!win.indexedDB) {
    throw new Error('INDEXED_DB_UNAVAILABLE');
  }
}
