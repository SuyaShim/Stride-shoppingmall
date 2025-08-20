# Stride #19
Goorm Stride #19. 우리 서비스, 몇 명까지 버틸 수 있을까? 에서 사용된 리소스 정리한 Repository입니다.

[관련 Notion](https://www.notion.so/goorm/STRIDE-19-2424e6997fb0809f8c51c8a7ec53d086?source=copy_link)

<br>

## 파일 구조
```
.
├── README.md
├── k6-test
│   ├── load-test-high.js
│   ├── load-test-v1.js
│   └── load-test-v2.js
├── k8s
│   ├── ingress.yaml
│   ├── v1.yaml
│   └── v2.yaml
├── v1
│   ├── database
│   ├── Dockerfile
│   ├── node_modules
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
└── v2
    ├── database
    ├── Dockerfile
    ├── node_modules
    ├── package-lock.json
    ├── package.json
    └── server.js

9 directories, 15 files
```

- `k6-test`: k6로 작성된 부하 테스트 스크립트
    - `load-test-high.js`: 고부하 테스트를 위한 스크립트
    - `load-test-v1.js`: v1 버전을 위한 부하 테스트 스크립트
    - `load-test-v2.js`: v2 버전을 위한 부하 테스트 스크립트
- `k8s`: Kubernetes 관련 설정 파일
- `v1/`: v1 버전 소스 - 성능 낮은 버전
- `v2/`: v2 버전 소스 코드 - 성능 개선 버전

<br>

## 실행 방법
### 로컬 실행
1. shoppingmall 서버 실행
    ```bash
    # v1 서버 실행
    cd v1
    npm install
    npm start

    # v2 서버 실행
    cd .v2
    npm install
    npm start
    ```

2. 부하 주입할 URL 수정 (`k6-test/` 스크립트 파일)
    ```js
    // k6-test/load-test-v1.js
    const BASE_URL = 'https://localhost:3000/v1';

    // k6-test/load-test-v2.js
    const BASE_URL = 'https://localhost:3000/v2';
    ```

3. 부하테스트 실행
    ```bash
    # v1 부하 테스트
    cd k6-test
    k6 run load-test-v1.js

    # v2 부하 테스트
    k6 run load-test-v2.js
    ```

### Docker 실행
1. Docker 이미지 풀
    - ARM64 환경 (Mac)
    ```bash
        docker pull public.ecr.aws/e3w6j8z3/suya/stride:v1-arm64
        docker pull public.ecr.aws/e3w6j8z3/suya/stride:v2-arm64
    ```

    - AMD64 환경
    ```bash
        docker pull public.ecr.aws/e3w6j8z3/suya/stride:v1
        docker pull public.ecr.aws/e3w6j8z3/suya/stride:v2
    ```

2. Docker 컨테이너 실행
    ```bash
    # v1 실행
    docker run -d -p 3000:3000 public.ecr.aws/e3w6j8z3/suya/stride:v1

    # v2 실행
    docker run -d -p 3000:3000 public.ecr.aws/e3w6j8z3/suya/stride:v2
    ```

3. 부하 주입할 URL 수정 (`k6-test/` 스크립트 파일)
    ```js
    // k6-test/load-test-v1.js
    const BASE_URL = 'https://localhost:3000/v1';

    // k6-test/load-test-v2.js
    const BASE_URL = 'https://localhost:3000/v2';
    ```

4. 부하테스트 실행
    ```bash
    # v1 부하 테스트
    cd k6-test
    k6 run load-test-v1.js

    # v2 부하 테스트
    k6 run load-test-v2.js
    ```