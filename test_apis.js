const http = require('http');

const request = (options, postData = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch(e) {}
                resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on('error', (e) => reject(e));
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
};

async function runTests() {
    console.log("🚀 Starting End-to-End API Testing...\n");
    let jwtToken = '';
    let userId = '';
    let restaurantId = '';

    try {
        console.log("Waiting for services to be ready...");
        await new Promise(r => setTimeout(r, 5000));

        // ==========================================
        // 1. User Service (Port 3001)
        // ==========================================
        console.log("--- 1. Testing User Service (Port 3001) ---");
        const uniqueEmail = `testuser${Date.now()}@example.com`;
        
        console.log("-> Registering new user...");
        const registerRes = await request({
            hostname: 'localhost', port: 3001, path: '/api/auth/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Test User', email: uniqueEmail, password: 'password123', role: 'CUSTOMER'
        });
        console.log("Register Response:", registerRes.statusCode);
        
        console.log("-> Logging in...");
        const loginRes = await request({
            hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: uniqueEmail, password: 'password123'
        });
        
        if (loginRes.statusCode !== 200 || !loginRes.body.token) {
            throw new Error("Login failed or token missing");
        }
        jwtToken = loginRes.body.token;
        userId = loginRes.body.user.id;
        console.log("Login Successful! JWT Token acquired. User ID:", userId);

        // ==========================================
        // 2. Restaurant Service (Port 8001)
        // ==========================================
        console.log("\n--- 2. Testing Restaurant Service (Port 8001) ---");
        console.log("-> Creating a restaurant...");
        const restRes = await request({
            hostname: 'localhost', port: 8001, path: '/api/v1/restaurants', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` }
        }, {
            name: "Test Restaurant", city: "Mumbai", cuisine: "Indian", 
            menu: [
                { itemId: "m1", name: "Biryani", price: 200, category: "MAIN_COURSE" },
                { itemId: "m2", name: "Raita", price: 50, category: "STARTER" }
            ]
        });
        console.log("Create Restaurant Response:", restRes.statusCode);
        console.log("Restaurant Body:", JSON.stringify(restRes.body, null, 2));
        restaurantId = restRes.body._id || restRes.body.id || "1"; // Handle fallback
        console.log("Restaurant created with ID:", restaurantId);


        // ==========================================
        // 3. Order Service (Port 8080)
        // ==========================================
        console.log("\n--- 3. Testing Order Service (Port 8080) & Payment (Sync) ---");
        console.log("-> Creating an order...");
        const orderRes = await request({
            hostname: 'localhost', port: 8080, path: '/api/orders', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwtToken}` }
        }, {
            customerName: "Test User",
            restaurantId: restaurantId,
            restaurantName: "Test Restaurant",
            items: [
                { itemName: "Biryani", quantity: 2, price: 200.00 }
            ],
            paymentMode: "CARD",
            deliveryAddress: "Mumbai, India"
        });
        
        console.log("Create Order Response:", orderRes.statusCode);
        console.log("Order Data:", JSON.stringify(orderRes.body, null, 2));

        if (orderRes.statusCode === 201) {
            console.log("\n✅ SUCCESS: Order was created successfully, and Payment completed synchronously!");
        } else {
            console.error("\n❌ ERROR: Order creation failed.");
        }

    } catch (e) {
        console.error("\n❌ Test Failed:", e.message);
    }
}

runTests();
