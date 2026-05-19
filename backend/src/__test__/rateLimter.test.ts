import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server'; 

describe('GraphQL Rate Limiter (Integration Test)', () => {

  it('should allow up to 5 requests and block the 6th one', async () => {
    const query = { query: `query { __schema { queryType { name } } }` };

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/graphql').send(query);
      expect(res.status).toBe(200);
    }

    const blockedResponse = await request(app).post('/graphql').send(query);
    expect(blockedResponse.status).toBe(429);
  }, 10000); 
});