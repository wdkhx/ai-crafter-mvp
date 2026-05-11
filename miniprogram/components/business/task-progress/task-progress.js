Component({
  properties: {
    task: {
      type: Object,
      value: {}
    }
  },

  methods: {
    handleCancel() {
      this.triggerEvent('cancel');
    }
  }
});
