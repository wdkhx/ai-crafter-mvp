Component({
  properties: {
    availableTools: {
      type: Array,
      value: []
    },
    upcomingTools: {
      type: Array,
      value: []
    }
  },

  methods: {
    handleSelectTool(event) {
      this.triggerEvent('selecttool', event.detail);
    }
  }
});
