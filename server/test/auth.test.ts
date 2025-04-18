import fetch from 'node-fetch';
import { expect } from 'chai';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'testPassword123'
};

describe('Authentication API Tests', () => {
  let accessToken: string;
  let refreshToken: string;

  it('should handle CORS preflight requests', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'chrome-extension://test-extension-id',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    expect(response.status).to.equal(204);
    expect(response.headers.get('access-control-allow-origin')).to.include('chrome-extension://');
    expect(response.headers.get('access-control-allow-methods')).to.include('POST');
  });

  it('should register a new user', async () => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'chrome-extension://test-extension-id'
      },
      body: JSON.stringify(TEST_USER)
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data).to.have.property('accessToken');
    expect(data).to.have.property('refreshToken');
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
  });

  it('should login with valid credentials', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'chrome-extension://test-extension-id'
      },
      body: JSON.stringify(TEST_USER)
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data).to.have.property('accessToken');
    expect(data).to.have.property('refreshToken');
  });

  it('should refresh token successfully', async () => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'chrome-extension://test-extension-id'
      },
      body: JSON.stringify({ refreshToken })
    });

    expect(response.status).to.equal(200);
    const data = await response.json();
    expect(data).to.have.property('accessToken');
    expect(data).to.have.property('refreshToken');
  });

  it('should handle invalid token', async () => {
    const response = await fetch(`${API_URL}/api/protected`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Origin': 'chrome-extension://test-extension-id'
      }
    });

    expect(response.status).to.equal(401);
  });

  it('should access protected route with valid token', async () => {
    const response = await fetch(`${API_URL}/api/protected`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'chrome-extension://test-extension-id'
      }
    });

    expect(response.status).to.equal(200);
  });
}); 