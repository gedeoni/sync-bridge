import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const dbPath = 'sync-bridge-test.db';
  const authToken = 'test-secret-token';

  beforeAll(async () => {
    jest.setTimeout(30000);
    process.env.NODE_ENV = 'development';
    process.env.DB_PATH = dbPath;
    process.env.APP_AUTH_TOKEN = authToken;

    // Remove old test db if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Clean up test database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('/api/v1/healthz (GET)', () => {
    it('should be public and return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/healthz')
        .expect(200);

      expect(response.body.status).toBe(200);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data.read).toBe(true);
      expect(response.body.data.write).toBe(true);
    });
  });

  describe('Authorization checks', () => {
    it('should reject requests without auth token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sync/stats')
        .expect(401);
    });

    it('should reject requests with invalid auth token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sync/stats')
        .set('x-auth-token', 'wrong-token')
        .expect(401);
    });

    it('should accept requests with valid auth token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sync/stats')
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.status).toBe(200);
    });
  });

  describe('/api/v1/sync (POST)', () => {
    it('should fail with 400 when sync payload is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sync')
        .set('x-auth-token', authToken)
        .send({
          model: 'customers',
          data: [
            {
              email: 'invalid-email',
            },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });

    it('should successfully sync customer payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sync')
        .set('x-auth-token', authToken)
        .send({
          model: 'customers',
          data: [
            {
              email: 'e2e@example.com',
              first_name: 'E2E',
              last_name: 'Tester',
            },
          ],
        })
        .expect(201);

      expect(response.body.status).toBe(200);
      expect(response.body.message).toBe('Sync successful');
      expect(response.body.data.results).toHaveLength(1);
    });
  });

  describe('/api/v1/sync-history (GET)', () => {
    it('should list and paginate the sync histories', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sync-history')
        .set('x-auth-token', authToken)
        .expect(200);

      expect(response.body.status).toBe(200);
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
    });
  });
});
