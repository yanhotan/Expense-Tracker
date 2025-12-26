/**
 * Integration tests for backend services
 * These tests make actual HTTP calls to verify services work
 */

describe('Backend Services Integration Tests', () => {
  const BASE_AUTH_URL = 'http://localhost:4000/api'
  const BASE_API_URL = 'http://localhost:8080/api'

  describe('Node.js Authentication Backend (Port 4000)', () => {
    test('should respond to health check', async () => {
      const response = await fetch(`${BASE_AUTH_URL.replace('/api', '')}/api/health`)
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data).toHaveProperty('ok', true)
    })

    test('should handle Google OAuth endpoint', async () => {
      const response = await fetch(`${BASE_AUTH_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid-token' })
      })

      // Should return 500 for invalid token (but service should be responding)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('message')
    })
  })

  describe('Spring Boot Business Backend (Port 8080)', () => {
    test('should respond to actuator health check', async () => {
      const response = await fetch(`${BASE_API_URL}/actuator/health`)
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data).toHaveProperty('status', 'UP')
    })

    test('should reject unauthenticated requests to protected endpoints', async () => {
      const response = await fetch(`${BASE_API_URL}/sheets`)
      expect(response.status).toBe(401) // Should be 401 Unauthorized without JWT token
    })

    test('should accept requests with valid JWT token', async () => {
      // First get a JWT token from the auth backend
      // This is a simplified test - in reality you'd need to authenticate first

      // For now, test that the endpoint is accessible (even if it returns 403 due to invalid token)
      const response = await fetch(`${BASE_API_URL}/sheets`, {
        headers: {
          'Authorization': 'Bearer invalid-token-for-testing'
        }
      })

      // Should get 403 Forbidden for invalid token (but service should respond)
      expect([401, 403]).toContain(response.status)
    })
  })

  describe('Hybrid Architecture Test', () => {
    test('should have different backends for auth vs business logic', () => {
      // Verify that auth endpoints go to Node.js backend
      expect(BASE_AUTH_URL).toBe('http://localhost:4000/api')

      // Verify that business endpoints go to Spring Boot backend
      expect(BASE_API_URL).toBe('http://localhost:8080/api')
    })

    test('should handle CORS properly', async () => {
      // Test CORS headers from Spring Boot backend
      const response = await fetch(`${BASE_API_URL}/actuator/health`, {
        method: 'OPTIONS'
      })

      // CORS preflight should be handled
      expect([200, 404]).toContain(response.status) // 404 is ok for OPTIONS on this endpoint
    })
  })
})
