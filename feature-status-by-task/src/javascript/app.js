Ext.define("feature-status-by-task", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'filter_box', layout: 'hbox'},
        {xtype:'container',itemId:'summary_box', layout: 'hbox', padding: 25},
        {xtype:'container',itemId:'grid_box'}
    ],

    integrationHeaders : {
        name : "feature-status-by-task"
    },

    config: {
        defaultSettings: {
            portfolioItemType: "PortfolioItem/Feature"
        }
    },
    groupByFields: ['c_PMTMaster','c_PMTMasterName'],
    groupByModel: "PortfolioItem/Feature",
                        
    launch: function() {
        this.addStoryFilters();
        //this.buildStore();
    },
    //buildStore: function(){
    //    this.getGridBox().removeAll();
    //    var fetchList = this.getFeatureFetchList();
    //    Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
    //        models: this.getModelName(),
    //        enableHierarchy: false,
    //        fetch: fetchList
    //    }).then({
    //        success: this.buildGrid,
    //        scope: this
    //    });
    //
    //},
    addStoryFilters: function(){
        this.logger.log('addStoryFilters');

        var ct = this.down('#filter_box');
        ct.removeAll();

        var groupByFields = this.groupByFields;
        ct.add({
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Group by',
            labelAlign: 'right',
            itemId: 'cbGroupBy',
            margin: 5,
            allowNoEntry: true,
            model: this.getModelName(),
            _isNotHidden: function(field){
                if (Ext.Array.contains(groupByFields, field.name)){
                    return true;
                }
                return false;
            }
        });


        ct.add({
            xtype: 'rallyreleasecombobox',
            margin: 5,
            fieldLabel: 'Release',
            labelAlign: 'right'
        });

        ct.add({
            xtype: 'rallymilestonepicker',
            margin: 5,
            fieldLabel: 'Story Milestones',
            labelAlign: 'right'
        });

        ct.add({
            xtype: 'rallyusercombobox',
            margin: 5,
            fieldLabel: 'Task Owner',
            labelAlign: 'right'
        });

        ct.add({
            xtype: 'rallybutton',
            margin: 5,
            text: 'Go',
            listeners: {
                click: this.updateView,
                scope: this
            }
        });

    },
    getExtendedModelName: function(){
        return "FeatureStatusModel";
    },
    getSummaryBox: function(){
        return this.down('#summary_box');
    },
    updateView: function(){
        this.logger.log('updateView');
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        this.getGridBox().removeAll();
        this.getSummaryBox().removeAll();

        //First, we need to get the feature IDs of interest
        this.fetchWsapiRecords({
            model: 'HierarchicalRequirement',
            fetch: ['Feature','ObjectID'],
            filters: this.getStoryFilters(),
            limit: 'Infinity'
        }).then({
            success: this.fetchFeatures,
            failure: this.showErrorNotification,
            scope: this
        });
    },
    fetchFeatures: function(records){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid

        var featureIDs = this.getFeatureIDs(records);

        CArABU.technicalservices.ModelBuilder.build(this.getModelName(), this.getExtendedModelName()).then({
            success: function(model){
                this.setLoading(true);

                CArABU.technicalservices.Utility.fetchChunkedWsapiRecords({
                    model: model,
                    fetch: this.getFeatureFetchList()
                }, featureIDs).then({
                    success: this.fetchTasks,
                    failure: this.showErrorNotification,
                    scope: this
                }).always( function(){ this.setLoading(false);}, this);
            },
            failure: this.showErrorNotification,
            scope: this
        });
    },
    fetchTasks: function(records){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        this.logger.log('fetchTasks', records.length);
        if (!records || records.length === 0){
            this.setLoading(false);
            this.down('#display_box').add({
                xtype: 'container',
                html: '<div class="no-data-container"><div class="secondary-message">No Features were found for the currently selected filters and project.</div></div>'
            });
            return;
        }

        Ext.create('CArABU.technicalservices.FeatureTaskStore').loadTasks(records).then({
            success: this.refineRecords,
            failure: this.showErrorNotification,
            scope: this
        });
    },
    refineRecords: function(records){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        //this function takes the feature records with the tasks on them and refines them accoring to the filters.
        var maxToDo = 0,
            maxEstimate = 0,
            maxCount = 0,
            totalToDo = [0,0,0],
            totalCount = [0,0,0],
            totalEstimate = [0,0,0],
            taskOwners = this.getTaskOwners();

        Ext.Array.each(records, function(r){
            var resultsHash = r.calculateRollups(taskOwners);
            maxToDo = Math.max(maxToDo, Ext.Array.sum(resultsHash.todo));
            maxEstimate = Math.max(maxEstimate, Ext.Array.sum(resultsHash.estimate));
            maxCount = Math.max(maxCount, Ext.Array.sum(resultsHash.count));

            for (var i = 0; i < 3; i++){
                totalToDo[i] += resultsHash.todo[i];
                totalCount[i] += resultsHash.count[i];
                totalEstimate[i] += resultsHash.estimate[i];
            }
        });
        this.logger.log('refineRecords', totalToDo, totalEstimate, totalCount);

        this.buildSummaryBar(records.length, totalToDo, totalEstimate, totalCount);
        this.buildTreeGrid(records, maxToDo, maxEstimate, maxCount);
    },
    buildSummaryBar: function(totalFeatures, totalToDo, totalEstimate, totalCount) {
        this.logger.log('buildSummaryBar', totalFeatures, totalToDo, totalEstimate, totalCount);

        var colorData = [{
            color: '#FF8200',
            label: 'Defined'
        },{
            color: '#7CAFD7',
            label: 'In-Progress'
        },{
            color: '#8DC63F',
            label: 'Completed'
        }];

        var maxToDo = Math.max(totalEstimate[0] + totalEstimate[1], Ext.Array.sum(totalToDo)),
            maxEstimate = Ext.Array.sum(totalEstimate),
            maxCount = Ext.Array.sum(totalCount);
        this.logger.log('buildSummaryBar', maxToDo, maxEstimate, maxCount);
        this.getSummaryBox().add({
            xtype: 'rallygrid',
            itemId: 'summary-grid',
            store: Ext.create('Rally.data.custom.Store',{
                data: [{
                    legend: colorData,
                    totalCount: totalFeatures,
                    totalTaskToDo: totalToDo,
                    totalTaskEstimate: totalEstimate,
                    totalTaskCount: totalCount
                }]
            }),
            enableRanking: false,
            enableBulkEdit: false,
            showRowActionsColumn: false,
            columnCfgs: [{
                xtype: 'templatecolumn',
                tpl: '<tpl for="legend"><div class="tslegend" style="background-color:{color}">&nbsp;&nbsp;</div><div class="tslegendtext">&nbsp;&nbsp;{label}</div><span class="tslegendspacer">&nbsp;</span></tpl>',
                width: 350
            },{
                text: 'Total Features',
                dataIndex: 'totalCount',
                flex: 1,
                align: 'center'
            },{
                xtype: 'tasktodocolumn',
                dataIndex: 'totalTaskToDo',
                total: maxToDo,
                text: "Total Task ToDo (wks)",
                granularityDivider: 24*7,
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                dataIndex: 'totalTaskEstimate',
                total: maxEstimate,
                text: "Total Task Estimate (wks)",
                granularityDivider: 24*7,
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                text: "Total Task Estimate %",
                dataIndex: 'totalTaskEstimate',
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                dataIndex: 'totalTaskCount',
                text: "Total # Tasks",
                total: maxCount,
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                text: "Total # Tasks %",
                dataIndex: 'totalTaskCount',
                flex: 2,
                align: 'center'

            }],
            width: '100%',
            flex: 1,
            showPagingToolbar: false
        });
    },
    buildTreeGrid: function(records, maxToDo, maxEstimate, maxCount){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        this.logger.log('buildGrid', records);

        var groupBy = this.getGroupByField();

        this.logger.log('buildGrid records', records, groupBy);

        if (groupBy){
            //We need a tree grid
        } else {
            //A regular grid is fine.

            this.getGridBox().add({
                xtype: 'rallygrid',
                context: this.getContext(),
                modelNames: this.getExtendedModelName(),
                //plugins: [
                //    this.getFilterPlugin(),
                //    this.getFieldPickerPlugin()
                //],
                store: Ext.create('Rally.data.custom.Store',{
                    model: this.getExtendedModelName(),
                    data: records
                }),
                enableRanking: false,
                enableBulkEdit: false,
                showRowActionsColumn: false,
                columnCfgs: this.getColumnCfgs(maxToDo, maxEstimate, maxCount),
                height: this.getHeight(),
                width: '100%',
                flex: 1
            });
        }


    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getGroupByField: function(){
        return this.down('#cbGroupBy') && this.down('#cbGroupBy').getValue() || null;
    },
    getFeatureIDs: function(storyRecords){
        var ids = [];
        Ext.Array.each(storyRecords, function(s){
            var id = s.get('Feature') && s.get('Feature').ObjectID;
            if (id && !Ext.Array.contains(ids, id)){
                ids.push(id);
            }
        });
        this.logger.log('getFeatureIDs.Feature ObjectIDs', ids);
        return ids;
    },
    getFeatureFetchList: function(){
        var fetch =  ['ObjectID','FormattedID','Name'];
        if (this.getGroupByField()){
            fetch.push(this.getGroupByField());
        }
        return fetch;
    },
    getModelName: function(){
        return this.getSetting('portfolioItemType');
    },
    fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        config.limit = 'Infinity';

        Ext.create('Rally.data.wsapi.Store',config).load({
            callback: function(records, operation, success){
                this.logger.log('fetchFeatures.load',success, operation, records);
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    var msg = Ext.String.format("Error fetching features: {0}", operation.error.errors.join(','));
                    deferred.reject(msg);
                }
            },
            scope: this
        });
        return deferred;
    },
    buildGrid: function(store){

        store.on('load', this.fetchCalculatedData, this);

        this.getGridBox().add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this.getModelNames(),
            toggleState: 'grid',
            stateful: false,
            stateId: 'grid1',
            plugins: [
                this.getFilterPlugin(),
                this.getFieldPickerPlugin()
            ],
            gridConfig: {
                store: store,
                stateId: 'treegrid1',
                stateful: true,
                enableRanking: false,
                enableBulkEdit: false,
                folderSort: false,
                shouldShowRowActionsColumn: false,
                columnCfgs: this.getColumnCfgs(),
                derivedColumns: this.getCalculatedColumns()
            },
            height: this.getHeight(),
            width: '100%',
            flex: 1
        });

    },
    getStoryFilters: function(){
        var timeboxCombo = this.down('rallyreleasecombobox'),
            timeboxFilter = timeboxCombo && timeboxCombo.getValue() && timeboxCombo.getQueryFromSelected() || null,
            milestoneFilter = null,
            milestones = this.down('rallymilestonepicker') && this.down('rallymilestonepicker').getValue();

        this.logger.log('getStoryFilters',timeboxCombo.getValue(), milestones);

        if (milestones && milestones.length > 0){
            milestoneFilter = Ext.Array.map(milestones, function(m){
                return {
                    property: "Milestones",
                    value: m.get('_ref')
                };
            });
            milestoneFilter =  Rally.data.wsapi.Filter.or(milestoneFilter);
            this.logger.log('getStoryFilters milestoneFilter', milestoneFilter.toString());
        }


        if (timeboxFilter && milestoneFilter){
            return timeboxFilter.and(milestoneFilter);
        }
        return timeboxFilter || milestoneFilter || null;
    },
    getTaskOwners: function(){
        var taskOwner = this.down('rallyusercombobox') && this.down('rallyusercombobox').getRecord();

        this.logger.log('getTaskFilters', taskOwner);
        if (taskOwner){
            return [taskOwner.get('ObjectID')];
        }
        return null;
    },
    fetchCalculatedData: function(store, node, featureRecords, success){
        this.logger.log('fetchCalculatedData', featureRecords);
        var storyFilters = this.getStoryFilters(),
            taskOwners = this.getTaskOwners();
        //task remaining (weeks)
        //task estimate weeks by state
        //% task estimate
        //# tasks
        //% # tasks
        Ext.create('CArABU.technicalservices.FeatureTaskStore').load(featureRecords, storyFilters, taskOwners).then({
            success: this.updateSummary,
            failure: this.showError,
            scope: this
        });
    },
    updateSummary: function(totals){
        this.logger.log('updateSummary', totals);

        //var tpl = new Ext.XTemplate('<div class="coverageTitle"><b>{workItemsCoveragePercent} %</b> of work items have test coverage ({workItemsCoverage} / {workItemsTotal})</div>',
        //    '<div class="tslegend" style="background-color:#8bbc21;">&nbsp;&nbsp;</div><div class="tslegendtext">&nbsp;&nbsp;User Stories</div><span class="tslegendspacer">&nbsp;</span></div>',
        //    '<div class="tslegend" style="background-color:#c42525">&nbsp;&nbsp;</div><div class="tslegendtext">&nbsp;&nbsp;Defects</div><span class="tslegendspacer">&nbsp;</span></div>',
        //    '<div class="tslegend" style="background-color:#2f7ed8">&nbsp;&nbsp;</div><div class="tslegendtext">&nbsp;&nbsp;TestSets</div><span class="tslegendspacer">&nbsp;</span></div>',
        //    '<div class="tslegend" style="background-color:#ccc">&nbsp;&nbsp;</div><div class="tslegendtext">&nbsp;&nbsp;No Coverage</div><span class="tslegendspacer">&nbsp;</span></div>'
        //
        //);
        //
        //header.add({
        //    xtype: 'container',
        //    itemId: 'ct-summary',
        //    tpl: tpl,
        //    margin: '0 100 0 75',
        //    flex: 1
        //
        //});

    },
    showError: function(msg){
        this.logger.log('showError', msg);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getColumnCfgs: function(maxToDo, maxEstimate, maxCount){
        return [{
            dataIndex: 'FormattedID'
        }, {
            dataIndex: 'Name',
            flex: 1
        },{
            xtype: 'tasktodocolumn',
            dataIndex: '__taskToDo',
            total: maxToDo,
            text: "Task ToDo (wks)",
            granularityDivider: 24*7
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskEstimate',
            total: maxEstimate,
            text: "Task Estimate (wks)",
            granularityDivider: 24*7
        },{
            xtype: 'taskprogresscolumn',
            text: "% Task Estimate",
            dataIndex: '__taskEstimate',
            sortable: false
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskCount',
            text: "# Tasks",
            total: maxCount
        },{
            xtype: 'taskprogresscolumn',
            text: "% #Tasks",
            dataIndex: '__taskCount',
            sortable: false 

        }];

    },
    getCalculatedColumns: function(){
        var columns = [{
            xtype: 'taskremainingcolumn',
            text: "Task ToDo (wks)",
            granularity: 'week',
            field: 'todo'
        },{
            xtype: 'taskprogresscolumn',
            text: "Task Estimate (wks)",
            granularity: 'week',
            field: 'taskEstimate'
        },{
            xtype: 'taskprogresscolumn',
            text: "% Task Estimate",
            field: 'taskEstimate',
            percent: true
        },{
            xtype: 'taskprogresscolumn',
            text: "# Tasks",
            field: 'taskCount'
        },{
            xtype: 'taskprogresscolumn',
            text: "% #Tasks",
            field: 'taskCount',
            percent: true

        }];
        return columns;
    },
    getFilterPlugin: function(){
        return {
            ptype: 'rallygridboardinlinefiltercontrol',
            inlineFilterButtonConfig: {
                stateful: true,
                stateId: this.getContext().getScopedStateId('ctd-filters'),
                modelNames: this.getModelNames(),
                inlineFilterPanelConfig: {
                    quickFilterPanelConfig: {
                        defaultFields: [
                            'ArtifactSearch',
                            'Owner',
                            'ModelType'
                        ]
                    }
                }
            }
        };
    },
    getFieldPickerPlugin: function(){
        return {
            ptype: 'rallygridboardfieldpicker',
            headerPosition: 'left',
            modelNames: this.getModelNames(),
            stateful: true,
            stateId: this.getContext().getScopedStateId('ctd-columns-1')
        };
    },
    getGridBox: function(){
        return this.down('#grid_box');
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
