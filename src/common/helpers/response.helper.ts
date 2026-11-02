export class ResponseHelper {
  static success<T = any>(statusCode: number, message: string, data?: T) {
    return {
      statusCode,
      message,
      isError: false,
      data: data ?? null,
    };
  }

  static error<T = any>(
    statusCode: number,
    message: string | string[],
    data?: T,
  ) {
    return {
      statusCode,
      message,
      isError: true,
      data: data ?? null,
    };
  }
}
