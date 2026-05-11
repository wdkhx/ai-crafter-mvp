Component({
  properties: {
    form: {
      type: Object,
      value: {}
    },
    depthOptions: {
      type: Array,
      value: []
    },
    depthDisplayOptions: {
      type: Array,
      value: []
    },
    currentDepthLabel: {
      type: String,
      value: ''
    },
    depthIndex: {
      type: Number,
      value: 0
    },
    showAdvanced: {
      type: Boolean,
      value: false
    },
    submitting: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleInput(event) {
      this.triggerEvent('formchange', {
        key: event.currentTarget.dataset.key,
        value: event.detail.value
      });
    },

    handleDepthChange(event) {
      this.triggerEvent('depthchange', { index: Number(event.detail.value) });
    },

    handleToggleAdvanced() {
      this.triggerEvent('toggleadvanced');
    },

    handleSubmit() {
      this.triggerEvent('submit');
    },

    handleBack() {
      this.triggerEvent('back');
    }
  }
});

