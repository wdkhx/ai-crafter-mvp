import { API_BASE_URL, API_TOKEN } from '../../config';
import {
  AVAILABLE_TOOLS,
  CITATION_OPTIONS,
  DEFAULT_PAPER_FORM,
  FIELD_OPTIONS,
  UPCOMING_TOOLS
} from '../../constants/tools';
import { request } from '../../utils/request';

Page({
  data: {
    availableTools: AVAILABLE_TOOLS,
    upcomingTools: UPCOMING_TOOLS,
    fieldOptions: FIELD_OPTIONS,
    citationOptions: CITATION_OPTIONS,
    fieldIndex: 0,
    citationIndex: 0,
    viewState: 'toolbox',
    showAdvanced: false,
    submitting: false,
    pollTimer: null,
    task: null,
    form: { ...DEFAULT_PAPER_FORM }
  },

  onUnload() {
    this.clearPoll();
  },

  handleSelectTool(event) {
    if (event.detail.id !== 'paper-writing') return;
    this.setData({ viewState: 'form' });
  },

  handleFormChange(event) {
    const { key, value } = event.detail;
    this.setData({ [`form.${key}`]: value });
  },

  handleToggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  handleFieldChange(event) {
    const index = event.detail.index;
    this.setData({ fieldIndex: index, 'form.field': FIELD_OPTIONS[index] });
  },

  handleCitationChange(event) {
    const index = event.detail.index;
    this.setData({ citationIndex: index, 'form.citation_style': CITATION_OPTIONS[index] });
  },

  backToToolbox() {
    this.clearPoll();
    this.setData({ viewState: 'toolbox', task: null });
  },

  async submitPaper() {
    const topic = String(this.data.form.topic || '').trim();
    if (!topic) {
      wx.showToast({ title: '请先填写论文主题', icon: 'none' });
      return;
    }

    this.setData({ submitting: true, 'form.topic': topic });
    try {
      const task = await request({
        url: '/tools/paper-writing',
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
