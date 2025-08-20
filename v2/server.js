const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbPool, initializeDatabase } = require('./database/init');

const app = express();
app.use(express.json());

initializeDatabase();

// 개별 상품 상세 조회
app.get('/v2/api/products/:id', (req, res) => {
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


app.post('/v2/api/orders', (req, res) => {
    const startTime = Date.now();

    const { productId, quantity } = req.body;
    console.log(`주문 요청: 상품 $${productId}, 수량 $${quantity}`);
    
    const db = dbPool.getConnection();
    
    db.get("SELECT id, name, price, stock FROM products WHERE id = ?", [productId], (err, product) => {
        if (err || !product) {
            res.status(404).json({ 
                error: '상품을 찾을 수 없습니다',
                version: 'v2'
            });
            return;
        }
        
        if (product.stock < quantity) {
            res.status(400).json({ 
                error: '재고가 부족합니다',
                version: 'v2'
            });
            return;
        }
        
        const totalPrice = product.price * quantity;
        const orderId = uuidv4();
        
        db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [quantity, productId], function(err) {
            if (err) {
                res.status(500).json({ 
                    error: err.message,
                    version: 'v2'
                });
                return;
            }
            
            db.run("INSERT INTO orders (id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)", 
                [orderId, productId, quantity, totalPrice], function(err) {
                
                if (err) {
                    res.status(500).json({ 
                        error: err.message,
                        version: 'v2'
                    });
                    return;
                }
                
                const responseTime = Date.now() - startTime;
                console.log(`주문 완료 [v2] - ${responseTime}ms`);
                
                res.json({
                    order: {
                        id: orderId,
                        productName: product.name,
                        quantity: quantity,
                        totalPrice: totalPrice,
                        remainingStock: product.stock - quantity
                    },
                    responseTime: `${responseTime}ms`,
                });
            });
        });
    });
});


// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 쇼핑몰 서버가 포트 ${PORT}에서 실행중입니다`);
    console.log(`   GET  http://localhost:${PORT}/v2/api/products/:id`);
    console.log(`   POST http://localhost:${PORT}/v2/api/orders`);
});