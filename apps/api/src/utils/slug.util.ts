export class SlugUtil {
  static create(name?: string | null, maxLength = 50): string {
    if (!name || !name.trim()) return 'ws';
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, maxLength) || 'ws'
    );
  }

  static generateUnique(name?: string | null, maxLength = 50): string {
    const base = this.create(name, maxLength);
    return `${base}-${Date.now().toString(36)}`;
  }
}

export const createSlug = (name?: string | null, maxLength = 50): string =>
  SlugUtil.create(name, maxLength);

export const generateUniqueSlug = (name?: string | null, maxLength = 50): string =>
  SlugUtil.generateUnique(name, maxLength);

