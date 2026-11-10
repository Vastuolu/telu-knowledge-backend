import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleContentValidator } from './article-content.validator.js';

describe('ArticleContentValidator', () => {
  let validator: ArticleContentValidator;
  const SUPABASE_URL = 'https://project-xyz.supabase.co';
  const BUCKET = 'article-images';
  const VALID_IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/user-1/photo.png`;

  beforeEach(() => {
    const mockConfigService = {
      getOrThrow: (key: string) => {
        if (key === 'SUPABASE_URL') return SUPABASE_URL;
        throw new Error(`Missing key: ${key}`);
      },
      get: (key: string) => {
        if (key === 'SUPABASE_STORAGE_BUCKET') return BUCKET;
        return undefined;
      },
    } as unknown as ConfigService;

    validator = new ArticleContentValidator(mockConfigService);
  });

  describe('validateAndSanitize - kasus valid & sanitasi atribut', () => {
    it('harus menerima dokumen Tiptap lengkap dengan seluruh node dan mark yang ada di whitelist', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Subjudul Level 2' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Subjudul Level 3' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Teks tebal dan miring ',
                marks: [
                  { type: 'bold' },
                  { type: 'italic' },
                  { type: 'underline' },
                  { type: 'strike' },
                  { type: 'code' },
                ],
              },
              {
                type: 'text',
                text: 'Tautan Kampus',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'https://telkomuniversity.ac.id' },
                  },
                ],
              },
              {
                type: 'text',
                text: 'Email',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'mailto:info@telkomuniversity.ac.id' },
                  },
                ],
              },
              { type: 'hardBreak' },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Kutipan penting' }],
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Poin 1' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Langkah 1' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 42;' }],
          },
          {
            type: 'image',
            attrs: {
              src: VALID_IMAGE_URL,
              alt: 'Ilustrasi',
              title: 'Judul Gambar',
            },
          },
          {
            type: 'horizontalRule',
          },
        ],
      };

      const sanitized = validator.validateAndSanitize(doc);
      expect(sanitized).toEqual(doc);
    });

    it('harus membuang atribut tak dikenal (sanitize) tanpa menolak request', () => {
      const docWithUnknownAttrs = {
        type: 'doc',
        extraRootAttr: 'harus-dibuang',
        content: [
          {
            type: 'heading',
            attrs: { level: 2, id: 'custom-id', onclick: 'alert(1)' },
            content: [
              {
                type: 'text',
                text: 'Judul Bersih',
                unknownProp: 'dibuang',
                marks: [
                  {
                    type: 'bold',
                    attrs: { style: 'color:red' },
                  },
                  {
                    type: 'link',
                    attrs: {
                      href: 'http://example.com',
                      onclick: 'evil()',
                      target: '_blank',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { textAlign: 'center', onmouseover: 'xss()' },
            content: [{ type: 'text', text: 'Isi paragraf' }],
          },
          {
            type: 'image',
            attrs: {
              src: VALID_IMAGE_URL,
              alt: 'Alt valid',
              onerror: 'alert(document.cookie)',
              width: 999,
            },
          },
        ],
      };

      const sanitized = validator.validateAndSanitize(docWithUnknownAttrs);

      expect(sanitized).toEqual({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              {
                type: 'text',
                text: 'Judul Bersih',
                marks: [
                  { type: 'bold' },
                  {
                    type: 'link',
                    attrs: { href: 'http://example.com' },
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Isi paragraf' }],
          },
          {
            type: 'image',
            attrs: {
              src: VALID_IMAGE_URL,
              alt: 'Alt valid',
            },
          },
        ],
      });
    });
  });

  describe('validateAndSanitize - kasus tolak (400 BadRequestException)', () => {
    it('harus menolak jika root bukan { type: "doc", content: [...] }', () => {
      expect(() => validator.validateAndSanitize(null)).toThrow(
        BadRequestException,
      );
      expect(() =>
        validator.validateAndSanitize({ type: 'paragraph', content: [] }),
      ).toThrow(BadRequestException);
      expect(() =>
        validator.validateAndSanitize({ type: 'doc', content: 'bukan-array' }),
      ).toThrow(BadRequestException);
    });

    it('harus menolak node di luar whitelist', () => {
      const invalidNodeDoc = {
        type: 'doc',
        content: [
          {
            type: 'script',
            content: [{ type: 'text', text: 'alert(1)' }],
          },
        ],
      };

      expect(() => validator.validateAndSanitize(invalidNodeDoc)).toThrow(
        BadRequestException,
      );
    });

    it('harus menolak mark di luar whitelist', () => {
      const invalidMarkDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Teks berbahaya',
                marks: [{ type: 'textStyle', attrs: { color: 'red' } }],
              },
            ],
          },
        ],
      };

      expect(() => validator.validateAndSanitize(invalidMarkDoc)).toThrow(
        BadRequestException,
      );
    });

    it('harus menolak heading dengan level selain 2 atau 3', () => {
      const headingLevel1 = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'H1 tidak diizinkan' }],
          },
        ],
      };
      const headingLevel4 = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 4 },
            content: [{ type: 'text', text: 'H4 tidak diizinkan' }],
          },
        ],
      };

      expect(() => validator.validateAndSanitize(headingLevel1)).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateAndSanitize(headingLevel4)).toThrow(
        BadRequestException,
      );
    });

    it('harus menolak image.src dari domain luar atau bucket lain', () => {
      const externalImageDoc = {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'https://evil.example.com/xss.svg' },
          },
        ],
      };

      const wrongBucketImageDoc = {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              src: `${SUPABASE_URL}/storage/v1/object/public/other-bucket/photo.png`,
            },
          },
        ],
      };

      expect(() => validator.validateAndSanitize(externalImageDoc)).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateAndSanitize(wrongBucketImageDoc)).toThrow(
        BadRequestException,
      );
    });

    it('harus menolak link.href dengan protokol berbahaya (javascript:, data:)', () => {
      const jsLinkDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Klik di sini',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      };

      const dataLinkDoc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Klik di sini',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'data:text/html,<script>alert(1)</script>' },
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(() => validator.validateAndSanitize(jsLinkDoc)).toThrow(
        BadRequestException,
      );
      expect(() => validator.validateAndSanitize(dataLinkDoc)).toThrow(
        BadRequestException,
      );
    });

    it('harus menolak dokumen dengan kedalaman melebihi 20', () => {
      let current: Record<string, unknown> = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Terlalu dalam' }],
      };

      for (let i = 0; i < 21; i++) {
        current = {
          type: 'blockquote',
          content: [current],
        };
      }

      const deepDoc = {
        type: 'doc',
        content: [current],
      };

      expect(() => validator.validateAndSanitize(deepDoc)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCoverImageUrl', () => {
    it('harus mengizinkan null, undefined, atau URL dari bucket yang sesuai', () => {
      expect(() => validator.validateCoverImageUrl(null)).not.toThrow();
      expect(() => validator.validateCoverImageUrl(undefined)).not.toThrow();
      expect(() =>
        validator.validateCoverImageUrl(VALID_IMAGE_URL),
      ).not.toThrow();
    });

    it('harus menolak coverImageUrl dari luar bucket', () => {
      expect(() =>
        validator.validateCoverImageUrl('https://imgur.com/abc.png'),
      ).toThrow(BadRequestException);
      expect(() => validator.validateCoverImageUrl('')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('computeExcerpt & computeReadingTimeMinutes', () => {
    it('harus memotong excerpt maksimal 160 karakter dan menghitung readingTimeMinutes minimal 1', () => {
      const longText = Array.from({ length: 450 }, (_, i) => `kata${i}`).join(
        ' ',
      );
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: longText }],
          },
        ],
      };

      const excerpt = validator.computeExcerpt(doc);
      const readingTime = validator.computeReadingTimeMinutes(doc);

      expect(excerpt.length).toBe(160);
      expect(readingTime).toBe(3); // ceil(450 / 200) = 3
    });
  });
});

