const PREFIX = 'kolo-dev-showtime:';

export function isDevPreview(search = '') {
  const values = new URLSearchParams(search).getAll('dev');
  return values.length === 1 && values[0] === 'showtime';
}

export function previewStorage(storage) {
  if (!storage) return null;
  return {
    getItem: key => storage.getItem(PREFIX + key),
    setItem: (key, value) => storage.setItem(PREFIX + key, value),
    removeItem: key => storage.removeItem(PREFIX + key),
  };
}
