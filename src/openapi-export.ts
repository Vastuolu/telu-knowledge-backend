import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { createSwaggerDocument } from './common/swagger/swagger.setup.js';

// Generate spesifikasi OpenAPI ke openapi.json tanpa menjalankan server.
// Jalankan lewat: npm run openapi:export
async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });

  // Samakan dengan global prefix di main.ts
  app.setGlobalPrefix('api');

  const document = createSwaggerDocument(app);
  const outputPath = resolve(process.cwd(), 'openapi.json');

  writeFileSync(outputPath, JSON.stringify(document, null, 2) + '\n');
  await app.close();

  console.log(`OpenAPI spec ditulis ke ${outputPath}`);
}
await exportOpenApi();
