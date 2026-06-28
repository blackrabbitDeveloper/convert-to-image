# 이미지 컨버터 웹앱 설계 문서

- **날짜**: 2026-06-28
- **저장소**: https://github.com/blackrabbitDeveloper/convert-to-image.git
- **배포 URL(예정)**: https://blackrabbitdeveloper.github.io/convert-to-image/
- **상태**: 설계 승인됨, 구현 계획 대기

## 1. 목적

브라우저에서만 동작하는 정적 이미지 변환 웹앱. 사용자가 이미지를 올리면
PNG / JPEG / WebP 사이로 포맷을 변환하고 품질(용량)을 조절해 다운로드한다.
모든 처리가 클라이언트(브라우저)에서 일어나며 이미지는 서버로 전송되지 않는다.

기존에 PowerShell `convert-to-jpeg.ps1`로 하던 PNG→JPEG 압축 경험을 누구나
브라우저에서 쓸 수 있게 웹으로 옮기는 것이 동기다.

## 2. 범위

### 포함 (MVP)
- 포맷 변환: PNG ↔ JPEG ↔ WebP
- 품질(압축률) 슬라이더: JPEG/WebP에 0~100 적용, PNG은 비활성
- 여러 장 일괄 변환: 드래그&드롭으로 다중 선택, 결과를 ZIP으로 다운로드
- 변환 전/후 용량 및 절감률 표시
- 한국어 UI, 깔끔한 다크 테마

### 제외 (YAGNI)
- 리사이즈(크기 조절)
- 회전/크롭/필터 등 편집 기능
- 블로그 글 목록(이번엔 단일 목적 웹앱)
- 서버/계정/업로드 저장

## 3. 기술 결정

- **순수 바닐라 HTML/CSS/JS, 빌드 단계 없음.** 파일을 그대로 GitHub Pages에 올려 서빙.
- 핵심 변환은 브라우저 **Canvas API** (`drawImage` → `canvas.toBlob(mime, quality)`).
- 일괄 ZIP 다운로드만 **JSZip** 사용. CDN 대신 `lib/jszip.min.js`로 저장소에 포함해
  외부 의존성 없이 자급자족하게 한다.
- 대안으로 검토 후 제외: Vite+프레임워크(이 규모엔 과함), 정적 사이트 생성기(블로그 미선택).

## 4. 아키텍처 & 파일 구조

서버 없는 정적 사이트. GitHub Pages가 파일을 그대로 서빙한다.

```
convert-to-image/
├── index.html          # 마크업 / 화면 구조
├── css/
│   └── style.css       # 다크 테마 스타일
├── js/
│   ├── app.js          # UI 상태·이벤트 연결 (오케스트레이션)
│   └── converter.js    # 핵심: 디코딩 → canvas → 포맷 인코딩 (순수 로직)
├── lib/
│   └── jszip.min.js    # 일괄 ZIP용 (저장소에 포함)
├── README.md           # 소개, 사용법, 배포 방법
└── .nojekyll           # GitHub Pages가 Jekyll 처리 건너뛰게
```

## 5. 모듈 설계

### 5.1 `converter.js` — 순수 변환 로직 (테스트 대상)

명확한 인터페이스를 가진 순수 함수들로 구성한다. DOM 상태에 의존하지 않으며
독립적으로 테스트 가능하다.

- `formatToMime(format) -> string`
  - `'png'→'image/png'`, `'jpeg'→'image/jpeg'`, `'webp'→'image/webp'`
  - 알 수 없는 포맷이면 예외.
- `resolveQuality(format, q) -> number | undefined`
  - PNG은 품질 무시(undefined 반환). JPEG/WebP는 0~1로 클램프.
  - 입력 q는 0~100(슬라이더) → 0~1로 정규화.
- `renameTo(filename, format) -> string`
  - 확장자를 대상 포맷으로 교체. 확장자 없으면 추가.
- `convert(file, { format, quality }) -> Promise<Blob>`
  - File을 이미지로 디코딩 → 원본 크기의 canvas 생성 →
    흰 배경을 깔고(`fillRect`) 이미지를 그린다(JPEG/WebP 투명 영역 대비) →
    `canvas.toBlob(resolve, mime, quality)`로 Blob 반환.
  - 디코딩 실패 시 reject.

### 5.2 `app.js` — UI 오케스트레이션

- 입력: 드래그&드롭 영역 + `<input type="file" multiple accept="image/*">`
- 상태: 선택된 파일 목록(각 항목: File, 원본 크기, 상태, 결과 Blob/크기)
- 컨트롤: 출력 포맷 선택, 품질 슬라이더(PNG 선택 시 비활성), `변환` 버튼
- 동작: `변환` 클릭 → 파일을 **순차 처리**(메모리 급증 방지)하며 항목별 진행/결과 갱신
- 결과: 항목별 변환 후 용량 + 절감률(%) 표시
- 다운로드: 1장이면 `<a download>`로 직접, 여러 장이면 JSZip으로
  `converted-images.zip` 생성 후 다운로드

## 6. 데이터 흐름

1. 사용자가 이미지를 드롭/선택 → 상태 배열에 File 추가
2. 목록 렌더(파일명 + 원본 용량, 가능하면 썸네일)
3. 출력 포맷 + 품질 선택
4. `변환` 클릭 → 파일별: `convert()` 호출 → Blob 수집, 진행률 갱신
5. 결과 용량/절감률 표시
6. 단일=직접 다운로드 / 다중=ZIP 다운로드

## 7. 예외 처리 & 엣지 케이스

- 이미지 아닌 파일: 거부하고 안내 메시지 표시.
- 브라우저가 못 읽는 포맷(예: HEIC): 해당 파일만 실패로 표시, 나머지는 계속 진행.
- JPEG/WebP 출력 + 투명 영역: 흰 배경 합성으로 검게 나오는 것 방지.
- PNG 출력: 무손실이라 품질 슬라이더 비활성.
- 선택 파일 0개: `변환` 버튼 비활성.
- 많은 파일/큰 이미지: 순차 처리 + 진행률 노출로 응답성 유지.
- 구형 브라우저 WebP 인코딩 미지원 가능성: 실패 시 사용자에게 알림(최신 브라우저 권장).

## 8. 테스트 전략

- **단위 테스트**: `converter.js`의 순수 로직(`formatToMime`, `resolveQuality`,
  `renameTo`)을 브라우저/Node에서 실행 가능한 가벼운 테스트로 검증.
  빌드 없는 구조를 유지하기 위해 무거운 테스트 러너는 도입하지 않는다.
- **수동 검증**: canvas 인코딩 품질은 기존 17장 샘플 이미지로 브라우저 체크리스트
  검증(PNG→JPEG/WebP, 품질 변화, 일괄 ZIP, 투명 PNG 합성, 실패 파일 처리).

## 9. 배포

1. 로컬 `git init` → 원격 `origin` 연결(완료) → `main` push.
2. GitHub 저장소 **Settings → Pages → Source: `main` / (root)** 활성화.
   (`gh` CLI 미설치 — 이 토글은 웹 UI에서 사용자가 직접 수행)
3. `.nojekyll` 포함으로 Jekyll 처리 우회.
4. 배포 URL: https://blackrabbitdeveloper.github.io/convert-to-image/

## 10. 성공 기준

- 브라우저에서 PNG/JPEG/WebP 상호 변환이 동작한다.
- 품질 슬라이더로 JPEG/WebP 용량이 실제로 조절되고 절감률이 표시된다.
- 여러 장을 한 번에 변환해 ZIP으로 받을 수 있다.
- 투명 PNG를 JPEG로 변환해도 배경이 검게 깨지지 않는다.
- GitHub Pages URL에서 설치 없이 바로 사용 가능하다.

## 11. 변경 이력

### v1.1 (2026-06-29) — 썸네일 + 다운로드 후 자동 초기화

- **썸네일 미리보기**: 파일을 추가할 때 `URL.createObjectURL(file)`로 썸네일 URL을
  만들어 목록 각 행 왼쪽에 44×44 미리보기(`object-fit: cover`)를 표시한다.
  목록을 비울 때 모든 썸네일 URL을 `revokeObjectURL`로 해제한다(메모리 누수 방지).
- **다운로드 즉시 자동 초기화**: 단일/ZIP 다운로드를 트리거한 직후 `resetAll()`로
  목록·결과·썸네일을 비우고 변환 버튼을 비활성화하며 `fileInput.value`를 초기화해
  같은 파일을 다시 선택할 수 있게 한다. 간단한 안내 문구를 표시한다.
- 두 변경 모두 DOM/브라우저 동작이며 `converter.js` 순수 함수는 바뀌지 않으므로
  단위 테스트(8개)는 그대로 유지되고, 검증은 브라우저 체크리스트로 한다.
