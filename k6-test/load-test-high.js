import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    stages: [
        { duration: '30s', target: 110 },   // 평상시 안정 상태
        { duration: '15s', target: 880 },   // 🚀 급격한 스파이크! (바이럴 시작)
        { duration: '3m', target: 880 },    // 바이럴 지속 (고부하 유지)  
        { duration: '1m', target: 110 },    // 점진적 정상화
        { duration: '20s', target: 0 },     // 테스트 종료
    ],
    thresholds: {
        'http_req_duration{name:products}': ['p(95)<=200'],  
        'http_req_duration{name:orders}': ['p(95)<=400'],    
        http_reqs: ['rate>=320'], // 바이럴 대응 목표 (320+ RPS)
        http_req_failed: ['rate<0.1'],
    },
};

const BASE_URL = 'https://shopping-mall.dev-k8s.goorm.io/v2';
const TOTAL_PRODUCTS = 500;

export default function () {
    // 10% 확률로 구매 사용자, 90% 확률로 브라우징 사용자
    const isPurchaseUser = Math.random() < 0.1;
    
    if (isPurchaseUser) {
        purchaseUserScenario();
    } else {
        browsingUserScenario();
    }
}

function browsingUserScenario() {
    // 상품 상세 조회 5번
    for (let i = 0; i < 5; i++) {
        const randomProductId = randomIntBetween(1, TOTAL_PRODUCTS);
        
        const response = http.get(`${BASE_URL}/api/products/${randomProductId}`, {
            tags: { name: 'products' }
        });
        
        check(response, {
            '상품 상세 조회 성공': (r) => r.status === 200,
            '상품 데이터 존재': (r) => r.status === 200 && JSON.parse(r.body).product !== undefined,
        });
        
        // 1-3초 머물기
        sleep(randomIntBetween(1, 3));
    }
}

function purchaseUserScenario() {
    // 1. 상품 상세 조회 5번
    for (let i = 0; i < 5; i++) {
        const randomProductId = randomIntBetween(1, TOTAL_PRODUCTS);
        
        const response = http.get(`${BASE_URL}/api/products/${randomProductId}`, {
            tags: { name: 'products' }
        });
        
        check(response, {
            '상품 상세 조회 성공': (r) => r.status === 200,
            '상품 데이터 존재': (r) => r.status === 200 && JSON.parse(r.body).product !== undefined,
        });
        
        // 1-3초 머물기
        sleep(randomIntBetween(1, 3));
    }
    
    // 2. 주문하기
    const orderData = {
        productId: randomIntBetween(1, TOTAL_PRODUCTS),
        quantity: randomIntBetween(1, 3)
    };
    
    const orderResponse = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify(orderData),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'orders' }
        }
    );
    
    check(orderResponse, {
        '주문 성공': (r) => r.status === 200,
        '주문 응답 포함': (r) => r.status === 200 && r.body.includes('주문이 완료되었습니다'),
    });
    
    // 완료 후 1초 대기
    sleep(1);
}