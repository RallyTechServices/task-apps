
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
            if (this.field === '__taskToDo'){
                return '#808080';
            }
            var colors = ['#FBB990','#7CAFD7','#8DC63F'];
            return colors[stateIdx];
        },
        getTooltip: function(values){
            var tooltip = '';
            if (this.getText(values,0)){
                tooltip += Ext.String.format("<span class='defined'>Defined</span>: {0}</br>", this.getText(values,0) || 0);
            }
            if (this.getText(values,1)){
                tooltip += Ext.String.format("<span class='inprogress'>In-Progress</span>: {0}</br>", this.getText(values,1) || 0);
            }
            if (this.getText(values,2)){
                tooltip += Ext.String.format("<span class='completed'>Completed</span>: {0}</br>", this.getText(values,2) || 0);
            }

            if (this.showDangerNotificationFn(values)){
                tooltip =  Ext.String.format("{0}<p class='warning'><span class='icon-warning'></span>{1} missing Task Estimates</p>", tooltip, values && values.__missingEstimates);
            }

            if (tooltip.length > 0){
                tooltip = values.FormattedID + '<br/>' + tooltip;
            }
            return tooltip;
        },
        showDangerNotificationFn: function(recordData) {
            return this.field === '__taskEstimatePct' && recordData && recordData.__missingEstimates > 0;
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

            if (!this.calcPercent){
                return values && values[this.field] && values[this.field][stateIdx] || 0;
            }
            var val = 0;
            var total =  Ext.Array.sum(values[this.field]),
                numerator = values[this.field][stateIdx];

            if (total > 0 && numerator){
                val = (numerator/total * 100);
            }
            return val;
        },
        calculateWidth: function (values, stateIdx) {
            if (!this.total){
                return this.getPercent(values, stateIdx) + '%';
            }

            var total =  this.total,
                numerator = values[this.field][stateIdx];

            if (total > 0 && numerator){
                return (numerator/total * 100) + '%';
            }
            return 0
        },
        getText: function(values, stateIdx){

            if (!this.total){
                var pct = this.getPercent(values, stateIdx);
                return pct > 0 ? Math.round(pct) + '%' : "";
            }

            var val = values && values[this.field] && values[this.field][stateIdx] || 0;

            if (val){
                if (this.granularityDivider){
                    val = val/this.granularityDivider; //convert to weeks
                }
                if (this.field === '__taskToDo'){
                    return val.toFixed(1);
                }
                if (val < 1 && val > 0){
                    return val.toFixed(3);
                }
                return Math.round(val) || "";
            }
            return "";
        }
    },

    constructor: function(config) {
        var templateConfig = config && config.template || [
                '<tpl>',
                '<div data-qtip="{[this.getTooltip(values)]}" class="progress-bar-container {[this.getClickableClass()]} {[this.getContainerClass(values)]}" style="{[this.getDimensionStyle()]}">',
                '<div class="rly-progress-bar" style="text-align:center;background-color: {[this.calculateColorFn(0)]}; width: {[this.calculateWidth(values,0)]}; ">',
                '<tpl if="this.showDangerNotificationFn(values)">',
                '<div class="missing-task-estimates"></div>',
                '</tpl>',
                '{[this.getText(values,0)]}</div>',
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
            field: me.dataIndex,
            total: me.total,
            granularityDivider: me.granularityDivider,
            calcPercent: me.calcPercent || false
        });
        me.callParent(arguments);
    },
    defaultRenderer: function(value, meta, record) {
        meta.style = 'cursor: pointer;';
        var data = Ext.apply({}, record.getData()); //record.get('rollup')); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});
