import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api-docs';
export const BEARER_AUTH_NAME = 'bearer';

// ENABLE_SWAGGER=true/false memaksa nyala/mati.
// Jika tidak di-set: aktif, kecuali NODE_ENV=production.
export function isSwaggerEnabled(): boolean {
  const flag = process.env.ENABLE_SWAGGER?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function createSwaggerDocument(app: INestApplication) {
  const builder = new DocumentBuilder()
    .setTitle('Telu Knowledge API')
    .setDescription(
      'REST API untuk platform Telu Knowledge. Autentikasi menggunakan access token Supabase (Bearer JWT) yang didapat dari endpoint login.',
    )
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan access_token dari POST /api/auth/login',
      },
      BEARER_AUTH_NAME,
    );

  // Jika API_BASE_URL tidak di-set, Swagger UI memakai origin halaman saat ini
  const serverUrl = process.env.API_BASE_URL;
  if (serverUrl) {
    builder.addServer(serverUrl);
  }

  return SwaggerModule.createDocument(app, builder.build());
}

export function setupSwagger(app: INestApplication) {
  const document = createSwaggerDocument(app);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  return document;
}
