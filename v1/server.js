const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbPool, initializeDatabase } = require('./database/init');

const crypto = require('crypto');

const app = express();
app.use(express.json());

initializeDatabase();

// CPU 작업
function cpuWork() {
    for (let i = 0; i < 400; i++) {
        crypto.createHash('sha256').update(`heavy-work-${i}-${Date.now()}`).digest('hex');
    }
}

// 메모리 낭비
function memoryWaste() {
    const wasteArray = new Array(2000).fill().map((_, i) => ({
        id: i,
        data: `waste-${Math.random()}`,
    }));
    return wasteArray.length;
}

// 개별 상품 상세 조회
app.get('/v1/api/products/:id', (req, res) => {
    const startTime = Date.now();
    const productId = req.params.id;
    
    const db = dbPool.getConnection();
    
    db.get(`
        SELECT 
            p.*,
            COALESCE(order_stats.order_count, 0) as order_count,
            COALESCE(order_stats.total_quantity, 0) as total_sold
        FROM products p
        LEFT JOIN (
            SELECT 
                product_id,
                COUNT(*) as order_count,
                SUM(quantity) as total_quantity
            FROM orders 
            WHERE product_id = ?
            GROUP BY product_id
        ) order_stats ON p.id = order_stats.product_id
        WHERE p.id = ?
    `, [productId, productId], (err, product) => {
        
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!product) {
            res.status(404).json({ 
                error: '상품을 찾을 수 없습니다',
            });
            return;
        }

        const responseTime = Date.now() - startTime;
        console.log(`🛍️ 상품 상세 조회  - ID ${productId} / 응답 시간: ${responseTime}ms`);

        res.json({
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                description: product.description,
                order_count: product.order_count,
                total_sold: product.total_sold
            },
            responseTime: `${responseTime}ms`
        });
    });
});


app.post('/v1/api/orders', (req, res) => {
    const startTime = Date.now();

    const { productId, quantity } = req.body;
    console.log(`주문 요청: 상품 $${productId}, 수량 $${quantity}`);

    cpuWork();
    memoryWaste();
    
    // 🐌 의도적 지연: 400ms
    setTimeout(() => {
        const db = dbPool.getConnection();
        
        // 트랜잭션 없이 개별 쿼리들을 순차적으로 실행
        db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
            if (err || !product) {
                res.status(404).json({ error: '상품을 찾을 수 없습니다' });
                return;
            }
            
            // 재고 재확인 (중복 쿼리)
            db.get("SELECT stock FROM products WHERE id = ?", [productId], (err, stockInfo) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                if (stockInfo.stock < quantity) {
                    res.status(400).json({ error: '재고가 부족합니다' });
                    return;
                }
                
                // 주문 생성 전 기존 주문 수 확인
                db.get("SELECT COUNT(*) as orderCount FROM orders WHERE product_id = ?", [productId], (err, orderStats) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    const totalPrice = product.price * quantity;

                    // 재고 업데이트와 주문 생성이 별도 쿼리 (트랜잭션 없음)
                    db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, productId], function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        const orderId = uuidv4();
                        
                        // 주문 생성
                        db.run("INSERT INTO orders (id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)", 
                            [orderId, productId, quantity, totalPrice], function(err) {
                            
                            if (err) {
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // 방금 생성한 주문을 다시 조회 (불필요)
                            db.get("SELECT * FROM orders WHERE id = ?", [orderId], (err, order) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                
                                // 응답을 위해 상품 정보 재조회(중복)
                                db.get("SELECT name, stock FROM products WHERE id = ?", [productId], (err, updatedProduct) => {
                                    if (err) {
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    
                                    const responseTime = Date.now() - startTime;
                                    console.log(`주문 완료 [v1] - ${responseTime}ms`);
                                    
                                    res.json({
                                        message: '주문이 완료되었습니다',
                                        order: {
                                            id: order.id,
                                            productName: updatedProduct.name,
                                            quantity: order.quantity,
                                            totalPrice: order.total_price,
                                            remainingStock: updatedProduct.stock
                                        },
                                        responseTime: `${responseTime}ms`,
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }, 400);
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 쇼핑몰 서버가 포트 ${PORT}에서 실행중입니다`);
    console.log(`   GET  http://localhost:${PORT}/v1/api/products/:id`);
    console.log(`   POST http://localhost:${PORT}/v1/api/orders`);
});