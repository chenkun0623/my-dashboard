/**
 * 统一读取 JWT_SECRET：
 * - 设置了 JWT_SECRET 时直接使用；
 * - 生产环境未设置 → 直接抛错拒绝启动（防止默认密钥被利用伪造 token）；
 * - 开发环境未设置 → 使用仅供本地开发的默认密钥。
 */

export const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[security] JWT_SECRET 未设置，生产环境拒绝启动。请在环境变量中配置随机 JWT_SECRET。'
    );
  }
  return DEV_JWT_SECRET;
}
