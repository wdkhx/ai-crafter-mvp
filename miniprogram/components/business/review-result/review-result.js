Component({
  properties: {
    task: {
      type: Object,
      value: {}
    }
  },

  methods: {
    handleCopy() {
      this.triggerEvent('copy');
    },

    handleDownload() {
      this.triggerEvent('download');
    },

    handleRegenerate() {
      this.triggerEvent('regenerate');
    }
  }
});

