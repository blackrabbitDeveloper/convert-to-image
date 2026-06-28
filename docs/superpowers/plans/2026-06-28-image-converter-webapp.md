# 이미지 컨버터 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저에서만 동작하는 정적 이미지 변환 웹앱(PNG/JPEG/WebP 변환, 품질 조절, 일괄 ZIP 다운로드)을 빌드 단계 없이 만들어 GitHub Pages로 배포한다.

**Architecture:** 순수 바닐라 HTML/CSS/JS. 핵심 변환은 브라우저 Canvas API(`drawImage` → `canvas.toBlob`). `converter.js`는 ES 모듈 순수 함수로 작성해 브라우저와 Node 테스트가 동일 파일을 공유한다. 일괄 ZIP만 벤더링한 JSZip 사용. 모든 처리는 클라이언트에서 일어나며 이미지는 서버로 전송되지 않는다.

**Tech Stack:** HTML5, CSS3, ES Modules(브라우저 + Node), Canvas API, JSZip(벤더링), Node 내장 테스트 러너(`node --test`).

**작업 디렉터리:** `D:\Projects\other\convert-to-image` (git 초기화·원격 `origin` 연결 완료)

---

## 파일 구조

```
convert-to-image/
├── index.html              # 화면 구조
├── css/style.css           # 다크 테마
├── js/
│   ├── converter.js        # 순수 변환 로직 + convert() (ES 모듈)
│   └── app.js              # UI 오케스트레이션 (ES 모듈)
├── lib/jszip.min.js        # 일괄 ZIP (벤더링)
├── test/converter.test.js  # 순수 함수 단위 테스트 (node --test)
├── serve.mjs               # 로컬 확인용 정적 서버 (배포엔 무해, 0 의존성)
├── package.json            # type:module + test 스크립트
├── .gitignore
├── .nojekyll               # GitHub Pages Jekyll 우회
└── README.md
```

각 파일은 하나의 책임만 진다. `converter.js`는 DOM에 의존하지 않는 변환 로직, `app.js`는 DOM/이벤트/상태, `index.html`+`style.css`는 표현. 테스트 대상은 `converter.js`의 순수 함수뿐이다.

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `.gitignore`, `.nojekyll`, `serve.mjs`

- [ ] **Step 1: package.json 작성**

Create `package.json`:

```json
{
  "name": "convert-to-image",
  "version": "1.0.0",
  "description": "브라우저 기반 이미지 포맷 변환 웹앱 (PNG/JPEG/WebP)",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "dev": "node serve.mjs"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: .gitignore 작성**

Create `.gitignore`:

```
node_modules/
.DS_Store
Thumbs.db
*.log
```

- [ ] **Step 3: .nojekyll 작성 (빈 파일)**

Create `.nojekyll` with empty content.

- [ ] **Step 4: 로컬 정적 서버 작성**

Create `serve.mjs`:

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = 8000;
const ROOT = process.cwd();
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const rel = urlPath === '/' ? '/index.html' : urlPath;
    const filePath = normalize(join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not Found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
```

- [ ] **Step 5: 커밋**

```bash
git add package.json .gitignore .nojekyll serve.mjs
git commit -m "chore: 프로젝트 스캐폴딩 (package.json, 정적 서버, .nojekyll)"
```

---

## Task 2: `formatToMime` (TDD)

**Files:**
- Create: `js/converter.js`
- Create: `test/converter.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `test/converter.test.js`:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test`
Expected: FAIL — `Cannot find module '../js/converter.js'` 또는 `formatToMime is not a function`

- [ ] **Step 3: 최소 구현**

Create `js/converter.js`:

```js
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export function formatToMime(format) {
  const mime = MIME[format];
  if (!mime) throw new Error('지원하지 않는 포맷: ' + format);
  return mime;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/converter.js test/converter.test.js
git commit -m "feat: formatToMime — 포맷을 MIME 타입으로 변환"
```

---

## Task 3: `resolveQuality` (TDD)

**Files:**
- Modify: `js/converter.js`
- Modify: `test/converter.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

`test/converter.test.js` 상단 import에 `resolveQuality`를 추가하고 파일 끝에 테스트를 덧붙인다.

import 줄을 다음으로 교체:

```js
import { formatToMime, resolveQuality } from '../js/converter.js';
```

파일 끝에 추가:

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test`
Expected: FAIL — `resolveQuality is not a function`

- [ ] **Step 3: 최소 구현**

`js/converter.js` 끝에 추가:

```js
export function resolveQuality(format, q) {
  if (format === 'png') return undefined;
  const clamped = Math.max(0, Math.min(100, Number(q)));
  return clamped / 100;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/converter.js test/converter.test.js
git commit -m "feat: resolveQuality — PNG 제외, 품질 0~100을 0~1로 정규화"
```

---

## Task 4: `renameTo` + `formatToExt` (TDD)

**Files:**
- Modify: `js/converter.js`
- Modify: `test/converter.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

import 줄을 다음으로 교체:

```js
import { formatToMime, resolveQuality, renameTo } from '../js/converter.js';
```

파일 끝에 추가:

```js
test('renameTo: 확장자를 대상 포맷으로 교체 (jpeg→jpg)', () => {
  assert.equal(renameTo('photo.png', 'jpeg'), 'photo.jpg');
});

test('renameTo: 파일명에 점이 여러 개여도 마지막 확장자만 교체', () => {
  assert.equal(renameTo('a.b.png', 'webp'), 'a.b.webp');
});

test('renameTo: 확장자 없으면 추가', () => {
  assert.equal(renameTo('noext', 'png'), 'noext.png');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test`
Expected: FAIL — `renameTo is not a function`

- [ ] **Step 3: 최소 구현**

`js/converter.js` 끝에 추가:

```js
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test`
Expected: PASS (8 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/converter.js test/converter.test.js
git commit -m "feat: renameTo/formatToExt — 출력 포맷에 맞춰 파일명 확장자 변경"
```

---

## Task 5: `convert()` 브라우저 변환 함수

**Files:**
- Modify: `js/converter.js`

`convert()`는 Canvas/Image/document에 의존하는 브라우저 전용 함수다. Node 단위 테스트 대상이 아니며, Task 9의 브라우저 수동 체크리스트로 검증한다.

- [ ] **Step 1: 구현**

`js/converter.js` 끝에 추가:

```js
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
```

- [ ] **Step 2: 회귀 확인 (기존 테스트 영향 없음)**

Run: `node --test`
Expected: PASS (8 tests) — `convert`는 import만 추가되며 호출되지 않으므로 기존 테스트가 그대로 통과.

- [ ] **Step 3: 커밋**

```bash
git add js/converter.js
git commit -m "feat: convert() — Canvas로 이미지를 대상 포맷/품질로 재인코딩 (흰 배경 합성)"
```

---

## Task 6: 화면 구조(index.html) + 다크 테마(style.css)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: index.html 작성**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이미지 컨버터 — PNG / JPEG / WebP 변환</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="container">
    <header>
      <h1>이미지 컨버터</h1>
      <p class="subtitle">PNG · JPEG · WebP 변환 · 품질 조절 · 일괄 변환 — 모두 브라우저에서, 업로드 없음</p>
    </header>

    <section id="dropzone" class="dropzone">
      <p>이미지를 여기로 끌어다 놓거나 클릭해서 선택하세요</p>
      <input type="file" id="file-input" accept="image/*" multiple hidden>
    </section>

    <section class="controls">
      <div class="control-group">
        <span class="control-label">출력 포맷</span>
        <label><input type="radio" name="format" value="jpeg" checked> JPEG</label>
        <label><input type="radio" name="format" value="png"> PNG</label>
        <label><input type="radio" name="format" value="webp"> WebP</label>
      </div>
      <div class="control-group">
        <label for="quality" class="control-label">품질: <span id="quality-value">85</span></label>
        <input type="range" id="quality" min="0" max="100" value="85">
      </div>
      <button id="convert-btn" disabled>변환</button>
    </section>

    <section id="file-list" class="file-list"></section>
    <section id="download-area" class="download-area"></section>

    <footer>
      <p>이미지는 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.</p>
    </footer>
  </main>

  <script src="lib/jszip.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: css/style.css 작성**

Create `css/style.css`:

```css
:root {
  --bg: #0f1115;
  --surface: #1a1d24;
  --surface-2: #232730;
  --border: #2e333d;
  --text: #e6e8ec;
  --muted: #9aa0aa;
  --accent: #4f8cff;
  --ok: #4ade80;
  --err: #f87171;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, "Segoe UI", "Malgun Gothic", sans-serif;
  line-height: 1.5;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

header h1 { margin: 0 0 .25rem; font-size: 1.6rem; }
.subtitle { color: var(--muted); margin: 0 0 1.5rem; font-size: .9rem; }

.dropzone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--muted);
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.dropzone:hover { border-color: var(--accent); }
.dropzone.dragover { border-color: var(--accent); background: var(--surface); color: var(--text); }

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: center;
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.control-group { display: flex; align-items: center; gap: .6rem; }
.control-label { color: var(--muted); font-size: .85rem; }
.controls label { font-size: .9rem; }
input[type="range"] { accent-color: var(--accent); }
input[type="range"]:disabled { opacity: .4; }

button {
  margin-left: auto;
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: .6rem 1.4rem;
  font-size: .95rem;
  cursor: pointer;
}
button:disabled { background: var(--surface-2); color: var(--muted); cursor: not-allowed; }

.file-list { display: flex; flex-direction: column; gap: .5rem; }
.file-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: .6rem .9rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: .88rem;
}
.file-item .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ok { color: var(--ok); white-space: nowrap; }
.err { color: var(--err); white-space: nowrap; }
.muted { color: var(--muted); white-space: nowrap; }

.download-area { margin-top: 1.5rem; display: flex; flex-direction: column; gap: .75rem; align-items: flex-start; }
.download-area button { margin-left: 0; }
.summary { margin: 0; color: var(--muted); font-size: .9rem; }

footer { margin-top: 3rem; color: var(--muted); font-size: .8rem; text-align: center; }
```

- [ ] **Step 3: 커밋**

```bash
git add index.html css/style.css
git commit -m "feat: 화면 구조와 다크 테마 스타일"
```

---

## Task 7: UI 오케스트레이션(app.js)

**Files:**
- Create: `js/app.js`

app.js는 브라우저 전용이며 Task 9에서 수동 검증한다. `js/converter.js`의 `convert`, `renameTo`를 import한다.

- [ ] **Step 1: app.js 작성**

Create `js/app.js`:

```js
import { convert, renameTo } from './converter.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('quality-value');
const convertBtn = document.getElementById('convert-btn');
const fileListEl = document.getElementById('file-list');
const downloadArea = document.getElementById('download-area');

let items = [];
let nextId = 1;

function getSelectedFormat() {
  return document.querySelector('input[name="format"]:checked').value;
}
function getQuality() {
  return Number(qualitySlider.value);
}
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function addFiles(fileList) {
  let skipped = 0;
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) { skipped++; continue; }
    items.push({ id: nextId++, file, originalSize: file.size, status: 'pending' });
  }
  renderList();
  convertBtn.disabled = items.length === 0;
  if (skipped > 0) {
    downloadArea.textContent = `이미지가 아닌 파일 ${skipped}개는 제외했습니다.`;
  }
}

function renderList() {
  if (items.length === 0) { fileListEl.innerHTML = ''; return; }
  fileListEl.innerHTML = items.map((it) => {
    let detail;
    if (it.status === 'done') {
      const pct = (1 - it.resultSize / it.originalSize) * 100;
      const sign = pct >= 0 ? '-' : '+';
      detail = `<span class="ok">${formatBytes(it.originalSize)} → ${formatBytes(it.resultSize)} (${sign}${Math.abs(pct).toFixed(1)}%)</span>`;
    } else if (it.status === 'error') {
      detail = `<span class="err">실패: ${it.error}</span>`;
    } else if (it.status === 'converting') {
      detail = `<span class="muted">변환 중…</span>`;
    } else {
      detail = `<span class="muted">${formatBytes(it.originalSize)}</span>`;
    }
    return `<div class="file-item"><span class="name">${it.file.name}</span>${detail}</div>`;
  }).join('');
}

async function handleConvert() {
  const format = getSelectedFormat();
  const quality = getQuality();
  convertBtn.disabled = true;
  downloadArea.innerHTML = '';
  for (const it of items) {
    it.status = 'converting';
    renderList();
    try {
      const blob = await convert(it.file, { format, quality });
      it.resultBlob = blob;
      it.resultSize = blob.size;
      it.resultName = renameTo(it.file.name, format);
      it.status = 'done';
    } catch (e) {
      it.status = 'error';
      it.error = e.message;
    }
    renderList();
  }
  convertBtn.disabled = false;
  updateDownloadArea();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadAll() {
  const done = items.filter((it) => it.status === 'done');
  if (done.length === 0) return;
  if (done.length === 1) {
    downloadBlob(done[0].resultBlob, done[0].resultName);
    return;
  }
  const zip = new window.JSZip();
  for (const it of done) zip.file(it.resultName, it.resultBlob);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'converted-images.zip');
}

function updateDownloadArea() {
  const done = items.filter((it) => it.status === 'done');
  const failed = items.filter((it) => it.status === 'error').length;
  if (done.length === 0) {
    downloadArea.textContent = failed > 0 ? '변환에 실패했습니다.' : '';
    return;
  }
  const totalBefore = done.reduce((s, it) => s + it.originalSize, 0);
  const totalAfter = done.reduce((s, it) => s + it.resultSize, 0);
  const pct = (1 - totalAfter / totalBefore) * 100;
  const label = done.length === 1 ? '다운로드' : `ZIP으로 ${done.length}개 다운로드`;
  downloadArea.innerHTML =
    `<p class="summary">합계 ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (-${pct.toFixed(1)}%)` +
    (failed > 0 ? ` · 실패 ${failed}개` : '') + `</p>`;
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', downloadAll);
  downloadArea.appendChild(btn);
}

function syncQualityEnabled() {
  qualitySlider.disabled = getSelectedFormat() === 'png';
}

document.querySelectorAll('input[name="format"]').forEach((r) =>
  r.addEventListener('change', syncQualityEnabled));
qualitySlider.addEventListener('input', () => { qualityValue.textContent = qualitySlider.value; });

dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => addFiles(fileInput.files));
convertBtn.addEventListener('click', handleConvert);

syncQualityEnabled();
```

- [ ] **Step 2: 커밋**

```bash
git add js/app.js
git commit -m "feat: app.js — 드롭/선택, 순차 변환, 진행/절감률 표시, 다운로드"
```

---

## Task 8: 일괄 ZIP 라이브러리(JSZip) 벤더링

**Files:**
- Create: `lib/jszip.min.js`

- [ ] **Step 1: JSZip 내려받기 (PowerShell)**

Run:

```powershell
New-Item -ItemType Directory -Path "lib" -Force | Out-Null
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" -OutFile "lib/jszip.min.js"
```

- [ ] **Step 2: 내려받기 검증**

Run:

```powershell
(Get-Item "lib/jszip.min.js").Length
```

Expected: 90,000 바이트 이상(약 95KB)이며 0이 아님. (네트워크가 막혀 받지 못하면, 동일 버전 `jszip.min.js`를 수동으로 `lib/`에 넣는다.)

- [ ] **Step 3: 커밋**

```bash
git add lib/jszip.min.js
git commit -m "chore: JSZip 3.10.1 벤더링 (일괄 ZIP 다운로드용)"
```

---

## Task 9: 브라우저 수동 검증 + README

**Files:**
- Create: `README.md`

브라우저 의존 코드(`convert`, `app.js`)는 여기서 실제 동작으로 검증한다. 샘플 이미지는 기존 `D:\Projects\other\Ai Image`의 PNG 17장을 사용한다.

- [ ] **Step 1: 로컬 서버 실행**

Run: `node serve.mjs`
Expected: 콘솔에 `http://localhost:8000` 출력. 브라우저로 해당 주소를 연다.

- [ ] **Step 2: 수동 체크리스트 수행**

각 항목을 직접 확인한다(모두 통과해야 함):

- [ ] PNG 17장을 드래그&드롭 → 목록에 파일명 + 원본 용량 표시
- [ ] 포맷 JPEG, 품질 85 → `변환` → 각 항목에 `원본 → 결과 (-NN%)` 표시
- [ ] 결과 2장 이상 → `ZIP으로 N개 다운로드` 버튼 → `converted-images.zip` 정상 다운로드·해제
- [ ] 1장만 변환 → `다운로드` 버튼으로 단일 `.jpg` 다운로드
- [ ] 포맷 WebP로 변경 후 재변환 → `.webp` 생성, 용량 변화 확인
- [ ] 포맷 PNG 선택 → 품질 슬라이더 자동 비활성
- [ ] 품질 30 vs 95 비교 → 결과 용량이 뚜렷이 달라짐
- [ ] 투명 PNG(있으면)를 JPEG로 변환 → 배경이 검정이 아닌 흰색
- [ ] 텍스트 파일 등 비이미지 드롭 → "이미지가 아닌 파일 N개는 제외" 안내, 앱 정상
- [ ] 변환 결과 합계 줄에 총 용량/절감률 표시

- [ ] **Step 3: README 작성**

Create `README.md`:

```markdown
# 이미지 컨버터 (convert-to-image)

브라우저에서만 동작하는 이미지 변환 웹앱. PNG · JPEG · WebP 사이로 포맷을 바꾸고,
품질(용량)을 조절하고, 여러 장을 한 번에 변환해 ZIP으로 받습니다.
**이미지는 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.**

## 사용법

1. https://blackrabbitdeveloper.github.io/convert-to-image/ 접속
2. 이미지를 끌어다 놓거나 클릭해서 선택
3. 출력 포맷과 품질 선택 후 `변환`
4. 1장은 바로, 여러 장은 ZIP으로 다운로드

## 로컬 실행

```bash
node serve.mjs        # http://localhost:8000
```

(ES 모듈을 쓰므로 `file://`로 직접 열면 안 되고 위 서버로 열어야 합니다.)

## 테스트

```bash
node --test           # converter.js 순수 함수 단위 테스트
```

## 기술

순수 바닐라 HTML/CSS/JS, 빌드 없음. 변환은 브라우저 Canvas API.
일괄 ZIP은 벤더링한 JSZip. GitHub Pages로 정적 배포.

## 배포

`main` 브랜치를 push하고 저장소 **Settings → Pages → Source: `main` / (root)** 를 켜면 됩니다.
```

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs: README — 사용법, 로컬 실행, 테스트, 배포 안내"
```

---

## Task 10: 배포 (사용자 확인 필요)

원격 push는 외부로 공개되는 작업이므로, 실행 전 사용자에게 확인을 받는다.

- [ ] **Step 1: 전체 테스트 최종 확인**

Run: `node --test`
Expected: PASS (8 tests)

- [ ] **Step 2: main push (사용자 확인 후)**

```bash
git push -u origin main
```

- [ ] **Step 3: GitHub Pages 활성화 안내**

`gh` CLI가 없으므로 사용자가 웹에서 직접 수행:
저장소 → **Settings → Pages → Build and deployment → Source: `Deploy from a branch` → Branch: `main` / `/ (root)` → Save**.
1~2분 후 https://blackrabbitdeveloper.github.io/convert-to-image/ 에서 확인.

- [ ] **Step 4: 배포 확인**

배포 URL 접속 → 이미지 1장 변환·다운로드가 정상 동작하는지 확인.

---

## 완료 기준 (설계서 §10 대응)

- [ ] PNG/JPEG/WebP 상호 변환 동작 (Task 5, 7, 9)
- [ ] 품질 슬라이더로 JPEG/WebP 용량 조절 + 절감률 표시 (Task 7, 9)
- [ ] 여러 장 일괄 변환 → ZIP 다운로드 (Task 7, 8, 9)
- [ ] 투명 PNG → JPEG 변환 시 배경 흰색 유지 (Task 5, 9)
- [ ] GitHub Pages URL에서 설치 없이 사용 가능 (Task 10)
