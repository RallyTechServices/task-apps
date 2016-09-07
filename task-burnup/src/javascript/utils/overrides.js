Ext.override(Rally.ui.combobox.UserComboBox, {

    applyState: function (state) {

        this.store.on('load', function () {
            this.setValue(state.value);
            this.saveState();
        }, this, {single: true});

        if (state.value && this.value != state.value) {
            if (this.store) {
                this.store.addFilter([{
                    property: 'ObjectID',
                    value: state.value
                }]);
                this.refreshStore();
            }
        }
    },

    beforeQuery: function(queryPlan) {
        var queryString = queryPlan.query,
            idFilter = Rally.data.wsapi.Filter.or([
                {
                    property: 'UserName',
                    operator: 'contains',
                    value: queryString
                },
                {
                    property: 'DisplayName',
                    operator: 'contains',
                    value: queryString
                },
                {
                    property: 'FirstName',
                    operator: 'contains',
                    value: queryString
                },
                {
                    property: 'LastName',
                    operator: 'contains',
                    value: queryString
                },
                {
                    property: 'EmailAddress',
                    operator: 'contains',
                    value: queryString
                }
            ]);
        queryPlan.query = idFilter.toString();

        return this.callSuper(arguments);
    }
});