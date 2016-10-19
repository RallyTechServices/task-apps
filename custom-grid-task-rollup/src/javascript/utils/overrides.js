Ext.override(Rally.ui.inlinefilter.PropertyFieldComboBox, {
    /**
     * @cfg {String[]} whiteListFields
     * field names that should be included from the filter row field combobox
     */
    defaultWhiteListFields: ['Milestones','Tags']
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

Ext.override(Rally.ui.gridboard.plugin.GridBoardInlineFilterControl,{
    setCurrentView: function(view) {
        var inlineFilterButton = this.getControlCmp().getComponent('inlineFilterButton'),
            stateId = inlineFilterButton.getStateId(),
            state = _.pick(view, this.sharedViewState);
        console.log('setCurrentview filter', inlineFilterButton, stateId, state);
        Ext.apply(state, _.pick(inlineFilterButton.getState(), 'collapsed', 'advancedCollapsed'));
        Ext.state.Manager.set(stateId, state);
    }
});

Ext.override(Rally.ui.gridboard.GridBoard, {
    setCurrentView: function(view) {

        this._setSharedViewProperties(this.plugins, view);

        if (view.toggleState === 'grid') {
            Ext.state.Manager.set(this._getGridConfig().stateId, _.pick(view, ['columns', 'sorters']));
        } else if (view.toggleState === 'board') {
            Ext.state.Manager.set(this._getBoardConfig().fieldsStateId, view.fields);
        }
        Ext.state.Manager.set(this.stateId, _.pick(view, ['toggleState']));
        this.fireEvent('viewchange', this);

    }
});