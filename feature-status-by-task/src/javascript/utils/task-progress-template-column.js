
Ext.define('CArABU.technicalservices.PctCompleteTemplate',{
    extend: 'Ext.XTemplate',

    /**
     * @cfg {String}
     * define a width if necessary to fit where it's being used
     */
    width: '100%',
    /**
     * @cfg {String}
     * define a height if necessary to fit where it's being used
     */
    height: '20px',

    config: {

        calculateColorFn: function(stateIdx){
            var colors = ['#FF8200','#7CAFD7','#8DC63F'];
            return colors[stateIdx];
        },
        getContainerClass: function(recordData) {
            return '';
        },
        getClickableClass: function(){
            return '';
        },
        getDimensionStyle: function(){
            return 'width: ' + this.width + '; height: ' + this.height + '; line-height: ' + this.height + ';display: inline-block';
        },
        getPercent: function(values, stateIdx){
            var total = _.reduce(values[this.field], function(a,b){ return a + b; }, 0),
                val = 0;
            if (total > 0){
                val = Math.round(values[this.field][stateIdx]/total * 100);
            }
            return val;
        },
        calculateWidth: function (values, stateIdx) {

            if (this.percent){
                return this.getPercent(values, stateIdx) + '%';
            }
            var totals = values && values.totals && values.totals[this.field];
            if (totals){
                var total = _.reduce(totals, function(a,b){ return a + b; }, 0),
                    val = values[this.field] && values[this.field][stateIdx];
                if (total > 0){
                    return Math.round(val/total * 100) + '%';
                }
            }
            return 0;

        },
        getText: function(values, stateIdx){
            if (this.percent){
                var pct = this.getPercent(values, stateIdx);
                if (pct > 0){
                    return this.getPercent(values, stateIdx) + '%';
                }
                return "";
            }
            var val = values && values[this.field] && values[this.field][stateIdx];
            if (this.granularity){
                val = val/24/7;
            }
            return Math.round(val) || "";
        }
    },

    constructor: function(config) {
        var templateConfig = config && config.template || [
                '<tpl>',
                '<div class="progress-bar-container {[this.getClickableClass()]} {[this.getContainerClass(values)]}" style="{[this.getDimensionStyle()]}">',
                '<div class="rly-progress-bar" style="text-align:center;background-color: {[this.calculateColorFn(0)]}; width: {[this.calculateWidth(values,0)]}; ">{[this.getText(values,0)]}</div>',
                '<div class="rly-progress-bar" style="text-align:center;background-color: {[this.calculateColorFn(1)]}; width: {[this.calculateWidth(values,1)]}; ">{[this.getText(values,1)]}</div>',
                '<div class="rly-progress-bar" style="text-align:center;background-color: {[this.calculateColorFn(2)]}; width: {[this.calculateWidth(values,2)]}; ">{[this.getText(values,2)]}</div>',
                '</div>',
                '</tpl>'
            ];

        templateConfig.push(this.config);
        templateConfig.push(config);

        return this.callParent(templateConfig);
    }
});



Ext.define('CArABU.technicalservices.TaskProgressTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.taskprogresscolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;
        Ext.QuickTips.init();
        me.tpl = Ext.create('CArABU.technicalservices.PctCompleteTemplate',{
            field: me.field,
            percent: me.percent || false,
            granularity: me.granularity || null
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
