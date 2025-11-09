export const DEFAULT_JWT_EXPIRES = 3600;

export const parseJwtExpires = (input?: string): number => {
  if (!input) {
    return DEFAULT_JWT_EXPIRES;
  }

  if (/^\d+$/.test(input)) {
    return Number(input);
  }

  const match = input.match(/^(\d+)([smhd])$/i);
  if (!match) {
    return DEFAULT_JWT_EXPIRES;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return DEFAULT_JWT_EXPIRES;
  }
};

