Ext.override(Rally.ui.gridboard.plugin.GridBoardFieldPicker, {
    gridFieldBlackList: [
        'Actuals',
        'Changesets',
        'Children',
        // 'Description',
        // 'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ]
});

Ext.override(Rally.ui.inlinefilter.PropertyFieldComboBox, {
    /**
     * @cfg {String[]} whiteListFields
     * field names that should be included from the filter row field combobox
     */
    defaultWhiteListFields: ['Milestones']
});

Ext.override(Rally.ui.grid.TreeGrid, {
    _mergeColumnConfigs: function(newColumns, oldColumns) {

        var mergedColumns= _.map(newColumns, function(newColumn) {
            var oldColumn = _.find(oldColumns, {dataIndex: this._getColumnName(newColumn)});
            if (oldColumn) {
                return this._getColumnConfigFromColumn(oldColumn);
            }

            return newColumn;
        }, this);
        mergedColumns = mergedColumns.concat(this.config.derivedColumns);
        return mergedColumns;
    },
    _getColumnConfigsBasedOnCurrentOrder: function(columnConfigs) {
        var cols = _(this.headerCt.items.getRange()).map(function(column) {
            //override:  Added additional search for column.text
            return _.contains(columnConfigs, column.dataIndex) ? column.dataIndex : _.find(columnConfigs, {xtype: column.xtype, text: column.text });
        }).compact().value();

        return cols;
    },
    _restoreColumnOrder: function(columnConfigs) {

        var currentColumns = this._getColumnConfigsBasedOnCurrentOrder(columnConfigs);
        var addedColumns = _.filter(columnConfigs, function(config) {
            return !_.find(currentColumns, {dataIndex: config.dataIndex}) || Ext.isString(config);
        });
        return currentColumns.concat(addedColumns);
    },
    _applyStatefulColumns: function(columns) {
        if (this.alwaysShowDefaultColumns) {
            _.each(this.columnCfgs, function(columnCfg) {
                if (!_.any(columns, {dataIndex: this._getColumnName(columnCfg)})) {
                    columns.push(columnCfg);
                }
            }, this);
        }

        if (this.config && this.config.derivedColumns){
            this.columnCfgs = columns.concat(this.config.derivedColumns);
        } else {
            this.columnCfgs = columns;
        }

    }
});

Ext.override(Rally.ui.combobox.TimeboxComboBox, {
    initComponent: function() {

        this.displayTpl = Ext.create('Ext.XTemplate',
            '<tpl for=".">{[this.getName(values)]}<tpl if="xindex<xcount">, </tpl></tpl>',
            {
                getName: function(values){
                    return values.formattedName || "Unscheduled";
                }
            }
        );

        if (this.showArrows) {
            this.pickerOffset = [21, 0];

            this.displayTpl = Ext.create('Ext.XTemplate',
                '<tpl for=".">{formattedName}<tpl if="formattedStartDate"> ({formattedStartDate} - {formattedEndDate})</tpl></tpl>'
            );
        }

        this.callParent(arguments);
        this.store.on('add', this._onStoreAdd, this);
        this.on('change', this._onChange, this);
        this.on('expand', this._onExpand, this);
    }
});

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

//Ext.override(Rally.ui.picker.MilestonePicker,{
//    getState: function(){
//        console.log('getState', this.getValue());
//        var refArray = Ext.Array.map(this.getValue(), function(m){
//            return m.get('_ref');
//        });
//        return {value: refArray};
//    },
//    applyState: function(state) {
//        console.log('applystate', state.value);
//        //this.callParent(arguments);
//        if(state.hasOwnProperty('value')) {
//            this.setValue(state.value);
//        }
//
//        this.on('expand', function () {
//            this.setValue(state.value);
//            this.saveState();
//        }, this, {single: true});
//
//        if (this.value !== state.value){
//            this.expand();
//        }
//
//
//    },
//    setValue: function(values) {
//        if (values && values.length > 0){
//            var items = values;
//            //var items = Ext.isString(values) ? values.split(',') : Ext.Array.from(values);
//
//            items = Ext.Array.merge(items, this.alwaysSelectedValues);
//            console.log('setvalue', items);
//            if (!Ext.isEmpty(items) && this.store && this.store.isLoading()) {
//                this.store.on('load', function() {
//                    this._selectValues(items);
//                }, this, {single: true});
//            }
//            else {
//                this._selectValues(items);
//            }
//        }
//
//    },
//    _selectValues: function (items) {
//        var oldValue = this.selectedValues.getRange();
//        this.selectedValues.clear();
//        console.log('_selectValues', this.selectionKey, oldValue, items);
//        _.each(items, function (item) {
//            var value = item && item.isModel ? item.get(this.selectionKey) : item;
//            var record = this.findInStore(value);
//            console.log('record', record);
//            if (record) {
//                this.selectedValues.add(this._getKey(record), record);
//            } else if (item.isModel) {
//                this.selectedValues.add(value, item);
//            }
//        }, this);
//
//        if (this.isExpanded) {
//            this._onListRefresh();
//            this._groupSelectedRecords();
//        } else {
//            this._syncSelection();
//        }
//
//        this.fireEvent('change', this, this.selectedValues.getRange(), oldValue);
//    },
//
//});