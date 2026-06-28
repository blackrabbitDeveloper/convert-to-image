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
  downloadArea.textContent = '';
  let skipped = 0;
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) { skipped++; continue; }
    items.push({ id: nextId++, file, originalSize: file.size, status: 'pending', thumbUrl: URL.createObjectURL(file) });
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
    return `<div class="file-item"><img class="thumb" src="${it.thumbUrl}" alt=""><span class="name">${it.file.name}</span>${detail}</div>`;
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
    resetAll();
    return;
  }
  const zip = new window.JSZip();
  for (const it of done) zip.file(it.resultName, it.resultBlob);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'converted-images.zip');
  resetAll();
}

function resetAll() {
  for (const it of items) {
    if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
  }
  items = [];
  nextId = 1;
  fileListEl.innerHTML = '';
  downloadArea.innerHTML = '';
  convertBtn.disabled = true;
  fileInput.value = '';
  downloadArea.textContent = '다운로드를 시작했습니다. 목록을 비웠어요.';
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
