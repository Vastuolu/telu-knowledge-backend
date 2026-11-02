import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'v1.MRjVxkF8sZ2...',
    description:
      'Refresh token yang didapat saat login atau refresh sebelumnya',
  })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
