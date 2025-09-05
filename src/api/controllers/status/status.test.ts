import request from 'supertest';
import app from '../../../app';

describe('Health Check', () => {
  it('should return 200 OK for the health check', async () => {
    const res = await request(app).get('/api/v1/healthz');
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Service is healthy');
  });
});
