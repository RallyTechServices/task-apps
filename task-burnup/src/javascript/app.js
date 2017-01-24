Ext.define("task-burnup", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox'},
        {xtype:'container',itemId:'filter_box', layout: 'hbox'},
        {xtype: 'container', itemId: 'chart_header_box', layout: 'hbox'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "task-burnup"
    },
    config: {
        defaultSettings: {
            portfolioItemType: "PortfolioItem/Feature",
            employeeIDField: 'c_EmployeeId',
            managerEmployeeIDField: 'c_ManagerEmployeeId'
        }
    },
    margin: 5,
    showCFD: false,

    cfdToolTipText: "<p>Task Cumulative Flow</p><p>The task cumulative flow chart shows the flow of Task states over time.</p><p>Completed is the sum of the estimate of all tasks in the completed state in addition to the Estimate - ToDo for tasks in the In-Progress or Defined state (in weeks).</p><p>In-Progress is the sum of the ToDo (or Estimate if there is no To Do) for the tasks In Progress.</p><p>Defined is the sum of the To Do (or Estimate if there is no To Do) for tasks in the Defined state.</p>",

    burnupToolTipText: "<p>Task Burnup</p><p>The task burnup chart shows the sum of the completed, remaining and estimated tasks (in weeks) over time for the selected criteria.</p><p>Completed is the sum of the estimate of all tasks in the completed state in addition to the Estimate - ToDo for tasks in the In-Progress or Defined state.</p><p>Estimated is the sum of the Task Estimates.</p><p>Remaining is the sum of the Task To Do (if the task is not in the Completed state).</p>",
                        
    launch: function() {
        this.setLoading('Initializing Users...');
        CArABU.technicalservices.Utility.fetchManagerTree(this.getManagerIDField(), this.getEmployeeIDField()).then({
            success: function(){
                this.initializeApp();
            },
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false); },this);
    },
    getPortfolioItemType: function(){
        return this.getSetting('portfolioItemType');
    },
    getManagerIDField: function(){
        return this.getSetting('managerEmployeeIDField');
    },
    getEmployeeIDField: function(){
        return this.getSetting('employeeIDField');
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
            fieldLabel: 'Story Release',
            xtype: 'rallyreleasecombobox',
            itemId: 'cbRelease',
            labelAlign: 'right',
            labelWidth: 80,
            margin: this.margin
        });

        this.getSelectorBox().add({
                fieldLabel: 'Feature Milestone',
                xtype: 'rallymilestonepicker',
                itemId: 'featureMilestone',
                labelAlign: 'right',
                labelWidth: 100,
                width: 300,
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

        this.getSelectorBox().add({
            fieldLabel: 'Story Milestone',
            xtype: 'rallymilestonepicker',
            itemId: 'storyMilestone',
            labelAlign: 'right',
            margin: this.margin,
            labelWidth: 100,
            width: 300,
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
        var filterBox = this.down('#filter_box').add({
            xtype: 'standalonefilter',
            context: this.getContext(),
            flex: 1
        });

        filterBox.getLeft().add({
            xtype: 'rallyusercombobox',
            margin: this.margin,
            fieldLabel: 'Manager',
            itemId: 'usrManager',
            labelAlign: 'right',
            labelWidth: 100,
            width: 300,
            stateful: true,
            allowNoEntry: true,
            stateId: this.getContext().getScopedStateId('userManager'),
            displayField: "DisplayName",
            valueField: "ObjectID",
            value: null
        });

        var bt = filterBox.getRight().add({
            xtype: 'rallybutton',
            text: 'Update',
            margin: '5 50 5 50',
            width: 100
        });

        bt.on('click', this.getAncestors, this);

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
            toolTipText: this.burnupToolTipText,
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
           toolTipText: this.cfdToolTipText,
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

        this.getAncestors();

    },
    getShowCFD: function(){
        return this.down('#btn-cfd').pressed;
    },
    getShowBurnup: function(){
        return this.down('#btn-burnup').pressed;
    },
    getFeatureMilestones: function(){
        return this.down('#featureMilestone').getValue() || [];
    },
    getStoryMilestones: function(){
        return this.down('#storyMilestone').getValue() || [];
    },
    getReleaseFilter: function(){
        return this.down('#cbRelease').getQueryFromSelected();
    },
    getFeatureFilters: function() {
        return this.down('standalonefilter').getCustomFilter();
    },
    getStoryFiltersFromFeatureFilters: function(featureFilters){
        if (!featureFilters){
            return [];
        }

        var filterString = featureFilters.toString(),
            featureName = this.getFeatureName();

        var filters = filterString.match(/\([^()]+\)/g);
        Ext.Array.each(filters, function(segment){
            var newSegment= segment.replace("(","(" + featureName + ".");
            filterString = filterString.replace(segment, newSegment);
        });
        this.logger.log('getStoryFiltersFromFeatureFilters', filterString);
        return Rally.data.wsapi.Filter.fromQueryString(filterString);
    },
    getFeatureName: function(){
        return this.getPortfolioItemType().replace('PortfolioItem/','');
    },
    getTaskOwners: function(){
        var manager = this.down('#usrManager') && this.down('#usrManager').getRecord();

        this.logger.log('getTaskOwners', manager);
        var users = [];
        if (manager){
            this.logger.log('getTaskOwners including manager reports', manager);
            var reports = CArABU.technicalservices.Utility.getReports(manager);
            users = users.concat(reports);
        }
        if (users.length > 0){
            return users;
        }
        return null;
    },
    getAncestors: function(){

        var featureMilestones = this.getFeatureMilestones(),
            storyMilestones = this.getStoryMilestones(),
            featureFilters = this.getFeatureFilters(),
            featureName = this.getFeatureName(),
            releaseFilter = this.getReleaseFilter();

        this.logger.log('getAncestors', featureMilestones, storyMilestones, featureFilters);


        var model = 'HierarchicalRequirement',
            filters = releaseFilter;

        if (storyMilestones.length > 0) {
            var storyFilters = Ext.Array.map(storyMilestones, function (m) {
                return {
                    property: 'Milestones',
                    value: m.get('_ref')
                };
            });
            storyFilters = Rally.data.wsapi.Filter.or(storyFilters);
            filters = filters.and(storyFilters);
        }

        if (featureMilestones.length > 0){
                var featureParentFilters = Ext.Array.map(featureMilestones, function(m){
                    return {
                        property: featureName + '.Milestones',
                        value: m.get('_ref')
                    };
                });
                featureParentFilters = Rally.data.wsapi.Filter.or(featureParentFilters);
                filters = filters.and(featureParentFilters);
        }

        if (featureFilters){
            this.logger.log('featureFilters', featureFilters, featureFilters.toString());
            filters = filters.and(this.getStoryFiltersFromFeatureFilters(featureFilters));
        }



        this.logger.log('getAncestors',filters.toString());

        //    model = 'HierarchicalRequirement';
        //    filters = storyFilters;
        //
        //} else if (featureMilestones.length > 0){
        //    filters = Ext.Array.map(featureMilestones, function(m){
        //        return {
        //            property: 'Milestones',
        //            value: m.get('_ref')
        //        };
        //    });
        //    filters = Rally.data.wsapi.Filter.or(filters);
        //
        //    if (featureFilters){
        //        filters = filters.and(featureFilters);
        //    }
        //
        //} else if (featureFilters){
        //    filters = featureFilters;
        //}

        Ext.create('Rally.data.wsapi.Store',{
            model: model,
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
    showNoData: function(){
        this.getDisplayBox().add({
            xtype: 'container',
            html: '<div class="no-data-container"><div class="secondary-message">No Data was found for the currently selected filters and project.</div></div>'
        });
    },
    updateView: function(ancestors){

        var oids = Ext.Array.map(ancestors, function(f){ return f.get('ObjectID');});
        this.logger.log('updateView', oids);

        this.getDisplayBox().removeAll();

        if (oids.length === 0){
            this.showNoData();
            return;
        }

        var taskOwners = this.getTaskOwners();

        if (this.getShowBurnup()){
            this.getDisplayBox().add({
                xtype: 'rallychart',
                chartColors:  ['#6ab17d', '#E5D038', '#E57E3A'],  //Estimate, completed, Remaining
                storeType: 'Rally.data.lookback.SnapshotStore',
                storeConfig: this.getStoreConfig(oids),
                calculatorType: 'CArABU.technicalservices.TaskBurnupCalculator',
                calculatorConfig: {
                    taskOwners: taskOwners
                },
                chartConfig: this.getChartConfig()
            });
        }

        if (this.getShowCFD()) {
            this.getDisplayBox().add({
                xtype: 'rallychart',
                chartColors:  ['#E57E3A', '#E5D038', '#6ab17d'],
                storeType: 'Rally.data.lookback.SnapshotStore',
                storeConfig: this.getStoreConfig(oids),
                calculatorType: 'CArABU.technicalservices.TaskCFDCalculator',
                calculatorConfig: {
                    taskOwners: taskOwners
                },
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
                fetch: ['State', 'ToDo','Estimate','Owner'],
                hydrate: ['State'],
                sort: {
                    _ValidFrom: 1
                },
                context: this.getContext().getDataContext(),
                limit: Infinity,
                removeUnauthorizedSnapshots: true 
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
            },
            tooltip: {
                formatter: function() {
                    return '' + this.x + '<br />' + this.series.name + ': ' + Math.round(this.y);
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
                    return '' + this.x + '<br />' + this.series.name + ': ' + Math.round(this.y);
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
