Ext.apply(Ext.data.SortTypes, {
    asUser: function(s) {
        if (Ext.isString(s)){
            return s;
        }
        return s && s.DisplayName || s._refObjectName;
    }
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
    }
});
//Ext.override(Ext.util.Sorter, {
//
//    defaultSorterFn: function(o1, o2) {
//
//        var me = this,
//            transform = me.transform,
//            v1 = me.getRoot(o1)[me.property],
//            v2 = me.getRoot(o2)[me.property];
//        console.log('function',o1,o2,v1,v2,transform,me);
//        if (transform) {
//            v1 = transform(v1);
//            v2 = transform(v2);
//        } else {
//            //if (Ext.isObject(v1)){
//            //    v1 = v1._refObjectName || v1;
//            //}
//            //if (Ext.isObject(v2)){
//            //    v2 = v2._refObjectName || v2;
//            //}
//        }
//        return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
//    }
//});
