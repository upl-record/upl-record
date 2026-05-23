# 경기 로그 관리

앱은 경기 기록 표의 `로그` 열에 표시된 번호를 기준으로 로그 파일을 찾습니다.

## 경로 규칙

```text
match_logs/{시즌}/{경기ID}.{확장자}
```

예시:

```text
match_logs/S1/0001.txt
match_logs/S1/0001.jpg
match_logs/S1/0001.jpeg
match_logs/S1/0001.png
match_logs/S1/0001-01.jpg
match_logs/S1/0001-02.png
match_logs/S6/1790.txt
```

- 시즌 폴더는 `S1`부터 `S6`까지 준비되어 있습니다.
- 경기 ID는 앱의 경기 기록 표에서 `#0001`처럼 표시됩니다.
- 텍스트 로그는 `.txt`, 이미지 로그는 `.jpg`, `.jpeg`, `.png`를 사용할 수 있습니다.
- 파일명은 숫자 4자리로 맞춰주세요. 예: `1`번 경기 -> `0001.txt`
- 이미지가 여러 장이면 `0001-01.jpg`, `0001-02.jpeg`, `0001-03.png`처럼 뒤에 순번을 붙입니다.
- 여러 장 이미지 로그는 한 경기당 최대 30장까지 자동 조회합니다.
- GitHub Pages에 반영하려면 `match_logs` 폴더 전체를 함께 업로드하면 됩니다.

## 텍스트 로그 양식

텍스트 로그는 자유롭게 써도 됩니다. 기본 양식은 `_templates/match-log-template.txt`를 복사해서 쓰면 됩니다.

## 여러 장 이미지 로그 양식

여러 장 이미지 로그는 `_templates/multi-image-log-template.txt`를 참고해서 같은 경기 ID에 순번만 붙여 저장하면 됩니다.

예시:

```text
match_logs/S3/0812-01.jpg
match_logs/S3/0812-02.jpeg
match_logs/S3/0812-03.png
```
