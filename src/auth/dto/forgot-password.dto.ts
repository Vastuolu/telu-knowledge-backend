import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import {
  IsAllowedEmailDomain,
  getAllowedEmailDomain,
} from '../constants/auth.constants.js';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'mahasiswa@student.telkomuniversity.ac.id',
    description: `Email terdaftar yang ingin di-reset (${getAllowedEmailDomain()})`,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  @IsAllowedEmailDomain()
  email: string;
}
