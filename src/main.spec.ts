import { describe, it, expect, afterEach, vi } from 'vitest';
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import request from 'supertest';
import { configureApp } from './main.js';

class LargePayloadDto {
  @IsString()
  content: string;
}

@Controller('test-payload')
class TestPayloadController {
  @Post()
  @HttpCode(200)
  receive(@Body() dto: LargePayloadDto) {
    return {
      receivedBytes: Buffer.byteLength(dto.content, 'utf8'),
    };
  }
}

describe('main configureApp', () => {
  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('harus menerima body JSON berukuran 500KB (batas 2MB)', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [TestPayloadController],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const content500Kb = 'a'.repeat(500 * 1024);
    const response = await request(app.getHttpServer())
      .post('/api/test-payload')
      .send({ content: content500Kb });

    expect(response.status).toBe(200);
    expect(response.body.receivedBytes).toBe(500 * 1024);
  });

  it('harus menolak body JSON yang melebihi 2MB dengan status 413', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [TestPayloadController],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const contentOver2Mb = 'a'.repeat(2.1 * 1024 * 1024);
    const response = await request(app.getHttpServer())
      .post('/api/test-payload')
      .send({ content: contentOver2Mb });

    expect(response.status).toBe(413);
    expect(response.body.isError).toBe(true);
  });

  it('harus memanggil app.set("trust proxy", n) bila TRUST_PROXY_HOPS > 0', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestPayloadController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'TRUST_PROXY_HOPS') return '2';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    const adapterSetSpy = vi.spyOn(app.getHttpAdapter(), 'set');

    configureApp(app);

    expect(adapterSetSpy).toHaveBeenCalledWith('trust proxy', 2);
    expect(app.getHttpAdapter().getInstance().get('trust proxy')).toBe(2);
  });

  it('tidak boleh memanggil app.set("trust proxy", ...) bila TRUST_PROXY_HOPS <= 0 atau tidak valid', async () => {
    for (const rawValue of ['0', '-1', '', 'abc', undefined]) {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [TestPayloadController],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: vi.fn((key: string) => {
                if (key === 'TRUST_PROXY_HOPS') return rawValue;
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testApp =
        moduleFixture.createNestApplication<NestExpressApplication>();
      const adapterSetSpy = vi.spyOn(testApp.getHttpAdapter(), 'set');
      const prevEnv = process.env.TRUST_PROXY_HOPS;
      delete process.env.TRUST_PROXY_HOPS;

      try {
        configureApp(testApp);
        expect(adapterSetSpy).not.toHaveBeenCalledWith(
          'trust proxy',
          expect.anything(),
        );
        expect(testApp.getHttpAdapter().getInstance().get('trust proxy')).toBe(
          false,
        );
      } finally {
        if (prevEnv !== undefined) {
          process.env.TRUST_PROXY_HOPS = prevEnv;
        }
        await testApp.close();
      }
    }
  });
});

