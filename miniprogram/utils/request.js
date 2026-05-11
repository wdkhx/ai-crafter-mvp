import { API_BASE_URL, API_TOKEN } from '../config';

export function request({ url, method = 'GET', data }) {
  const app = getApp();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        Authorization: `Bearer ${API_TOKEN}`,
        'x-user-id': app.globalData.userId,
        'x-user-nickname': encodeURIComponent(app.globalData.nickname)
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data.data);
          return;
        }
        reject(new Error(res.data?.message || '请求失败'));
      },
      fail: () => reject(new Error('网络连接失败，请检查网络后重试'))
    });
  });
}
