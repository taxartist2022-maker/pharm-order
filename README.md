# 💊 PharmOrder - 약국 일반약 주문 관리

약국의 일반의약품 주간 주문액을 관리하는 웹 앱입니다.

## 핵심 기능

- **매출 기반 주문 계산** — 포스기 주간 매출의 N%를 권장 주문액으로 자동 계산 (비율 자유 조절)
- **일별 주문 기록** — 매일 주문한 금액을 날짜별로 기록하고 주간 합산 관리
- **월 최소 주문 추적** — 월 1,000만원 최소 주문 달성 여부 실시간 모니터링
- **은행 잔고 감시** — 3,000만원 최소 유지 기준 대비 현재 잔고 관리
- **CSV 내보내기** — 기록 데이터를 엑셀에서 열 수 있는 CSV로 다운로드

## GitHub Pages 배포 방법

### 1단계: GitHub 저장소 만들기

1. [github.com](https://github.com)에 로그인
2. 오른쪽 상단 **+** → **New repository** 클릭
3. Repository name: `pharm-order` (원하는 이름)
4. **Public** 선택 → **Create repository** 클릭

### 2단계: 코드 업로드

방법 A) **GitHub 웹에서 직접 업로드**
1. 생성된 저장소 페이지에서 **uploading an existing file** 클릭
2. 이 폴더의 모든 파일을 드래그 앤 드롭
3. **Commit changes** 클릭

방법 B) **Git 명령어 사용**
```bash
cd pharm-order-app
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/본인계정/pharm-order.git
git push -u origin main
```

### 3단계: GitHub Pages 활성화

1. 저장소 → **Settings** → 좌측 **Pages**
2. **Source**를 **GitHub Actions**으로 변경
3. 코드가 push되면 자동으로 빌드 & 배포됩니다

### 4단계: 사이트 확인

배포 완료 후 (1~2분 소요):
```
https://본인계정.github.io/pharm-order/
```

## 로컬 개발

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:5173)
npm run build   # 빌드 (dist 폴더 생성)
```

## 기술 스택

- React 19 + Vite
- localStorage 기반 데이터 저장 (서버 불필요)
- GitHub Pages 자동 배포 (GitHub Actions)
