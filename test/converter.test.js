import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatToMime } from '../js/converter.js';

test('formatToMime: 지원 포맷을 MIME으로 변환', () => {
  assert.equal(formatToMime('png'), 'image/png');
  assert.equal(formatToMime('jpeg'), 'image/jpeg');
  assert.equal(formatToMime('webp'), 'image/webp');
});

test('formatToMime: 미지원 포맷은 예외', () => {
  assert.throws(() => formatToMime('gif'));
});
