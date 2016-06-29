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
        if (!values["Estimate"]){
            return true;
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
        denominatorField: 'Estimate',
        numeratorField: 'ToDo',
        shouldShowPercentDone: function(recordData) {
            var value = recordData["Estimate"];
            if (_.isString(value)) {
                value = +value;
            }

            if(!Ext.isNumber(value)){
                return false;
            }

            if (this.showOnlyIfInProgress) {
                return value > 0;
            }
            return true;

        },
        calculateColorFn: function(){
            return Rally.util.Colors.lime; //'#8DC63F';
        },
        calculatePercent: function (recordData) {
            if (recordData["State"] === "Completed"){
                return 100;
            }

            var denominator = recordData["Estimate"] || 0,
                numerator = recordData["ToDo"] || 0;

            var percentDone = denominator ? (denominator - numerator)/denominator : 0;
            return Math.round(percentDone * 100);
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
                return "No Estimate on Task.";
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

Ext.define('CArABU.technicalservices.PctCompleteTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.pctcompletetemplatecolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;
        Ext.QuickTips.init();
        me.tpl = Ext.create('CArABU.technicalservices.PctCompleteTemplate',{
            denominatorField: me.denominatorField,
            numeratorField: me.numeratorField
        });
        me.callParent(arguments);
    },
    getValue: function(){

        if (!values[this.denominatorField]){
            return "--"
        }
        var remaining = values[this.denominatorField] - (values[this.numeratorField] || 0);
        return remaining/values[this.denominatorField];
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.getData()); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});

Ext.define('CArABU.technicalservices.HistoricalStateTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.historicalstatetemplate'],

    align: 'right',

    initComponent: function(){
        var me = this;

        me.tpl = Ext.create('Ext.XTemplate',
            '<div aria-label="Edit Schedule State: {ScheduleState}" class="schedule-state-wrapper " style="width: 100%">',
                '{[this.renderStates(values)]}',
            '</div>',
            {
                getHistoricalState: function(values){

                    var snap = Ext.Array.filter(this.historicalRecords, function(r){
                        return r.get('ObjectID') === values['ObjectID'];
                    });
                    if (snap && snap.length > 0){
                        return snap[0].get(this.historyField) || "";
                    }
                    return "";
                },
                renderStates: function(recordData) {
                    var states = ["Defined","In-Progress","Completed"];
                    var stateUsed = true;
                    var returnVal = [];
                    var currentState = recordData["State"];
                    var previousState = this.getHistoricalState(recordData);
                    var blockWidth = Math.floor((85/(states.length))-3);

                    if (!previousState){ stateUsed = false; }
                    Ext.each(states, function(state, index) {
                        //don't add spacer at the front
                        if(index !== 0) {
                            returnVal.push('<span class="schedule-state-spacer"></span>');
                        }

                        //render an individual state block
                        returnVal.push('<div state-data="' + state + '" class="historical-schedule-state');

                        if (stateUsed) {
                            returnVal.push(' historical-before-state');
                        }

                        if (state === previousState) {
                            var symbolState = this._getSymbolState(recordData, state);
                            returnVal.push(' historical-state');
                            returnVal.push('" style="width:' + blockWidth*2 + '%">&nbsp;' + symbolState + '&nbsp;</div>');

                        } else {
                            returnVal.push(' clickable-state');
                            returnVal.push('" style="width:' + blockWidth + '%">&nbsp;</div>');
                        }

                        //flip the switch so remaining states are gray
                        if(state === currentState) {
                            stateUsed = false;
                        }
                    }, this);

                    return returnVal.join('');
                },
                _getSymbolState: function(recordData, state) {
                    var symbolState = state === 'In-Progress' ? 'P' : state.charAt(0);
                    return symbolState;
                },
                historyField: me.historyField,
                historicalRecords: me.historicalRecords
        });
        me.callParent(arguments);
    },
    getValue: function(){
        return "";
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.getData()); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});


Ext.define('CArABU.technicalservices.HistoricalDeltaTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.historicaldeltatemplate'],

    align: 'right',

    initComponent: function(){
        var me = this;

        me.tpl = Ext.create('Ext.XTemplate',
            '<div class="{[this.getDeltaDirection(values)]}"></div><span style="color:#A9A9A9">{[this.getDelta(values)]}</span>',{
                getDeltaDirection: function(values){

                    var field = this.deltaField,
                        historicalValue = this.getHistoricalValue(values, field) || 0,
                        currentValue = values[field] || 0;

                    if (currentValue === historicalValue){
                        return "history";
                    }
                    return currentValue > historicalValue ? "icon-up history" : "icon-down history";
                },
                getDelta: function(values){
                    var field = this.deltaField,
                        historicalValue = this.getHistoricalValue(values, field) || 0,
                        currentValue = values[field] || 0;

                    if (currentValue === historicalValue){
                        return "No Change";
                    }
                    return Math.abs(currentValue - historicalValue);
                },
                getHistoricalValue: function(values, field){

                    var snap = Ext.Array.filter(this.historicalRecords, function(r){
                        return r.get('ObjectID') === values['ObjectID'];
                    });

                    if (snap && snap.length > 0){
                        return snap[0].get(field) || "";
                    }
                    return "";
                },
                deltaField: me.deltaField,
                historicalRecords: me.historicalRecords
            });
        me.callParent(arguments);
    },
    getValue: function(){
        return "";
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.getData()); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});

Ext.define('CArABU.technicalservices.WorkProductTemplateColumn',{
    extend: 'Ext.grid.column.Template',
    alias: ['widget.workproducttemplatecolumn'],

    getTemplateType: function(field){
        if (field === 'Milestones'){
            return Ext.create('Rally.ui.renderer.template.PillTemplate', { collectionName: 'Milestones', iconCls: 'icon-milestone', cls: 'milestone-pill'});
        }
        if (field === "PredecessorsAndSuccessors"){
            return Ext.create('CArABU.technicalservices.PredecessorsAndSuccessorsStatusTemplate');
        }

        if (field === "Feature"){
            return Ext.create('Rally.ui.renderer.template.FeatureTemplate');
        }

        if (field === "Initiative"){
            return Ext.create('CArABU.technicalservices.InitiativeTemplate');
        }
        return "";
    },

    align: 'center',
    initComponent: function(){
        var me = this;

        me.tpl = this.getTemplateType(me.workProductField);

        me.callParent(arguments);
    },
    getValue: function(){
        return "";
    },
    defaultRenderer: function(value, meta, record) {
        var storyRecord = record.get('WorkProduct');
        var data = Ext.apply({}, storyRecord); //, record.getAssociatedData());
        return this.tpl.apply(data);
    }
});

