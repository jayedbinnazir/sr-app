export default () => {
  console.log(
    '---------------(checking)- in application config-------------------->',
    process.env.NODE_ENV,
    process.env.PORT,
  );

  return {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    globalPrefix: process.env.GLOBAL_PREFIX || 'api',
    name: process.env.APP_NAME,
    cookie_name: process.env.AUTH_COOKIE_NAME || 'sr_access_token',
    jwt_secret: process.env.JWT_SECRET || 'jwt_secret_key',
    jwt_expires_in: process.env.JWT_EXPIRES_IN || '3600',
    auth_cookie_samesite: process.env.AUTH_COOKIE_SAMESITE || 'lax',
    auth_cookie_secure: process.env.AUTH_COOKIE_SECURE || 'false',
    auth_cookie_domain: process.env.AUTH_COOKIE_DOMAIN || '',
    auth_cookie_path: process.env.AUTH_COOKIE_PATH || '/',
  };
};
