export class ResponseHelper {
  static success(statusCode: number, message: string, data?: any) {
    return {
      statusCode,
      message,
      isError: false,
      data: data ?? null,
    };
  }

  static error(statusCode: number, message: string, data?: any) {
    return {
      statusCode,
      message,
      isError: true,
      data: data ?? null,
    };
  }
}
