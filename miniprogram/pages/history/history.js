import { request } from '../../utils/request';

Page({
  data: {
    history: []
  },

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    try {
      const history = await request({ url: '/history' });
      this.setData({ history });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  async openDetail(event) {
    const taskId = event.currentTarget.dataset.id;
    try {
      const task = await request({ url: `/history/${taskId}` });
      if (!task.result) {
        wx.showToast({ title: '任务还没有结果', icon: 'none' });
        return;
      }
      wx.setClipboardData({
        data: task.result.fullText,
        success: () => wx.showToast({ title: '综述已复制' })
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  clearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确认删除所有历史记录？',
      success: async (res) => {
        if (!res.confirm) return;
        await request({ url: '/history', method: 'DELETE' });
        this.setData({ history: [] });
      }
    });
  }
});
