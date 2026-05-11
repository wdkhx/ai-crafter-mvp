Component({
  properties: {
    tool: {
      type: Object,
      value: {}
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleTap() {
      if (this.data.disabled) return;
      this.triggerEvent('select', { id: this.data.tool.id });
    }
  }
});
