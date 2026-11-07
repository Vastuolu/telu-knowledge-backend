import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const AI_ACTIONS = [
  'paraphrase',
  'shorten',
  'expand',
  'fix_grammar',
  'formal',
  'casual',
  'custom',
] as const;

export type AiAction = (typeof AI_ACTIONS)[number];

export class AiAssistDto {
  @ApiProperty({
    description: 'Jenis aksi bantuan penulisan AI',
    enum: AI_ACTIONS,
    example: 'paraphrase',
  })
  @IsIn(AI_ACTIONS, {
    message:
      'Action harus salah satu dari: paraphrase, shorten, expand, fix_grammar, formal, casual, custom',
  })
  action: AiAction;

  @ApiPropertyOptional({
    description:
      'Instruksi khusus (wajib diisi apabila action bernilai "custom", maksimal 500 karakter)',
    maxLength: 500,
    example: 'Ubahlah menjadi nada akademik yang cocok untuk jurnal ilmiah.',
  })
  @ValidateIf(
    (o: AiAssistDto) => o.action === 'custom' || o.instruction !== undefined,
  )
  @IsString({ message: 'Instruksi harus berupa teks' })
  @IsNotEmpty({ message: 'Instruksi wajib diisi untuk aksi custom' })
  @MaxLength(500, { message: 'Instruksi maksimal 500 karakter' })
  instruction?: string;

  @ApiProperty({
    description: 'Teks yang dipilih untuk diolah oleh AI (1-4000 karakter)',
    minLength: 1,
    maxLength: 4000,
    example:
      'Sistem microservices membagi aplikasi monolitik menjadi layanan-layanan kecil yang independen.',
  })
  @IsString({ message: 'Teks terpilih harus berupa teks' })
  @MinLength(1, { message: 'Teks terpilih minimal 1 karakter' })
  @MaxLength(4000, { message: 'Teks terpilih maksimal 4000 karakter' })
  selectedText: string;

  @ApiPropertyOptional({
    description: 'Konteks teks sebelum bagian yang dipilih (maksimal 1000 karakter)',
    maxLength: 1000,
    example: 'Pada bab sebelumnya telah dibahas arsitektur monolitik.',
  })
  @IsOptional()
  @IsString({ message: 'Konteks sebelum harus berupa teks' })
  @MaxLength(1000, { message: 'Konteks sebelum maksimal 1000 karakter' })
  contextBefore?: string;

  @ApiPropertyOptional({
    description: 'Konteks teks sesudah bagian yang dipilih (maksimal 1000 karakter)',
    maxLength: 1000,
    example: 'Setiap layanan berkomunikasi melalui protokol HTTP atau message broker.',
  })
  @IsOptional()
  @IsString({ message: 'Konteks sesudah harus berupa teks' })
  @MaxLength(1000, { message: 'Konteks sesudah maksimal 1000 karakter' })
  contextAfter?: string;
}

