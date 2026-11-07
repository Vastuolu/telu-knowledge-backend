import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../common/swagger/api-response.dto.js';

export class AiAssistDataDto {
  @ApiProperty({
    description: 'Teks hasil olahan asisten AI Telu',
    example:
      'Arsitektur microservices memecah aplikasi monolitik menjadi sejumlah layanan mandiri berskala kecil.',
  })
  text: string;
}

export class AiAssistResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Bantuan AI berhasil diproses' })
  declare message: string;

  @ApiProperty({ type: () => AiAssistDataDto })
  data: AiAssistDataDto;
}

