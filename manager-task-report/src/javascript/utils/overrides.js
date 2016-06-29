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
        return _(this.headerCt.items.getRange()).map(function(column) {
            //override:  Added additional search for column.text
            return _.contains(columnConfigs, column.dataIndex) ? column.dataIndex : _.find(columnConfigs, {xtype: column.xtype, dataIndex: column.dataIndex });
        }).compact().value();
    }
});

Ext.override(Rally.ui.renderer.RendererFactory, {
    typeFieldTemplates: {
        defectsuite: {
            state: function(field) {
                return Ext.create('Rally.ui.renderer.template.DefectSuiteStateTemplate', {
                    field: field
                });
            }
        },
        milestone: {
            formattedid: function(field) {
                return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');
            }
        },
        task: {
            state: function(field) {
                return Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                    field: field,
                    showTrigger: true
                });
            },
            estimate: function(field){
                return Ext.create('Rally.ui.renderer.template.DecimalTemplate', {
                    fieldName: field.name,
                    maxFractionalDigits: field.attributeDefinition ? field.attributeDefinition.MaxFractionalDigits : -1
                });

            }
        },
        testcase: {
            lastbuild: function(field) {
                return Ext.create('Rally.ui.renderer.template.LastBuildTemplate');
            }
        },
        recyclebinentry: {
            type: function(field) {
                return Ext.create('Rally.ui.renderer.template.TypeDefNameTemplate', {
                    fieldName: field.name
                });
            }
        }
    },
});