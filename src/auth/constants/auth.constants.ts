import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export const DEFAULT_ALLOWED_EMAIL_DOMAIN = '@student.telkomuniversity.ac.id';

export function getAllowedEmailDomain(): string {
  return (
    process.env.ALLOWED_EMAIL_DOMAIN?.trim() || DEFAULT_ALLOWED_EMAIL_DOMAIN
  );
}

export function isAllowedEmailDomain(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const allowed = getAllowedEmailDomain().toLowerCase();
  return email.trim().toLowerCase().endsWith(allowed);
}

export function IsAllowedEmailDomain(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedEmailDomain',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isAllowedEmailDomain(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return `Email harus menggunakan domain ${getAllowedEmailDomain()}`;
        },
      },
    });
  };
}
