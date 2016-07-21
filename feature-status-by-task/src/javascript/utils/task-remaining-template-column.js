Ext.define('CArABU.technicalservices.TaskRemainingTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.taskremainingcolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;
        Ext.QuickTips.init();
        me.tpl = new Ext.XTemplate('<tpl><div data-qtip="{[this.getTooltip(values)]}">{[this.getContent(values)]}</div></tpl>', {

            getContent: function(values){
                var todo = values && values.taskToDo && values.taskToDo[0] + values.taskToDo[1];
                if (todo){
                    return (todo/24/7).toFixed(1);  //Weeks
                }
                return todo;
            },
            getTooltip: function (values) {

                var toolTip = "tool tip";
                return toolTip;
            }
        });
        me.callParent(arguments);
    },
    //getValue: function(){
    //
    //    if (!values[this.denominatorField]){
    //        return "--"
    //    }
    //    var remaining = values[this.denominatorField] - (values[this.numeratorField] || 0);
    //    return remaining/values[this.denominatorField];
    //},
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.get('rollup')); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});