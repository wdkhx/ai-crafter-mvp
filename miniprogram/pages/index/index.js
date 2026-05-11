import { API_BASE_URL, API_TOKEN } from '../../config';
import { request } from '../../utils/request';

const fieldOptions = ['计算机科学', '电子工程', '机械工程', '其他'];
const citationOptions = ['GB/T 7714-2015', 'APA', 'MLA'];

Page({
  data: {
    fieldOptions,
    citationOptions,
    fieldIndex: 0,
    citationIndex: 0,
    viewState: 'form',
    submitting: false,
    pollTimer: null,
    task: null,
    form: {
      topic: '基于深度学习的图像分类方法研究',
      word_count: 3000,
      reference_count: 8,
      field: fieldOptions[0],
      citation_style: citationOptions[0],
      special_requirements: '需要包含实验部分，重点介绍 Transformer 模型'
    }
  },

  onUnload() {
    this.clearPoll();
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  onFieldChange(event) {
    const index = Number(event.detail.value);
    this.setData({ fieldIndex: index, 'form.field': fieldOptions[index] });
  },

  onCitationChange(event) {
    const index = Number(event.detail.value);
    this.setData({ citationIndex: index, 'form.citation_style': citationOptions[index] });
  },

  async submitPaper() {
    if (!this.data.form.topic) {
      wx.showToast({ title: '请填写论文主题', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const task = await request({
        url: '/tools/paper-writing',
        method: 'POST',
        data: this.data.form
      });
      this.setData({ task, viewState: 'running', submitting: false });
      this.startPoll(task.task_id);
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  startPoll(taskId) {
    this.clearPoll();
    const poll = async () => {
      try {
        const task = await request({ url: `/tasks/${taskId}` });
        const done = ['succeeded', 'failed', 'cancelled'].includes(task.status);
        this.setData({
          task,
          viewState: task.status === 'succeeded' ? 'result' : 'running'
        });
        if (done) this.clearPoll();
      } catch (error) {
        wx.showToast({ title: error.message, icon: 'none' });
        this.clearPoll();
      }
    };
    poll();
    const pollTimer = setInterval(poll, 1500);
    this.setData({ pollTimer });
  },

  clearPoll() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.setData({ pollTimer: null });
    }
  },

  async cancelTask() {
    if (!this.data.task) return;
    await request({ url: `/tasks/${this.data.task.task_id}/cancel`, method: 'POST' });
    this.clearPoll();
    this.setData({ viewState: 'form', task: null });
    wx.showToast({ title: '已取消', icon: 'none' });
  },

  copyFullText() {
    wx.setClipboardData({
      data: this.data.task?.result?.fullText || '',
      success: () => wx.showToast({ title: '已复制' })
    });
  },

  downloadDocx() {
    const taskId = this.data.task?.task_id;
    if (!taskId) return;
    wx.downloadFile({
      url: `${API_BASE_URL}/tasks/${taskId}/export.docx`,
      header: {
        Authorization: `Bearer ${API_TOKEN}`,
        'x-user-id': getApp().globalData.userId
      },
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '导出失败', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'docx',
          showMenu: true
        });
      },
      fail: () => wx.showToast({ title: '网络连接失败', icon: 'none' })
    });
  },

  resetForm() {
    this.clearPoll();
    this.setData({ viewState: 'form', task: null });
  }
});
