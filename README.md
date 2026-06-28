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
