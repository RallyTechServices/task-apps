Ext.define("feature-status-by-task", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
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
                        
    launch: function() {
        this.buildStore();
    },
    buildStore: function(){
        var fetchList = this.getFetchList();
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this.getModelNames(),
            enableHierarchy: false,
            fetch: fetchList
        }).then({
            success: this.buildGrid,
            scope: this
        });
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
    fetchCalculatedData: function(store, node, featureRecords, success){
        this.logger.log('fetchCalculatedData', featureRecords);
        //task remaining (weeks)
        //task estimate weeks by state
        //% task estimate
        //# tasks
        //% # tasks
        Ext.create('CArABU.technicalservices.FeatureTaskStore').load(featureRecords).then({
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
    getColumnCfgs: function(){
        return [{
            dataIndex: 'FormattedID'
        },{
            dataIndex: 'Name',
            flex: 1
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
    getModelNames: function(){
        return [this.getSetting('portfolioItemType')];
    },
    getFetchList: function(){
        return ['ObjectID','FormattedID','UserStories'];
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
