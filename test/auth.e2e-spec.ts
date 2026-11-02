import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('harus mengembalikan format error envelope 400 jika payload tidak valid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'bukan-email',
          password: 'pendek',
        });

      expect(response.status).toBe(400);
      expect(response.body.isError).toBe(true);
      expect(response.body.data).toBeNull();
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('harus menolak registrasi dengan domain email non-TelU', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'user@gmail.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.isError).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('@student.telkomuniversity.ac.id'),
        ]),
      );
    });
  });

  describe('GET /api/auth/me', () => {
    it('harus mengembalikan 401 jika header Authorization tidak disertakan', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.isError).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('Access token tidak ditemukan');
    });

    it('harus mengembalikan 401 jika token Authorization tidak valid', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-dummy-token');

      expect(response.status).toBe(401);
      expect(response.body.isError).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('Access token tidak valid');
    });
  });
});
