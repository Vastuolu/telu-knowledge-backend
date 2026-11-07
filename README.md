<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Deskripsi Proyek

Backend REST API untuk platform **TelU Knowledge** berbasis **NestJS v12**, **TypeScript (ESM)**, dan **Supabase Auth**.

### Arsitektur Port & Alamat Layanan

| Layanan | Port Default | URL / Keterangan |
|---|---|---|
| **Backend API** | `3002` | `http://localhost:3002/api` |
| **Swagger UI** | `3002` | `http://localhost:3002/api-docs` (Spesifikasi JSON: `/api-docs-json`) |
| **Frontend Web** | `3000` | `http://localhost:3000` (Next.js) |

> **PENTING**: Backend berjalan pada port **3002** karena port **3000** dialokasikan khusus untuk frontend aplikasi web.

---

## Environment Variables

Salin file `.env.example` menjadi `.env` sebelum menjalankan server:

```bash
$ cp .env.example .env
```

| Variabel | Default | Deskripsi |
|---|---|---|
| `PORT` | `3002` | Port listen server backend. |
| `CORS_ORIGINS` | `http://localhost:3000` | Daftar origin frontend yang diizinkan (pisahkan dengan koma jika multi-origin). |
| `TRUST_PROXY_HOPS` | `0` | Jumlah hop reverse proxy yang dipercaya Express (`app.set('trust proxy', n)` bila `> 0`) agar throttler membaca IP klien yang benar di belakang proxy. |
| `API_BASE_URL` | *kosong* | Server URL di Swagger UI (tanpa `/api`). Kosongkan untuk memakai origin halaman saat ini. |
| `ENABLE_SWAGGER` | *kosong* | `true`/`false` untuk memaksa Swagger nyala/mati. Default aktif kecuali `NODE_ENV=production`. |
| `SUPABASE_URL` | - | URL project instance Supabase Anda (`https://<project-id>.supabase.co`). |
| `SUPABASE_ANON_KEY` | - | Anon public API key Supabase (digunakan untuk alur user: register, login, refresh, lupa password). |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Service role secret key Supabase (hanya untuk operasi admin: reset password by ID, force revoke sesi, serta akses tabel/storage dari server). |
| `SUPABASE_STORAGE_BUCKET` | `article-images` | Nama bucket Supabase Storage untuk menyimpan gambar artikel. |
| `AUTH_EMAIL_REDIRECT_URL` | `http://localhost:3000/auth/callback` | URL pengalihan frontend setelah user mengklik tautan konfirmasi email. |
| `AUTH_RESET_REDIRECT_URL` | `http://localhost:3000/reset-password` | URL pengalihan frontend setelah user mengklik tautan reset password di email. |
| `ALLOWED_EMAIL_DOMAIN` | `@student.telkomuniversity.ac.id` | Domain email wajib untuk seluruh proses registrasi dan autentikasi. |
| `GEMINI_API_KEY` | - | API key Google Gemini untuk fitur bantuan penulisan AI di Editor Studio. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model Google Gemini yang digunakan untuk bantuan AI di Editor Studio. |

---

## Konfigurasi Manual di Supabase Dashboard

Agar fitur autentikasi dan pengiriman email berjalan sempurna, lakukan langkah-langkah berikut di dashboard Supabase:

1. **Aktifkan Konfirmasi Email**:
   - Buka menu **Authentication** > **Providers** > **Email**.
   - Pastikan opsi **Confirm email** aktif (*Enable Email Confirmations*).
2. **Daftarkan Redirect URLs**:
   - Buka menu **Authentication** > **URL Configuration**.
   - **Site URL**: Atur ke `http://localhost:3000`.
   - **Redirect URLs**: Tambahkan tautan berikut:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/reset-password`
3. **Ambil API Keys**:
   - Buka menu **Project Settings** > **API**.
   - Salin **Project URL** ke `SUPABASE_URL`.
   - Salin **Project API Keys (`anon` / `public`)** ke `SUPABASE_ANON_KEY`.
   - Salin **Project API Keys (`service_role` / `secret`)** ke `SUPABASE_SERVICE_ROLE_KEY`.
4. **Setup Bucket Supabase Storage (`article-images`)**:
   - Buka menu **Storage** di Supabase Dashboard, lalu klik **New bucket**.
   - Isi nama bucket sesuai nilai `SUPABASE_STORAGE_BUCKET` (default: `article-images`).
   - Aktifkan opsi **Public bucket** agar URL publik gambar artikel (`${SUPABASE_URL}/storage/v1/object/public/article-images/...`) dapat diakses dan ditampilkan langsung di peramban.
   - Unggah objek dilakukan dari sisi server melalui `SUPABASE_SERVICE_ROLE_KEY` pada endpoint `POST /api/uploads/article-image` dengan validasi magic bytes (`png`, `jpeg`, `webp`, `gif`, maks. 4MB).

---

## Daftar Endpoint API

Seluruh endpoint berada di bawah global prefix `/api` dan mengembalikan format envelope standar `{ statusCode, message, isError, data }`.

### 1. Modul Auth (`/api/auth`)

| Method | Path | Auth | Rate Limit | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Publik | 5 / menit | Registrasi akun mahasiswa Tel-U (`@student.telkomuniversity.ac.id`). |
| `POST` | `/api/auth/resend-verification` | Publik | 5 / menit | Kirim ulang email verifikasi pendaftaran. |
| `POST` | `/api/auth/login` | Publik | 5 / menit | Login dengan email & password untuk mendapatkan `access_token` dan `refresh_token`. |
| `POST` | `/api/auth/refresh` | Publik | 60 / menit (default) | Perbarui pasangan token menggunakan `refresh_token`. |
| `POST` | `/api/auth/logout` | Bearer JWT | 60 / menit (default) | Mengakhiri sesi pengguna saat ini. |
| `POST` | `/api/auth/forgot-password` | Publik | 5 / menit | Mengirimkan tautan pemulihan kata sandi ke email. |
| `POST` | `/api/auth/reset-password` | Bearer Recovery Token | 5 / menit | Mengubah kata sandi baru menggunakan token pemulihan. |
| `GET` | `/api/auth/me` | Bearer JWT | 60 / menit (default) | Mengambil profil autentikasi pengguna yang sedang login. |

### 2. Modul Articles — Editor Studio (`/api/articles`)

| Method | Path | Auth | Rate Limit | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/articles` | Bearer JWT | 60 / menit (default) | Membuat draft artikel baru (field body opsional; konten Tiptap divalidasi & disanitasi). |
| `GET` | `/api/articles/me` | Bearer JWT | 60 / menit (default) | Daftar artikel milik sendiri (tanpa `content`), urut `updated_at DESC, id DESC`, mendukung filter `status=draft\|published`, `limit` (1–50, default 20), dan `cursor` (`base64("updatedAt\|id")`). |
| `GET` | `/api/articles/:id` | Bearer JWT | 60 / menit (default) | Detail artikel beserta `author` (`{ id, displayName, avatarUrl }`). Pemilik dapat mengakses semua status; bukan pemilik hanya `published` (selain itu `404`). |
| `PATCH` | `/api/articles/:id` | Bearer JWT | 120 / menit | Partial update / autosave artikel milik sendiri (menghitung ulang `excerpt` 160 karakter & `readingTimeMinutes`). |
| `POST` | `/api/articles/:id/publish` | Bearer JWT | 60 / menit (default) | Mempublikasikan artikel milik sendiri secara idempoten (wajib memiliki `title` 1–150 karakter dan `content` berisi minimal satu teks non-kosong). |

### 3. Modul Uploads (`/api/uploads`)

| Method | Path | Auth | Rate Limit | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/uploads/article-image` | Bearer JWT | 20 / menit | Unggah gambar artikel (`multipart/form-data` field `file`, maks. 4MB, validasi magic bytes `png`/`jpeg`/`webp`/`gif`). Mengembalikan `{ url, path }`. |

### 4. Modul AI (`/api/ai`)

| Method | Path | Auth | Rate Limit | Deskripsi |
|---|---|---|---|---|
| `POST` | `/api/ai/assist` | Bearer JWT | 10 / menit (Throttler + per-user Map) | Bantuan penulisan AI (`Telu`) berbasis Google Gemini (`paraphrase`, `shorten`, `expand`, `fix_grammar`, `formal`, `casual`, `custom`) dengan timeout 20 detik. Mengembalikan `{ text }`. |

---

## Alur Autentikasi (Authentication Flows)

Sistem autentikasi mengamankan akses khusus untuk sivitas akademika Telkom University dengan validasi domain email ketat (`@student.telkomuniversity.ac.id`):

```
[Register] --------> [Kirim Email Verifikasi] --------> [Klik Tautan di Inbox]
                              |                                      |
                              v                                      v
                   (resend-verification)                      [Email Terverifikasi]
                                                                     |
                                                                     v
[Logout] <-------- [Get Me / Refresh Token] <-------- [Login (Access & Refresh Token)]
```

1. **Registrasi Akun (`POST /api/auth/register`)**:
   - Body: `{ email, password }` (email wajib Tel-U, password min. 8 karakter).
   - Tautan konfirmasi dikirim otomatis ke email mahasiswa.
   - Respons seragam HTTP 201 untuk mencegah *user enumeration*.
2. **Verifikasi Email**:
   - Mahasiswa mengklik tautan pada email dan diarahkan ke frontend callback (`AUTH_EMAIL_REDIRECT_URL`).
3. **Kirim Ulang Verifikasi (`POST /api/auth/resend-verification`)**:
   - Jika tautan kedaluwarsa atau belum diterima, mahasiswa dapat meminta pengiriman ulang email verifikasi.
4. **Login (`POST /api/auth/login`)**:
   - Mahasiswa login dengan email dan password.
   - Jika email belum dikonfirmasi, sistem melempar HTTP 401: *"Email belum diverifikasi. Silakan periksa email Anda."*
   - Jika sukses, server mengembalikan `access_token` (JWT Supabase), `refresh_token`, `expires_in`, dan detail `user`.
5. **Perbarui Token (`POST /api/auth/refresh`)**:
   - Menukar `refresh_token` yang masih valid dengan pasangan token baru saat `access_token` mendekati kedaluwarsa.
6. **Logout (`POST /api/auth/logout`)**:
   - Membutuhkan header `Authorization: Bearer <access_token>`.
   - Sesi pengguna di Supabase dibatalkan dan token dicabut secara permanen.
7. **Lupa & Reset Password**:
   - `POST /api/auth/forgot-password`: Mengirimkan tautan pemulihan kata sandi ke email.
   - `POST /api/auth/reset-password`: Mengubah password baru (min. 8 karakter) dengan menyertakan recovery token di header `Authorization: Bearer <recovery_token>`. Sesi recovery otomatis dicabut setelah password berganti.
8. **Profil Pengguna (`GET /api/auth/me`)**:
   - Mengambil data identitas mahasiswa yang sedang login berdasarkan `access_token`.

---

## Dokumentasi API (Swagger / OpenAPI)

Dokumentasi interaktif dibuat menggunakan [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction). Konfigurasinya terletak di `src/common/swagger/swagger.setup.ts`.

### Akses Dokumentasi

Jalankan server (`npm run start:dev`), lalu buka peramban:

| URL | Isi |
|---|---|
| `http://localhost:3002/api-docs` | Swagger UI Interaktif |
| `http://localhost:3002/api-docs-json` | Spesifikasi OpenAPI Resmi (JSON) |

Untuk mencoba endpoint terproteksi (ikon gembok):
1. Eksekusi `POST /api/auth/login` lewat tombol **Try it out**.
2. Salin token dari `data.access_token`.
3. Klik tombol **Authorize** di pojok kanan atas Swagger UI, tempel token (tanpa kata kunci `Bearer`), lalu klik **Authorize**.

### Export Spesifikasi ke File

```bash
$ npm run openapi:export
```

Menghasilkan file `openapi.json` di root repository (berguna untuk code generation SDK frontend atau import ke Postman/Insomnia).

### Menambah Dokumentasi untuk Endpoint Baru

1. **DTO Request**: Tambahkan decorator `@ApiProperty()` / `@ApiPropertyOptional()` di setiap properti DTO bersama aturan `class-validator`.
2. **DTO Response**: Buat class di `src/<modul>/dto/<modul>-response.dto.ts` yang meng-extend `ApiSuccessResponseDto` (format envelope `ResponseHelper.success`).
3. **Controller**:
   - `@ApiTags('<Modul>')` di level class controller.
   - `@ApiOperation({ summary, description })` pada tiap handler method.
   - Response sukses: `@ApiOkResponse` / `@ApiCreatedResponse` dengan `type: <ResponseDto>`.
   - Response error: `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiTooManyRequestsResponse`, dll. dengan `type: ApiErrorResponseDto` dan contoh `example` yang sesuai.
   - Guard: Endpoint dengan `@UseGuards(SupabaseAuthGuard)` **wajib** didekorasi `@ApiBearerAuth(BEARER_AUTH_NAME)`.
4. Cek hasilnya di `http://localhost:3002/api-docs`. Contoh acuan lengkap tersedia di `src/auth/auth.controller.ts`.

---

## Format Response Standar

Semua endpoint backend (sukses maupun gagal) menggunakan format envelope seragam:

**Respons Sukses (`ResponseHelper.success`)**:
```json
{
  "statusCode": 200,
  "message": "Operasi berhasil",
  "isError": false,
  "data": { ... }
}
```

**Respons Error (`AllExceptionsFilter` / `ResponseHelper.error`)**:
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "isError": true,
  "data": null
}
```

---

## Menjalankan Proyek

```bash
# Setup dependency
$ npm install

# Mode development (watch mode)
$ npm run start:dev

# Mode production
$ npm run build
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
