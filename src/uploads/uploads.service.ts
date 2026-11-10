import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ResponseHelper } from '../common/helpers/response.helper.js';

export const MAX_ARTICLE_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async uploadArticleImage(
    userId: string,
    file: Express.Multer.File | undefined,
  ) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException(
        'File gambar wajib diunggah pada field "file"',
      );
    }

    if (
      file.size > MAX_ARTICLE_IMAGE_SIZE_BYTES ||
      file.buffer.length > MAX_ARTICLE_IMAGE_SIZE_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.',
      );
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || !(detectedType.mime in ALLOWED_IMAGE_MIMES)) {
      throw new BadRequestException(
        'Format file tidak didukung. Hanya gambar PNG, JPEG, WEBP, atau GIF yang diizinkan.',
      );
    }

    const ext = ALLOWED_IMAGE_MIMES[detectedType.mime];
    const objectPath = `${userId}/${randomUUID()}.${ext}`;
    const bucketName =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET')?.trim() ||
      'article-images';

    const storageBucket = this.supabaseService
      .getAdminClient()
      .storage.from(bucketName);

    const { data: uploadData, error: uploadError } = await storageBucket.upload(
      objectPath,
      file.buffer,
      {
        contentType: detectedType.mime,
        upsert: false,
      },
    );

    if (uploadError || !uploadData) {
      throw new InternalServerErrorException(
        'Gagal mengunggah gambar artikel ke storage',
      );
    }

    const finalPath = uploadData.path || objectPath;
    const { data: publicUrlData } = storageBucket.getPublicUrl(finalPath);

    return ResponseHelper.success(201, 'Gambar artikel berhasil diunggah', {
      url: publicUrlData.publicUrl,
      path: finalPath,
    });
  }
}

