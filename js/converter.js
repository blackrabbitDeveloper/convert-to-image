const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export function formatToMime(format) {
  const mime = MIME[format];
  if (!mime) throw new Error('지원하지 않는 포맷: ' + format);
  return mime;
}
