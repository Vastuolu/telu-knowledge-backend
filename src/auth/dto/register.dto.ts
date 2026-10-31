import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'mahasiswa@student.telkomuniversity.ac.id',
    description: 'Harus berdomain @student.telkomuniversity.ac.id',
    pattern: '@student\\.telkomuniversity\\.ac\\.id$',
  })
  @IsEmail()
  @IsNotEmpty()
  @Matches(/@student\.telkomuniversity\.ac\.id$/, {
    message: 'Email harus menggunakan domain @student.telkomuniversity.ac.id',
  })
  email: string;

  @ApiProperty({ example: 'rahasia123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;
}
