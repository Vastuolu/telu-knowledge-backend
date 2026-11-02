import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import {
  IsAllowedEmailDomain,
  getAllowedEmailDomain,
} from '../constants/auth.constants.js';

export class RegisterDto {
  @ApiProperty({
    example: 'mahasiswa@student.telkomuniversity.ac.id',
    description: `Harus berdomain ${getAllowedEmailDomain()}`,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  @IsAllowedEmailDomain()
  email: string;

  @ApiProperty({ example: 'rahasia123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;
}
