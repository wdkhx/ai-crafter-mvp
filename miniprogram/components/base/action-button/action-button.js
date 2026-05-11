Component({
  properties: {
    variant: {
      type: String,
      value: 'primary'
    },
    loading: {
      type: Boolean,
      value: false
    },
    disabled: {
      type: Boolean,
      value: false
    },
    block: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    handleTap() {
      if (this.data.loading || this.data.disabled) return;
      this.triggerEvent('tap');
    }
  }
});
