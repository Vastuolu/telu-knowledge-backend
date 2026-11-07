import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ArgumentsHost,
  BadRequestException,
  UnauthorizedException,
  PayloadTooLargeException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockStatus = vi.fn().mockReturnThis();
    mockJson = vi.fn().mockReturnThis();

    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => ({
          status: mockStatus,
          json: mockJson,
        }),
        getRequest: () => ({
          method: 'POST',
          url: '/api/test',
        }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('harus menangani BadRequestException dengan array pesan validasi DTO', () => {
    const validationMessages = [
      'email must be an email',
      'password should not be empty',
    ];
    const exception = new BadRequestException(validationMessages);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 400,
      message: validationMessages,
      isError: true,
      data: null,
    });
  });

  it('harus menangani UnauthorizedException dengan pesan string', () => {
    const exception = new UnauthorizedException('Email atau password salah');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 401,
      message: 'Email atau password salah',
      isError: true,
      data: null,
    });
  });

  it('harus menangani HttpException dengan objek respon kustom', () => {
    const exception = new HttpException(
      { error: 'Forbidden resource' },
      HttpStatus.FORBIDDEN,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'Forbidden resource',
      isError: true,
      data: null,
    });
  });

  it('harus menangani unhandled Error dan mengembalikan status 500 aman', () => {
    const loggerSpy = vi
      .spyOn((filter as any).logger, 'error')
      .mockImplementation(() => {});
    const exception = new Error('Database connection crashed');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
      isError: true,
      data: null,
    });
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('harus menerjemahkan pesan Multer "File too large" (413) ke Bahasa Indonesia', () => {
    const exception = new PayloadTooLargeException('File too large');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 413,
      message: 'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.',
      isError: true,
      data: null,
    });
  });
});
