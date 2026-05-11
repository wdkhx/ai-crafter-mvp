import { API_BASE_URL, API_TOKEN } from '../../config';
import {
  AVAILABLE_TOOLS,
  DEFAULT_REVIEW_FORM,
  DEPTH_DISPLAY_OPTIONS,
  DEPTH_LABELS,
  DEPTH_OPTIONS,
  UPCOMING_TOOLS
} from '../../constants/tools';
import { request } from '../../utils/request';

Page({
  data: {
    availableTools: AVAILABLE_TOOLS,
    upcomingTools: UPCOMING_TOOLS,
    depthOptions: DEPTH_OPTIONS,
    depthDisplayOptions: DEPTH_DISPLAY_OPTIONS,
    depthIndex: 0,
    currentDepthLabel: DEPTH_LABELS[DEFAULT_REVIEW_FORM.depth],
    viewState: 'toolbox',
    showAdvanced: false,
    submitting: false,
    pollTimer: null,
    task: null,
    form: { ...DEFAULT_REVIEW_FORM }
  },

  onUnload() {
    this.clearPoll();
  },

  handleSelectTool(event) {
    if (event.detail.id !== 'frontier-review') return;
    this.setData({ viewState: 'form' });
  },

  handleFormChange(event) {
    const { key, value } = event.detail;
    this.setData({ [`form.${key}`]: value });
  },

  handleToggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  handleDepthChange(event) {
    const index = event.detail.index;
    const depth = DEPTH_OPTIONS[index];
    this.setData({
      depthIndex: index,
      currentDepthLabel: DEPTH_LABELS[depth],
      'form.depth': depth
    });
  },

  backToToolbox() {
    this.clearPoll();
    this.setData({ viewState: 'toolbox', task: null });
  },

  async submitReview() {
    const topic = String(this.data.form.topic || '').trim();
    if (!topic) {
      wx.showToast({ title: '请先输入技术点', icon: 'none' });
      return;
    }

    this.setData({ submitting: true, 'form.topic': topic });
    try {
      const task = await request({
        url: '/tools/frontier-review',
        method: 'POST',
        data: { ...this.data.form, topic }
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
    this.setData({ pollTimer: setInterval(poll, 1500) });
  },

  clearPoll() {
    if (!this.data.pollTimer) return;
    clearInterval(this.data.pollTimer);
    this.setData({ pollTimer: null });
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
