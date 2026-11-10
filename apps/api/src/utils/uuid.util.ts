import { randomUUID } from 'node:crypto';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (val?: string | null): val is string =>
  typeof val === 'string' && UUID_REGEX.test(val);

export class UuidUtil {
  private static readonly UUID_REGEX = UUID_REGEX;

  static isValid(val?: string | null): val is string {
    return isUuid(val);
  }

  static generateV4(): string {
    return randomUUID();
  }
}

