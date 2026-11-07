import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'blockquote',
  'image',
  'hardBreak',
  'horizontalRule',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
]);

const ALLOWED_MARK_TYPES = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
]);

const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const BLOCK_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'codeBlock',
  'hardBreak',
]);

const MAX_CONTENT_DEPTH = 20;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class ArticleContentValidator {
  constructor(private readonly configService: ConfigService) {}

  getAllowedStoragePrefix(): string {
    const supabaseUrl = this.configService
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/+$/, '');
    const bucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ||
      'article-images';
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  }

  validateCoverImageUrl(coverImageUrl: string | null | undefined): void {
    if (coverImageUrl === undefined || coverImageUrl === null) {
      return;
    }

    if (typeof coverImageUrl !== 'string' || !this.isValidBucketImageUrl(coverImageUrl)) {
      throw new BadRequestException(
        'URL gambar sampul (coverImageUrl) harus diawali public URL bucket storage yang diizinkan',
      );
    }
  }

  validateAndSanitize(rawContent: unknown): TiptapDoc {
    if (!isPlainObject(rawContent)) {
      throw new BadRequestException(
        'Konten artikel harus berupa objek JSON Tiptap yang valid',
      );
    }

    if (rawContent.type !== 'doc' || !Array.isArray(rawContent.content)) {
      throw new BadRequestException(
        'Konten artikel wajib memiliki struktur root { type: "doc", content: [...] }',
      );
    }

    const sanitizedChildren = rawContent.content.map((child) =>
      this.sanitizeNode(child, 1),
    );

    return {
      type: 'doc',
      content: sanitizedChildren,
    };
  }

  private sanitizeNode(rawNode: unknown, depth: number): TiptapNode {
    if (depth > MAX_CONTENT_DEPTH) {
      throw new BadRequestException(
        `Kedalaman struktur konten artikel melebihi batas maksimum (${MAX_CONTENT_DEPTH})`,
      );
    }

    if (!isPlainObject(rawNode) || typeof rawNode.type !== 'string') {
      throw new BadRequestException(
        'Setiap node dalam konten artikel harus berupa objek dengan properti type',
      );
    }

    const nodeType = rawNode.type;

    if (!ALLOWED_NODE_TYPES.has(nodeType) || nodeType === 'doc') {
      throw new BadRequestException(
        `Tipe node "${nodeType}" tidak diizinkan dalam konten artikel`,
      );
    }

    const sanitized: TiptapNode = { type: nodeType };

    if (nodeType === 'text') {
      if (typeof rawNode.text !== 'string') {
        throw new BadRequestException(
          'Node bertipe text wajib memiliki properti text berupa string',
        );
      }
      sanitized.text = rawNode.text;
    }

    if (nodeType === 'heading') {
      const attrs = rawNode.attrs;
      if (!isPlainObject(attrs)) {
        throw new BadRequestException(
          'Node heading wajib memiliki atribut level (2 atau 3)',
        );
      }
      const level = attrs.level;
      if (level !== 2 && level !== 3) {
        throw new BadRequestException(
          'Node heading hanya mengizinkan level 2 atau 3',
        );
      }
      sanitized.attrs = { level };
    } else if (nodeType === 'image') {
      const attrs = rawNode.attrs;
      if (!isPlainObject(attrs) || typeof attrs.src !== 'string') {
        throw new BadRequestException(
          'Node image wajib memiliki atribut src berupa string URL yang valid',
        );
      }
      if (!this.isValidBucketImageUrl(attrs.src)) {
        throw new BadRequestException(
          'Atribut image.src harus diawali public URL bucket storage yang diizinkan',
        );
      }

      const imageAttrs: Record<string, unknown> = {
        src: attrs.src,
      };
      if (typeof attrs.alt === 'string' || attrs.alt === null) {
        imageAttrs.alt = attrs.alt;
      }
      if (typeof attrs.title === 'string' || attrs.title === null) {
        imageAttrs.title = attrs.title;
      }
      sanitized.attrs = imageAttrs;
    }

    if (rawNode.marks !== undefined) {
      if (!Array.isArray(rawNode.marks)) {
        throw new BadRequestException(
          'Properti marks pada node harus berupa array',
        );
      }
      sanitized.marks = rawNode.marks.map((mark) => this.sanitizeMark(mark));
    }

    if (rawNode.content !== undefined) {
      if (!Array.isArray(rawNode.content)) {
        throw new BadRequestException(
          'Properti content pada node harus berupa array',
        );
      }
      sanitized.content = rawNode.content.map((child) =>
        this.sanitizeNode(child, depth + 1),
      );
    }

    return sanitized;
  }

  private sanitizeMark(rawMark: unknown): TiptapMark {
    if (!isPlainObject(rawMark) || typeof rawMark.type !== 'string') {
      throw new BadRequestException(
        'Setiap mark dalam konten artikel harus berupa objek dengan properti type',
      );
    }

    const markType = rawMark.type;
    if (!ALLOWED_MARK_TYPES.has(markType)) {
      throw new BadRequestException(
        `Tipe mark "${markType}" tidak diizinkan dalam konten artikel`,
      );
    }

    if (markType === 'link') {
      const attrs = rawMark.attrs;
      if (!isPlainObject(attrs) || typeof attrs.href !== 'string') {
        throw new BadRequestException(
          'Mark link wajib memiliki atribut href berupa string URL',
        );
      }

      const href = attrs.href.trim();
      if (!this.isValidLinkHref(href)) {
        throw new BadRequestException(
          'Atribut link.href hanya mengizinkan protokol http, https, atau mailto',
        );
      }

      return {
        type: 'link',
        attrs: { href },
      };
    }

    return { type: markType };
  }

  private isValidBucketImageUrl(url: string): boolean {
    const prefix = this.getAllowedStoragePrefix();
    if (!url.startsWith(prefix)) {
      return false;
    }

    const objectPath = url.slice(prefix.length);
    if (!objectPath || objectPath.includes('..') || objectPath.includes('\\')) {
      return false;
    }

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidLinkHref(href: string): boolean {
    if (!href) {
      return false;
    }

    try {
      const parsed = new URL(href);
      return ALLOWED_LINK_PROTOCOLS.has(parsed.protocol);
    } catch {
      return false;
    }
  }

  extractPlainText(content: unknown): string {
    if (!isPlainObject(content)) {
      return '';
    }

    const parts: string[] = [];
    this.collectText(content, parts);

    return parts
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private collectText(node: Record<string, unknown>, parts: string[]): void {
    const nodeType = typeof node.type === 'string' ? node.type : '';

    if (nodeType === 'text' && typeof node.text === 'string') {
      parts.push(node.text);
    } else if (nodeType === 'hardBreak') {
      parts.push(' ');
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (isPlainObject(child)) {
          this.collectText(child, parts);
        }
      }
    }

    if (BLOCK_NODE_TYPES.has(nodeType)) {
      parts.push(' ');
    }
  }

  computeExcerpt(content: unknown): string {
    const plainText = this.extractPlainText(content);
    return plainText.slice(0, 160);
  }

  computeReadingTimeMinutes(content: unknown): number {
    const plainText = this.extractPlainText(content);
    if (!plainText) {
      return 1;
    }
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  hasNonEmptyText(content: unknown): boolean {
    return this.extractPlainText(content).length > 0;
  }
}

