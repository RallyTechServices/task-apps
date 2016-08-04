
Ext.define('CArABU.technicalservices.TaskToDoTemplate',{
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
           return '#808080';
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
        calculateWidth: function (values) {
            console.log('calculateWidth',values);
            var total =  this.total,
                numerator = values[this.field][0] + values[this.field][1];
            if (total > 0 && numerator){
                return Math.floor(numerator/total * 100);
            }
            return 0

        },
        calculateRemainingWidth: function(values){
            return 100 - this.calculateWidth(values);
        },

        getText: function(values, idx){
            var width = this.calculateWidth(values);

            var val = values[this.field][0] + values[this.field][1];
            if (val){
                if (this.granularityDivider){
                    val = val/this.granularityDivider; //convert to weeks
                }
                if (val < 1 && val > 0){
                    val = val.toFixed(2);
                } else {
                    val = Math.round(val);
                }
            }

            if (width > 75 && idx === 0){
                return val + "&nbsp;";
            }
            if (width < 75 && idx > 0){
                return "&nbsp;" + val;
            }
            return "";
        }
    },

    constructor: function(config) {
        var templateConfig = config && config.template || [
                '<tpl>',
                '<div class="progress-bar-container {[this.getClickableClass()]} {[this.getContainerClass(values)]}" style="{[this.getDimensionStyle()]}">',
                '<div class="rly-progress-bar" style="text-align:right;color:#e6e6e6;background-color: {[this.calculateColorFn()]}; width: {[this.calculateWidth(values)]}%; ">{[this.getText(values,0)]}</div>',
                '<div class="rly-progress-bar" style="text-align:left;background-color:#e6e6e6; width:{[this.calculateRemainingWidth(values)]}%; ">{[this.getText(values,1)]}</div>',
//                '<div class="rly-progress-bar" style="text-align:center;background-color: {[this.calculateColorFn()]}; width:0; "></div>',
                '</div>',
                '</tpl>'
            ];

        templateConfig.push(this.config);
        templateConfig.push(config);

        return this.callParent(templateConfig);
    }
});



Ext.define('CArABU.technicalservices.TaskToDoTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.tasktodocolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;
        Ext.QuickTips.init();
        me.tpl = Ext.create('CArABU.technicalservices.TaskToDoTemplate',{
            total: me.total,
            granularityDivider: me.granularityDivider,
            field: me.dataIndex
        });
        me.callParent(arguments);
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.getData()); //record.get('rollup')); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});
