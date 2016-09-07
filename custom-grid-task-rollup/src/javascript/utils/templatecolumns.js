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

    /**
     * @cfg {Function}
     * A function that should return true to show a triangle in the top right to denote something is missing.
     * Defaults to:
     *      function(){ return false; }
     */
    showDangerNotificationFn: function(values) {
        var taskObjectIDs = this.taskCache && this.taskCache.getTaskList(values.ObjectID);

        if (Ext.isArray(taskObjectIDs)){
            var invalid = false;
            Ext.Array.each(taskObjectIDs, function(t){
                var task = this.taskCache.getTask(t);
                if (task){
                    invalid = !task.Estimate;
                    if (invalid){
                        return false;
                    }
                }
            }, this);
            return invalid;

        }
        return false;
    },

    /**
     * @cfg {Function} (required)
     * A function that returns the color for the percent done bar in hex
     */


    /**
     * @cfg {Boolean} (optional)
     * A boolean that indicates whether the progress bar is clickable
     */
    isClickable: false,

    /**
     * @cfg {Boolean}
     * If the percent done is 0%, do not show the bar at all
     */
    showOnlyIfInProgress: false,

    /**
     * @cfg {Function}
     * A function that returns the text to show in the progress bar.
     * Defaults to a function that returns the percentage complete.
     */
    generateLabelTextFn: function (recordData) {
        return this.calculatePercent(recordData) + '%';
    },

    config: {
        shouldShowPercentDone: function(recordData) {

            return true;

        },
        calculateColorFn: function(){
            return Rally.util.Colors.lime; //'#8DC63F';
        },
        calculatePercent: function (recordData) {

            var useCount = this.useCount,
                completed = 0,
                total = 0,
                taskObjectIDs = this.taskCache && this.taskCache.getTaskList(recordData.ObjectID);
            if (Ext.isArray(taskObjectIDs)){
                Ext.Array.each(taskObjectIDs, function(t){
                    var task = this.taskCache.getTask(t);
                    var isCompleted = task.State === "Completed",
                        estimate = task.Estimate || 0,
                        todo = task.ToDo || 0;
                    if (useCount){
                        completed += isCompleted && 1 || 0;
                        total++;
                    } else {
                        completed += estimate - todo;
                        total += estimate;
                    }
                }, this);


            } else {
                //just a task
                var isCompleted = recordData.State === "Completed";

                if (this.useCount){
                    completed = isCompleted && 1 || 0;
                    total = 1;
                } else {
                    if (isCompleted){
                        completed = recordData.Estimate || 0;
                    } else {
                        completed = recordData.Estimate - recordData.ToDo || 0;

                    }
                    total = recordData.Estimate || 0;
                }
            }
            if (total > 0){
                completed = Math.max(completed, 0);
                return Math.round(completed/total * 100);
            }
            return 0;
        },

        getContainerClass: function(recordData) {
            return '';
        },
        getClickableClass: function(){
            return this.isClickable ? 'clickable' : '';
        },
        getDimensionStyle: function(){
            return 'width: ' + this.width + '; height: ' + this.height + '; line-height: ' + this.height + ';display: inline-block';
        },
        calculateWidth: function (recordData) {
            var percentDone = this.calculatePercent(recordData);
            return percentDone > 100 ? '100%' : percentDone + '%';
        },
        getDangerTooltip: function(recordData){
            if (!recordData["Estimate"]){
                return "No Estimate on one or more Tasks.";
            }
            return "";
        }
    },

    constructor: function(config) {
        var templateConfig = config && config.template || [
                '<tpl>',
                '<div data-qtip="{[this.getDangerTooltip(values)]}" class="progress-bar-container {[this.getClickableClass()]} {[this.getContainerClass(values)]}" style="{[this.getDimensionStyle()]}">',
                '<div class="rly-progress-bar" style="background-color: {[this.calculateColorFn(values)]}; width: {[this.calculateWidth(values)]}; "></div>',
                '<tpl if="this.showDangerNotificationFn(values)">',
                '<div class="progress-bar-danger-notification"></div>',
                '</tpl>',
                '<div class="progress-bar-label">',
                '{[this.generateLabelTextFn(values)]}',
                '</div>',
                '</div>',
                '</tpl>'
            ];

        templateConfig.push(this.config);
        templateConfig.push(config);

        return this.callParent(templateConfig);
    }
});

Ext.define('CArABU.technicalservices.TaskPctComplete', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.taskpctcomplete'],

    align: 'right',

    initComponent: function(){
        var me = this;
        Ext.QuickTips.init();
        me.tpl = Ext.create('CArABU.technicalservices.PctCompleteTemplate',{
            taskCache: me.taskCache,
            useCount: me.useCount || false
        });
        me.callParent(arguments);
    },
    //getValue: function(){
    //
    //   return 10;
    //},
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.getData());
        return this.tpl.apply(data);
    }
});
