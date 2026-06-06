/**
 * 微信小程序登录服务 — 预留文件
 *
 * 移植小程序时取消注释并填充实现：
 *
 * 1. 小程序端：wx.login() 获取临时 code
 * 2. 将 code 发送到后端 /api/wechat/login
 * 3. 后端用 code + appId + appSecret 换取 openid
 * 4. 在 Supabase 中查找或创建用户
 * 5. 生成 Supabase session token 返回给小程序
 *
 * 参考文档：
 *   - 微信小程序登录：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html
 *   - Supabase custom JWT：https://supabase.com/docs/guides/auth/jwts
 *
 * 所需环境变量：
 *   WECHAT_APP_ID      — 小程序 AppID
 *   WECHAT_APP_SECRET  — 小程序 AppSecret
 */

export const wechatAuthService = {
  /** 获取微信登录 code（小程序端：wx.login） */
  async getCode(): Promise<string> {
    // 移植时：
    // return new Promise((resolve, reject) => {
    //   wx.login({
    //     success: (res) => resolve(res.code),
    //     fail: reject,
    //   });
    // });
    throw new Error("仅在小程序环境中可用");
  },

  /** 用 code 换取 Supabase 会话 */
  async loginWithCode(code: string) {
    const res = await fetch("/api/wechat/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "微信登录失败");
    return data;
  },

  /** 获取微信用户信息（需先登录） */
  async getUserInfo() {
    // 移植时：
    // return new Promise((resolve, reject) => {
    //   wx.getUserProfile({
    //     desc: "用于完善个人资料",
    //     success: (res) => resolve(res.userInfo),
    //     fail: reject,
    //   });
    // });
    throw new Error("仅在小程序环境中可用");
  },
};
