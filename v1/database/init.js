const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabasePool {
    constructor() {
        const dbPath = path.join(__dirname, 'products.db');
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                throw err;
            }
        });
        
        this.db.configure("busyTimeout", 1000);
    }
    
    getConnection() {
        return this.db;
    }
    
    close() {
        this.db.close();
    }
}

const dbPool = new DatabasePool();

function generateRandomProducts(count = 500) {
    const categories = ['전자제품', '의류', '도서', '가전', '스포츠', '뷰티', '식품', '완구', '생활용품', '자동차'];
    const brands = ['Apple', 'Samsung', 'LG', 'Nike', 'Adidas', 'Uniqlo', 'Zara', 'Sony', 'Microsoft', 'Google'];
    const adjectives = ['프리미엄', '베스트', '신제품', '인기', '한정판', '특가', '고급', '실용', '스마트', '편리한'];
    const products = [];
    
    for (let i = 1; i <= count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        
        const name = `${brand} ${adjective} ${category} ${i}`;
        const price = Math.floor(Math.random() * 2000000) + 10000; // 1만원 ~ 200만원
        const stock = Math.floor(Math.random() * 100) + 10; // 10개 ~ 109개
        const description = `${adjective} ${category} - ${brand} 브랜드의 고품질 제품입니다.`;
        
        products.push([name, price, stock, description]);
    }
    
    return products;
}

function initializeDatabase() {
    const db = dbPool.getConnection();
    
    db.serialize(() => {
        // products 테이블 생성
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT
        )`, (err) => {
            if (err) {
                console.error('products 테이블 생성 실패:', err.message);
            }
        });
        
        // orders 테이블 생성
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            product_id INTEGER,
            quantity INTEGER,
            total_price INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`, (err) => {
            if (err) {
                console.error('orders 테이블 생성 실패:', err.message);
            }
        });
        
        // 기존 데이터가 있는지 확인
        db.get("SELECT COUNT(*) as count FROM products", [], (err, row) => {
            if (err) {
                return;
            }
            
            if (row.count === 0) {
                const products = generateRandomProducts(500);
                
                const stmt = db.prepare("INSERT INTO products (name, price, stock, description) VALUES (?, ?, ?, ?)");
                
                let insertedCount = 0;
                const batchSize = 50; // 50개씩 배치로 처리
                
                for (let i = 0; i < products.length; i += batchSize) {
                    const batch = products.slice(i, i + batchSize);
                    
                    batch.forEach((product) => {
                        stmt.run(product, (err) => {
                            if (err) {
                                console.error(`상품 추가 실패:`, err.message);
                            } else {
                                insertedCount++;
                            }
                        });
                    });
                }
                console.log(`상품 추가 완료`);
                stmt.finalize();
            } else {
                console.log(`기존 상품 데이터 ${row.count}개 확인됨`);
            }
        });
    });
}

module.exports = {
    dbPool,
    initializeDatabase
};