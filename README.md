# 🏰 FitBuddy AI Magic Castle - 스마트 피트니스 마법 왕국

> **귀여운 캐릭터 마스코트 버디(Buddy)와 AI 기술이 접목된 동화 같은 스마트 피트니스/체육관 관리 플랫폼입니다.**

---

## 🖥️ 홈페이지 프리뷰 (Preview)

| 메인 레인보우 드림 테마 | 다크 글래스모피즘 랜딩 |
| :---: | :---: |
| ![Rainbow Dream](src/main/resources/static/assets/images/fitbuddy_rainbow_dream.jpg) | ![Landing Mockup](src/main/resources/static/assets/images/fitbuddy_landing_mockup.jpg) |

| 메인 마스코트 버디 (Buddy) | 대시보드 및 상세 UI |
| :---: | :---: |
| ![Mascot](src/main/resources/static/assets/images/mascot.png) | ![Home Preview](src/main/resources/static/assets/images/fitbuddy_home_preview.jpg) |

---

## 📹 실제 동작 데모 (Demo Video)

![FitBuddy AI Demo](src/main/resources/static/assets/images/fitbuddy_demo.gif)

---

## 🌟 주요 화면 및 제공 기능 (디즈니 마법 테마 개편 ✨)

### 1. 성문 체크인 포탈 & 마법 물약 혼잡도 인디케이터 (Check-In & Out)
- **성문 출결 시스템**: 회원 ID(전화번호 숫자)를 입력하여 가상으로 출석(체크인) 및 퇴장(체크아웃)을 처리할 수 있으며, 마법 키패드를 제공합니다.
- **마법의 물약 병 혼잡도 (Elixir Potion Bottle)**: 이용 인원에 따라 물약 병 안의 마법 진액이 파도치며 실시간으로 차오르거나 줄어듭니다. 물약 상태에 따라 색상(Green: 여유, Blue/Purple: 보통, Red/Pink: 혼잡)이 동적으로 변화하며 귀여운 행잉 라벨 태그에 수치가 표기됩니다.

### 2. AI 코치 버디(Buddy) 라이브 채팅 위젯
- **지능형 운동 가이드**: 우측 하단의 마법 램프 버튼을 클릭하면 귀여운 3D 마스코트 버디가 인사하며 실시간 운동 추천, 식단 관리 팁, 멤버십 할인 쿠폰 정보를 안내해 줍니다.
- **하이브리드 예외 처리**: 백엔드 DB 서버가 오프라인일 경우에도 프론트엔드 자체 시뮬레이션 모드로 매끄럽게 작동하도록 구성되어 있습니다.
- **버디의 동적 상태 모션**: '기본 버디', '파워 버디(번개 스파크 오버레이)', '졸린 버디(달무리/별빛 오버레이)' 상태를 전환하면 캐릭터 외곽의 오라 효과와 모션이 변합니다.

### 3. 황금 보물 상자 PT 체험권 (3D Open & Confetti)
- **보물 상자 이벤트**: 메인 화면의 3D 보물 상자를 마우스로 클릭하면 상자가 요동치다 뚜껑이 뒤로 열리는(3D RotateX) 모션과 함께, 화면 가득 화려한 무지개 별빛 색종이(Confetti)들이 날리며 특별 황금 바코드 쿠폰이 발급됩니다.

### 4. 소통 제안의 마법 두루마리 건의함
- **불편 및 건의사항 접수**: 시설 불편 사항 등을 입력하면 사장님 및 트레이너에게 건의 내역이 전송되는 폼(Form)이 고풍스러운 양장 마법 두루마리(Scroll) 디자인 및 깃펜(Quill Pen) 아이콘과 함께 제공됩니다.

### 5. 마법 별밭 밤하늘 & 별가루 마우스 트레일
- **Twinkling Starfield**: HTML5 Canvas를 활용하여 배경 밤하늘에 반짝이며 빛나는 아기자기한 별밭을 가볍고 고성능으로 렌더링합니다.
- **별가루 매직 트레일 (Wand Trail)**: 마우스를 움직일 때마다 요술 지팡이 끝에서 떨어지듯 귀여운 파스텔톤 별과 하트(`✨`, `⭐`, `🌟`, `💫`)들이 회전하며 아래로 낙하해 사라지는 마법 연출 효과가 탑재되어 있습니다.

### 6. 마법 오케스트라 사운드 신디사이저 (Web Audio API)
- 별도의 MP3 오디오 파일 없이 웹 브라우저에서 실시간으로 사운드 오실레이터를 합성하여 **귀여운 버블 클릭 소리**, **도-미-솔-도 아르페지오 황금 차임음**, **실패 시 뿅뿅 거리는 cartoon buzzer 소리**를 입체적으로 재생합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla CSS, JS (ES6+), Bootstrap 5, Animate.css, Canvas Confetti
- **Backend**: Spring Boot, Java 21, JPA/Hibernate, MyBatis, Spring Security
- **Database**: PostgreSQL (Supabase Cloud hosting)
- **AI Integration**: Anthropic Messages API (Claude model Integration)

---

## 🚀 시작 가이드 (Quick Start)

### 1. 서버 구동
로컬 터미널(PowerShell) 환경에서 다음 명령어를 실행하여 서버를 시작합니다.

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.10"; .\gradlew bootRun
```

### 2. 브라우저 접속
서버 구동 완료 후 웹 브라우저를 통해 아래 주소로 접속해 주세요.
- **URL**: [http://localhost:8181/](http://localhost:8181/)
