Component({
  properties: {
    form: {
      type: Object,
      value: {}
    },
    fieldOptions: {
      type: Array,
      value: []
    },
    citationOptions: {
      type: Array,
      value: []
    },
    fieldIndex: {
      type: Number,
      value: 0
    },
    citationIndex: {
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

    handleFieldChange(event) {
      this.triggerEvent('fieldchange', { index: Number(event.detail.value) });
    },

    handleCitationChange(event) {
      this.triggerEvent('citationchange', { index: Number(event.detail.value) });
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
