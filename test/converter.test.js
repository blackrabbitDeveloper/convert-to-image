import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatToMime, resolveQuality, renameTo } from '../js/converter.js';

test('formatToMime: 지원 포맷을 MIME으로 변환', () => {
  assert.equal(formatToMime('png'), 'image/png');
  assert.equal(formatToMime('jpeg'), 'image/jpeg');
  assert.equal(formatToMime('webp'), 'image/webp');
});

test('formatToMime: 미지원 포맷은 예외', () => {
  assert.throws(() => formatToMime('gif'));
});

test('resolveQuality: PNG은 품질 무시(undefined)', () => {
  assert.equal(resolveQuality('png', 85), undefined);
});

test('resolveQuality: JPEG/WebP는 0~100을 0~1로 정규화', () => {
  assert.equal(resolveQuality('jpeg', 85), 0.85);
  assert.equal(resolveQuality('webp', 100), 1);
  assert.equal(resolveQuality('jpeg', 0), 0);
});

test('resolveQuality: 범위를 벗어나면 클램프', () => {
  assert.equal(resolveQuality('jpeg', 150), 1);
  assert.equal(resolveQuality('jpeg', -10), 0);
});

test('renameTo: 확장자를 대상 포맷으로 교체 (jpeg→jpg)', () => {
  assert.equal(renameTo('photo.png', 'jpeg'), 'photo.jpg');
});

test('renameTo: 파일명에 점이 여러 개여도 마지막 확장자만 교체', () => {
  assert.equal(renameTo('a.b.png', 'webp'), 'a.b.webp');
});

test('renameTo: 확장자 없으면 추가', () => {
  assert.equal(renameTo('noext', 'png'), 'noext.png');
});
