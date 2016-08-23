Ext.define("task-burnup", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox'},
        {xtype: 'container', itemId: 'chart_header_box', layout: 'hbox'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "task-burnup"
    },

    portfolioFeatureTypePath: 'PortfolioItem/Feature',
    margin: 10,
    showCFD: false,
                        
    launch: function() {
        this.initializeApp();
    },

    initializeApp: function(){
        this.logger.log('initializeApp');
        this.addComponents();
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getDisplayBox: function(){
        return this.down('#display_box');
    },
    getChartHeader: function(){
        return this.down('#chart_header_box');
    },
    addComponents: function(){
        this.logger.log('addComponents');

        this.getSelectorBox().add({
            fieldLabel: 'Feature Milestone',
            xtype: 'rallymilestonepicker',
            labelAlign: 'right',
            margin: this.margin,
            listeners: {
                select: function(pk){
                    pk.syncSelectionText();
                },
                deselect: function(pk,value,values){
                    pk.syncSelectionText();
                    if (!values || values.length === 0){
                        pk.setValueText("");
                    }

                }
            }
        });

        var bt = this.getSelectorBox().add({
            xtype: 'rallybutton',
            text: 'Update',
            margin: this.margin
        });
        bt.on('click', this.getFeatures, this);

        this.getChartHeader().add({
            xtype: 'container',
            flex: 1
        });

        this.getChartHeader().add({
            xtype: 'rallybutton',
            iconCls: 'icon-bars',
            itemId: 'btn-burnup',
            cls: 'primary rly-small',
            pressedCls: 'primary rly-small',
            enableToggle: true,
            pressed: true,
            scope: this,
            listeners: {
                toggle: this.toggleDetail,
                scope: this
            }
        });

       this.getChartHeader().add({
            xtype: 'rallybutton',
            iconCls: 'icon-graph',
            itemId: 'btn-cfd',
            cls: 'secondary rly-small',
            pressedCls: 'primary rly-small',
            enableToggle: true,
            scope: this,
            pressed: false,
           listeners: {
                toggle: this.toggleDetail,
                scope: this
            }
        });

    },
    toggleDetail: function(btn, state){
        this.logger.log('_toggleDetail', btn.itemId, state);
        if (state){
            btn.removeCls('secondary');
            btn.addCls('primary');
        } else {
            btn.removeCls('primary');
            btn.addCls('secondary');
        }

        this.getFeatures();

    },
    getShowCFD: function(){
        return this.down('#btn-cfd').pressed;
    },
    getShowBurnup: function(){
        return this.down('#btn-burnup').pressed;
    },
    getMilestoneRefs: function(){
        return this.down('rallymilestonepicker').getValue();
    },
    getFeatures: function(){

        var milestones = this.getMilestoneRefs(),
            filters = Ext.Array.map(milestones, function(m){
                return {
                    property: 'Milestones',
                    value: m.get('_ref')
                };
            });
            filters = Rally.data.wsapi.Filter.or(filters);
        this.logger.log('getFeatures',milestones, filters);
        Ext.create('Rally.data.wsapi.Store',{
            model: this.portfolioFeatureTypePath,
            fetch: ['ObjectID'],
            filters: filters,
            limit: 'Infinity'
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    this.updateView(records);
                } else {
                    var msg = operation.error.errors.join(',');
                    this.showErrorNotification(msg);
                }
            },
            scope: this
        });

    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    updateView: function(features){

        var featureOids = Ext.Array.map(features, function(f){ return f.get('ObjectID');});
        this.logger.log('updateView', featureOids);

        this.getDisplayBox().removeAll();

        if (this.getShowBurnup()){
            this.getDisplayBox().add({
                xtype: 'rallychart',
                storeType: 'Rally.data.lookback.SnapshotStore',
                storeConfig: this.getStoreConfig(featureOids),
                calculatorType: 'CArABU.technicalservices.TaskBurnupCalculator',
                calculatorConfig: {},
                chartConfig: this.getChartConfig()
            });
        }

        if (this.getShowCFD()) {
            this.getDisplayBox().add({
                xtype: 'rallychart',
                storeType: 'Rally.data.lookback.SnapshotStore',
                storeConfig: this.getStoreConfig(featureOids),
                calculatorType: 'CArABU.technicalservices.TaskCFDCalculator',
                calculatorConfig: {},
                chartConfig: this.getCFDConfig() //this.getChartConfig()
            });
        }



    },

    getStoreConfig: function(featureOids) {
        var MAX_SIZE = 25,
            configs = [];

        for (var i=0; i < featureOids.length; i = i + MAX_SIZE){
            var chunk = Ext.Array.slice(featureOids, i, i + MAX_SIZE);
            configs.push({
                find: {
                    _ItemHierarchy: {$in: chunk},
                    _TypeHierarchy: 'Task'
                },
                fetch: ['State', 'ToDo','Estimate'],
                hydrate: ['State'],
                sort: {
                    _ValidFrom: 1
                },
                context: this.getContext().getDataContext(),
                limit: Infinity
            });
        }
        return configs;
    },
    getCFDConfig: function(){
        return {
            chart: {
                zoomType: 'xy'
            },
            title: {
                text: 'Task Cumulative Flow'
            },
            xAxis: {
                tickmarkPlacement: 'on',
                tickInterval: 20,
                title: {
                    text: 'Date'
                }
            },
            yAxis: [
                {
                    title: {
                        text: 'Weeks'
                    }
                }
            ],
            plotOptions: {
                series: {
                    marker: {
                        enabled: false
                    }
                },
                area: {
                    stacking: 'normal'
                }
            }
        };
    },
    getChartConfig: function() {
        return {
            chart: {
                defaultSeriesType: 'area',
                zoomType: 'xy'
            },
            title: {
                text: 'Task Burnup'
            },
            xAxis: {
                categories: [],
                tickmarkPlacement: 'on',
                tickInterval: 20,
                title: {
                    text: 'Date',
                    margin: 10
                }
            },
            yAxis: [
                {
                    title: {
                        text: 'Weeks'
                    }
                }
            ],
            tooltip: {
                formatter: function() {
                    return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                }
            },
            plotOptions: {
                series: {
                    marker: {
                        enabled: false,
                        states: {
                            hover: {
                                enabled: true
                            }
                        }
                    },
                    groupPadding: 0.01
                },
                column: {
                    stacking: null,
                    shadow: false
                }
            }
        };
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
