export function mapAuthError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Terjadi kesalahan pada layanan autentikasi';
  }

  const err = error as { message?: string; code?: string };
  const message = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  if (
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.';
  }

  if (
    message.includes('password') &&
    (message.includes('weak') ||
      message.includes('least') ||
      message.includes('pwned') ||
      message.includes('short'))
  ) {
    return 'Password terlalu lemah atau tidak memenuhi syarat keamanan.';
  }

  if (
    code === 'email_not_confirmed' ||
    message.includes('email not confirmed')
  ) {
    return 'Email belum diverifikasi. Silakan periksa email Anda.';
  }

  return 'Permintaan gagal diproses. Silakan coba beberapa saat lagi.';
}

export function isUserAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { message?: string; code?: string };
  const message = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  return (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already in use') ||
    message.includes('already exists')
  );
}
