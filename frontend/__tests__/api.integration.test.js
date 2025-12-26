// Comprehensive integration tests for Expense Tracker API services
// Tests unified Spring Boot backend (port 8080) for all services

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');

// Simple fetch implementation for Node.js
async function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        const method = options.method || 'GET';
        const headers = options.headers || {};

        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
            headers['Content-Type'] = 'application/json';
        }

        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method,
            headers
        };

        const req = protocol.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = data ? JSON.parse(data) : {};
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: res.headers,
                        json: async () => jsonData,
                        text: async () => data
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        statusText: res.statusMessage,
                        headers: res.headers,
                        json: async () => ({}),
                        text: async () => data
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Test configuration
const CONFIG = {
    SPRING_BOOT_BASE: 'http://localhost:8080/api',
    FRONTEND_BASE: 'http://localhost:3000',
    TEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
};

// Helper function for retries
async function retryRequest(fn, attempts = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === attempts - 1) throw error;
            console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Test data
const TEST_DATA = {
    googleIdToken: 'test_token_for_unit_tests', // This will fail but test the endpoint
    userId: '550e8400-e29b-41d4-a716-446655440000',
    sheetData: {
        name: 'Test Expense Sheet',
        pin: '1234'
    },
    expenseData: {
        date: '2024-01-15',
        amount: 50.00,
        category: 'Food',
        description: 'Lunch at restaurant',
        sheetId: '550e8400-e29b-41d4-a716-446655440001'
    },
    categoryData: {
        category: 'Transportation',
        sheetId: '550e8400-e29b-41d4-a716-446655440001'
    }
};

describe('Expense Tracker API Integration Tests', () => {
    let jwtToken = null;

    beforeAll(async () => {
        // Wait for services to be ready
        console.log('🧪 Waiting for services to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }, CONFIG.TEST_TIMEOUT);

    describe('🔧 Service Health Checks', () => {
        test('Spring Boot backend should be running', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/actuator/health`);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data).toHaveProperty('status', 'UP');
            });
        }, CONFIG.TEST_TIMEOUT);

        test('Frontend should be running', async () => {
            await retryRequest(async () => {
                const response = await fetch(CONFIG.FRONTEND_BASE);
                expect([200, 307, 404]).toContain(response.status); // Accept 200, 307 (redirect), or 404
            });
        }, CONFIG.TEST_TIMEOUT);
    });

    describe('🔐 Authentication Service (Spring Boot Backend)', () => {
        test('should reject invalid Google ID token', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/google`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        idToken: TEST_DATA.googleIdToken
                    })
                });

                expect(response.status).toBe(500); // Should fail with test token
                const data = await response.json();
                expect(data).toHaveProperty('success', false);
                expect(data).toHaveProperty('error');
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should handle missing ID token', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/google`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                expect(response.status).toBe(400);
                const data = await response.json();
                expect(data).toHaveProperty('success', false);
                expect(data).toHaveProperty('error');
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should have auth endpoints accessible', async () => {
            await retryRequest(async () => {
                // Test that the endpoint exists (even if it requires auth)
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer invalid_token'
                    }
                });

                // Should return 401 for invalid token, but endpoint should exist
                expect([401, 403, 500]).toContain(response.status);
            });
        }, CONFIG.TEST_TIMEOUT);
    });

    describe('📊 Business API Endpoints (Spring Boot Backend)', () => {
        test('should require authentication for protected endpoints', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/sheets`, {
                    method: 'GET'
                });

                // Should return 401 or 403 without auth
                expect([401, 403]).toContain(response.status);
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should handle CORS properly', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/sheets`, {
                    method: 'OPTIONS',
                    headers: {
                        'Origin': CONFIG.FRONTEND_BASE,
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'Authorization,Content-Type'
                    }
                });

                // CORS preflight should succeed
                expect([200, 204]).toContain(response.status);
                expect(response.headers['access-control-allow-origin']).toBeTruthy();
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should allow actuator health endpoint without auth', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/actuator/health`);
                expect(response.status).toBe(200);

                const data = await response.json();
                expect(data).toHaveProperty('status', 'UP');
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should allow auth endpoints without authentication', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/me`, {
                    method: 'GET'
                });

                // Should return 401 for no token, but endpoint should be accessible
                expect(response.status).toBe(401);
            });
        }, CONFIG.TEST_TIMEOUT);
    });

    describe('🔄 Frontend-Backend Integration', () => {
        test('frontend should be able to reach Spring Boot backend', async () => {
            // Test that frontend can reach Spring Boot backend for all services
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/actuator/health`);
                expect(response.status).toBe(200);
            });
        }, CONFIG.TEST_TIMEOUT);

        test('unified routing should work correctly', async () => {
            // All endpoints should go to Spring Boot (port 8080)
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: 'test' })
                });
                // Should respond (even with error), meaning Spring Boot backend handles auth
                expect(response.status).toBeDefined();
            });

            // Business endpoints should also go to Spring Boot
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/sheets`);
                // Should require auth (401/403), meaning Spring Boot backend handles business logic
                expect([401, 403]).toContain(response.status);
            });
        }, CONFIG.TEST_TIMEOUT);
    });

    describe('🚨 Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            // Test with invalid port
            try {
                await fetch('http://localhost:9999/api/health', { timeout: 5000 });
                fail('Should have thrown network error');
            } catch (error) {
                expect(error.code || error.message).toBeDefined();
            }
        }, 10000);

        test('should handle malformed JSON', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: 'invalid json'
                });

                expect(response.status).toBeGreaterThanOrEqual(400);
            });
        }, CONFIG.TEST_TIMEOUT);

        test('should handle missing required fields', async () => {
            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/sheets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                expect([400, 401, 403]).toContain(response.status);
            });
        }, CONFIG.TEST_TIMEOUT);
    });

    describe('📈 Performance Tests', () => {
        test('should respond within acceptable time limits', async () => {
            const startTime = Date.now();

            await retryRequest(async () => {
                const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/actuator/health`);
                expect(response.status).toBe(200);
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Should respond within 5 seconds
            expect(responseTime).toBeLessThan(5000);
        }, CONFIG.TEST_TIMEOUT);

        test('should handle concurrent requests', async () => {
            const requests = Array(5).fill().map(() =>
                retryRequest(async () => {
                    const response = await fetch(`${CONFIG.SPRING_BOOT_BASE}/actuator/health`);
                    expect(response.status).toBe(200);
                    return response;
                })
            );

            const results = await Promise.all(requests);
            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result.status).toBe(200);
            });
        }, CONFIG.TEST_TIMEOUT);
    });
});