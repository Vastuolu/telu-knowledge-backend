import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'mahasiswa@student.telkomuniversity.ac.id',
    description: 'Harus berdomain @student.telkomuniversity.ac.id',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'rahasia123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
