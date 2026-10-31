import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @Matches(/@student\.telkomuniversity\.ac\.id$/, {
    message: 'Email harus menggunakan domain @student.telkomuniversity.ac.id',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;
}
