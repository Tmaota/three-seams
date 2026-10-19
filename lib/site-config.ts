// 站点级配置：仓库名、编辑口令等
// 注意：纯静态站点的口令只是编辑界面的门槛（防误触），真正的安全线是 GitHub 令牌
export const SITE_CONFIG = {
  repoOwner: 'Tmaota',
  repoName: 'three-seams',
  branch: 'main',
  // 墨种之境口令（沿袭旧站）。想换就改这一行，push 后生效。
  editPassword: 'cattowersaikai',
}
