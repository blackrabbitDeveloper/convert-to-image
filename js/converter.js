const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export function formatToMime(format) {
  const mime = MIME[format];
  if (!mime) throw new Error('지원하지 않는 포맷: ' + format);
  return mime;
}

export function resolveQuality(format, q) {
  if (format === 'png') return undefined;
  const clamped = Math.max(0, Math.min(100, Number(q)));
  return clamped / 100;
}

const EXT = { png: 'png', jpeg: 'jpg', webp: 'webp' };

export function formatToExt(format) {
  const ext = EXT[format];
  if (!ext) throw new Error('지원하지 않는 포맷: ' + format);
  return ext;
}

export function renameTo(filename, format) {
  const ext = formatToExt(format);
  const dot = filename.lastIndexOf('.');
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return base + '.' + ext;
}

/**
 * File을 디코딩해 흰 배경 위에 그린 뒤 대상 포맷/품질로 재인코딩한다.
 * JPEG/WebP는 알파를 지원하지 않으므로 흰 배경 합성으로 투명 영역이 검게 나오는 것을 막는다.
 * @returns {Promise<Blob>}
 */
export function convert(file, { format, quality }) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('인코딩 실패 — 브라우저가 ' + format + ' 출력을 지원하지 않을 수 있습니다'));
        },
        formatToMime(format),
        resolveQuality(format, quality)
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 디코딩할 수 없습니다'));
    };
    img.src = url;
  });
}
