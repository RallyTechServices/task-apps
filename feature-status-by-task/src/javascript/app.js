Ext.define("feature-status-by-task", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'filter_box_1', layout: 'hbox'},
        {xtype:'container',itemId:'filter_box_2', layout: 'hbox'},
        {xtype:'container',itemId:'filter_box_3', layout: 'hbox'},
        {xtype:'container',itemId:'summary_box', layout: 'hbox', padding: 25},
        {xtype:'container',itemId:'grid_box'},
        {xtype:'container',itemId:'detail_box'}
    ],

    integrationHeaders : {
        name : "feature-status-by-task"
    },

    config: {
        defaultSettings: {
            portfolioItemType: "PortfolioItem/Feature",
            employeeIDField: 'c_EmployeeId',
            managerEmployeeIDField: 'c_ManagerEmployeeId'
        }
    },
    groupByFields: ['c_PMTMaster','c_PMTMasterName'],
    groupByModel: "PortfolioItem/Feature",


    labelWidth: [125,125,125],
    controlWidth: [325,325,325],
    margin: '0 5 0 5',

    launch: function() {
        this.setLoading('Initializing Users...');
        CArABU.technicalservices.Utility.fetchManagerTree(this.getManagerIDField(), this.getEmployeeIDField()).then({
            success: function(){
                this.addFeatureFilters();
                this.addStoryFilters();
                this.addTaskFilters();
            },
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false); },this);
    },
    getManagerIDField: function(){
        return this.getSetting('managerEmployeeIDField');
    },
    getEmployeeIDField: function(){
        return this.getSetting('employeeIDField');
    },
    addFeatureFilters: function(){
        var ct = this.down('#filter_box_1');
        ct.removeAll();

        var idx = 0;
        var groupByFields = this.groupByFields;
        ct.add({
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Group by',
            labelAlign: 'right',
            itemId: 'cbGroupBy',
            margin: this.margin,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++],
            allowNoEntry: true,
            noEntryText: "Feature",
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-GroupBy'),
            //disabled: true,
            model: this.getModelName(),
            _isNotHidden: function(field){
                if (Ext.Array.contains(groupByFields, field.name)){
                    return true;
                }
                return false;
            }
        });
        ct.add({
            xtype: 'rallymilestonepicker',
            itemId: 'featureMilestones',
            fieldLabel: 'Feature Milestones',
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-FeatureMilestones'),
            margin: this.margin,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++],
            labelAlign: 'right'
        });

    },
    addStoryFilters: function(){
        this.logger.log('addStoryFilters');

        var ct = this.down('#filter_box_2');
        ct.removeAll();

        var idx = 0;

        ct.add({
            xtype: 'rallymilestonepicker',
            itemId: 'storyMilestones',
            margin: this.margin,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++],
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-storyMilestones'),
            fieldLabel: 'Story Milestones',
            labelAlign: 'right'
        });

        ct.add({
            xtype: 'rallyreleasecombobox',
            margin: this.margin,
            fieldLabel: 'Story Release',
            labelWidth: this.labelWidth[idx] - 23,
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-storyRelease'),
            width: this.controlWidth[idx++] + 23,
            labelAlign: 'right'
        });

        var labelWidth = this.labelWidth[idx];
        ct.add({
            xtype: 'container',
            layout: 'vbox',
            padding: 0,
            items:[{
                xtype: 'rallyusercombobox',
                margin: this.margin,
                fieldLabel: 'Task Owner',
                labelAlign: 'right',
                stateful: true,
                stateId: this.getContext().getScopedStateId('fts-user'),
              //  disabled: true,
                displayField: "DisplayName",
                labelWidth: labelWidth,
                width: this.controlWidth[idx++],
            },{
                xtype: 'checkboxfield',
                margin: '0 5 0 ' + (labelWidth + 10),
                boxLabelAlign: 'after',
                boxLabel:'Include reports',
                value: true,
                itemId: 'ckIncludeReports'
            }]
        });


        ct.add({
            xtype: 'rallybutton',
            margin: '0 5 0 25',
            text: 'Go',
            width: 50,

            listeners: {
                click: this.updateView,
                scope: this
            }
        });
    },
    addTaskFilters: function(){

        var ct = this.down('#filter_box_3');
        ct.removeAll();

        var idx = 0;


    },
    getExtendedModelName: function(){
        return "FeatureStatusModel";
    },
    getSummaryBox: function(){
        return this.down('#summary_box');
    },
    getDetailBox: function(){
        return this.down('#detail_box');
    },

    updateView: function(){
        this.logger.log('updateView');
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        this.getGridBox().removeAll();
        this.getSummaryBox().removeAll();
        this.getDetailBox().removeAll();
        this.setLoading(true);
        //First, we need to get the feature IDs of interest
        this.fetchWsapiRecords({
            model: 'HierarchicalRequirement',
            fetch: ['Feature','ObjectID','Children'],
            filters: this.getStoryFilters(),
            limit: 'Infinity'
        }).then({
            success: this.fetchFeatures,
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){
            this.setLoading(false);
        }, this);
    },
    fetchFeatures: function(records){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid

        this.filterStoryObjectIDs = _.map(records, function(r){ return r.get('ObjectID'); });
        var featureIDs = this.getFeatureIDs(records);

        this.setLoading(true);
        CArABU.technicalservices.ModelBuilder.build(this.getModelName(), this.getExtendedModelName()).then({
            success: function(model){
                this.setLoading("Loading Features...");

                CArABU.technicalservices.Utility.fetchChunkedWsapiRecords({
                    model: model,
                    fetch: this.getFeatureFetchList(),
                    filters: this.getFeatureFilters()
                }, featureIDs).then({
                    success: this.fetchTasks,
                    failure: this.showErrorNotification,
                    scope: this
                });
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
            this.down('#summary_box').add({
                xtype: 'container',
                html: '<div class="no-data-container"><div class="secondary-message">No Features were found for the currently selected filters and project.</div></div>'
            });
            return;
        }

        this.setLoading("Loading Tasks...");
        Ext.create('CArABU.technicalservices.FeatureTaskStore').loadTasks(records,this.getTaskOwners(),this.filterStoryObjectIDs).then({
            success: this.refineRecords,
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false);},this);
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
            taskOwners = this.getTaskOwners(),
            refinedRecords = [];

        Ext.Array.each(records, function(r){
            var resultsHash = r.calculateRollups(taskOwners, this.filterStoryObjectIDs);
            maxToDo = Math.max(maxToDo, Ext.Array.sum(resultsHash.todo));
            maxEstimate = Math.max(maxEstimate, Ext.Array.sum(resultsHash.estimate));
            maxCount = Math.max(maxCount, Ext.Array.sum(resultsHash.count));

            for (var i = 0; i < 3; i++){
                totalToDo[i] += resultsHash.todo[i];
                totalCount[i] += resultsHash.count[i];
                totalEstimate[i] += resultsHash.estimate[i];
            }
            if (r.hasTasks()){
                refinedRecords.push(r);  //only show features with tasks that meet criteria
            }
        }, this);
        this.logger.log('refineRecords', totalToDo, totalEstimate, totalCount);

        this.buildSummaryBar(refinedRecords.length, totalToDo, totalEstimate, totalCount);
        this.buildTreeGrid(refinedRecords, maxToDo, maxEstimate, maxCount);
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
                width: 100,
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
    getGroupTpl: function(){
        var tpl =  '<div>{name} ({rows.length})</div>';
        return tpl;

    },
    buildTreeGrid: function(records, maxToDo, maxEstimate, maxCount){
        //updateView => fetchStories => fetchFeatures => fetchTasks => refineRecords => buildTreeGrid
        this.logger.log('buildGrid', records);

        var groupBy = this.getGroupByField();

        this.logger.log('buildGrid records', records, groupBy);
        this.getGridBox().removeAll();
        this.down('#detail_box').removeAll();

        if (groupBy){
            var summaryObj = this.buildTreeStore(groupBy, records);
            var summaryStore = summaryObj.store;

           // We need a tree grid
            this.getGridBox().add({
                xtype: 'treepanel',
                cls: 'rally-grid',
                padding: 25,
                selModel: Ext.create("Ext.selection.RowModel",{
                    listeners: {
                        select: this._showStories,
                        scope: this
                    }
                }),
                store: summaryStore,
                rootVisible: false,
                columns: this.getColumnCfgs(groupBy, summaryObj.maxToDo, summaryObj.maxEstimate, summaryObj.maxCount),
                width: '100%',
                flex: 1
            });



        } else {
          //  A regular grid is fine.

            this.getGridBox().add({
                xtype: 'rallygrid',
                context: this.getContext(),
                modelNames: this.getExtendedModelName(),
                store: Ext.create('Rally.data.custom.Store',{
                    model: this.getExtendedModelName(),
                    data: records,
                    pageSize: records.length
                }),
                selModel: Ext.create("Ext.selection.RowModel",{
                    listeners: {
                        select: this._showStories,
                        scope: this
                    }
                }),
                listeners: {
                    columnresize: this.saveColumnWidths,
                    render: this.saveColumnWidths,
                    scope: this
                },
                enableRanking: false,
                enableBulkEdit: false,
                showRowActionsColumn: false,
                columnCfgs: this.getColumnCfgs(groupBy, maxToDo, maxEstimate, maxCount),
                height: this.getHeight(),
                width: '100%',
                flex: 1,
                showPagingToolbar: false
            });
       }


    },
    buildTreeStore: function(groupBy, featureRecords){
        this.logger.log('buildTreeStore', groupBy, featureRecords,featureRecords[0].getFields());

        var treeModel = Ext.define("GroupedFeatureModel", {
            extend: "Ext.data.TreeModel",
            fields: featureRecords[0].getFields()
        });

        var hash = {};
        Ext.Array.each(featureRecords, function(f){
            var groupValue = f.get(groupBy) || "None";
            if (!hash[groupValue]) {
                hash[groupValue] = [];
            }
            var childData = f.getData();
            childData.children = [];
            childData.leaf = true;
            hash[groupValue].push(Ext.create(treeModel, childData));
        });

        this.logger.log('buildTreeStore', hash);
        var data = [];
        var maxToDo = 0,
            maxEstimate = 0,
            maxCount = 0;
        Ext.Object.each(hash, function(key, children){
            var taskToDo = [0,0,0],
                taskEstimate = [0,0,0],
                taskCount = [0,0,0];

            Ext.Array.each(children, function(c){
                for (var i=0; i<3; i++){
                    taskToDo[i] += c.get('__taskToDo')[i];
                    taskEstimate[i] += c.get('__taskEstimate')[i];
                    taskCount[i] += c.get('__taskCount')[i];
                }
            });
            maxToDo = Math.max(maxToDo, Ext.Array.sum(taskToDo));
            maxEstimate = Math.max(maxEstimate, Ext.Array.sum(taskEstimate));
            maxCount = Math.max(maxCount, Ext.Array.sum(taskCount));

            var fields = {children: children, leaf: false};
            fields[groupBy] = key;
            fields.__taskCount = taskCount;
            fields.__taskEstimate = taskEstimate;
            fields.__taskToDo = taskToDo;
            data.push(Ext.create(treeModel, fields));
        });

        return {
            store: Ext.create('Ext.data.TreeStore', {
            root: {
                children: data,
                expanded: false
            },
            model: treeModel
        }),
            maxToDo: maxToDo,
            maxCount: maxCount,
            maxEstimate: maxEstimate
        };
    },
    getStoryFetchList: function(){
        return ['ObjectID','FormattedID','Name','Feature','Milestones','Owner',"DisplayName","c_QEOwner"];

    },
    getStoryColumnCfgs: function(){
        var columns = [{
            xtype: 'templatecolumn',
            dataIndex: 'FormattedID',
            tpl: 'Rally.ui.renderer.template.FormattedIDTemplate'
            //renderer: function(v,m,r){
            //    var tpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');
            //    tpl.apply(r.getData());
            //    return tpl;
            //}
        },{
            dataIndex: 'Name',
            text: 'Name',
            flex: 1
        },{
            dataIndex: 'ScheduleState'
        }];

        return columns.concat(this.getAdditionalStoryColumnCfgs());
    },
    getAdditionalStoryColumnCfgs: function(){
        return [{
            dataIndex: "Feature",
            text: "Feature Owner",
            renderer: function(v,m,r){
                if (v){
                    return v.Owner.DisplayName;
                }
                return '';
            }
        },{
            dataIndex: "Feature",
            text: "Feature QE Owner",
            renderer: function(v,m,r){
                if (v){
                    return v.c_QEOwner;
                }
                return '';
            }
        }];
    },
    _showStories: function(store, record, index){
        this.logger.log('_showStories',record, index);

        this.down('#detail_box').removeAll();

        var groupBy = this.getGroupByField(),
            featureFilterField = groupBy || "ObjectID",
            modelNames = ['hierarchicalrequirement'];


       var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: "Feature." + featureFilterField,
                value: record.get(featureFilterField)
            });
        filters = filters.and(this.getStoryFilters());

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: modelNames,
            autoLoad: false,
            enableHierarchy: true,
            fetch: this.getStoryFetchList(),
            remoteSort: true,
            filters: filters
        }).then({
            success: function(store) {

                this.down('#detail_box').add({
                    xtype: 'rallygridboard',
                    context: this.getContext(),
                    modelNames: modelNames,
                    stateful: false,
                    stateId: "grid-100",
                    itemId: 'detail-grid',
                    toggleState: 'grid',
                    plugins: [{
                        ptype: 'rallygridboardfieldpicker',
                        headerPosition: 'left',
                        modelNames: modelNames,
                        stateful: true,
                        stateId: this.getContext().getScopedStateId('detail-columns-0716')
                    },{
                        ptype: 'rallygridboardinlinefiltercontrol',
                        inlineFilterButtonConfig: {
                            stateful: true,
                            stateId: this.getContext().getScopedStateId('detail-filters'),
                            modelNames: modelNames,
                            inlineFilterPanelConfig: {
                                quickFilterPanelConfig: {
                                    defaultFields: [
                                        'ArtifactSearch',
                                        'Owner',
                                        'State'
                                    ]
                                }
                            }
                        }
                    },{
                        ptype: 'rallygridboardactionsmenu',
                        menuItems: [
                            {
                                text: 'Export...',
                                handler: function() {
                                    window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(
                                        this.down('rallygridboard').getGridOrBoard());
                                },
                                scope: this
                            }
                        ],
                        buttonConfig: {
                            iconCls: 'icon-export'
                        }
                    }],
                    gridConfig: {
                        store: store,
                        storeConfig: {
                            filters: filters
                        },
                        enableRanking: false,
                        columnCfgs: this.getStoryColumnCfgs(),
                        derivedColumns: this.getAdditionalStoryColumnCfgs()
                    },
                    height: 400
                });
            },
            scope: this
        });


    },
    showErrorNotification: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
        this.setLoading(false);
    },
    getGroupByField: function(){
        return this.down('#cbGroupBy') && this.down('#cbGroupBy').getValue() || null;
    },
    getGroupByDisplayName: function(){
        var cb = this.down('#cbGroupBy');
        return cb && cb.getRecord() &&
            cb.getRecord() && cb.getRecord().get(cb.displayField) || null;
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
    getFeatureFilters: function(){
        var milestoneFilter = null;
        var milestones = this.down('#featureMilestones') && this.down('#featureMilestones').getValue();
            if (milestones && milestones.length > 0){
            milestoneFilter = Ext.Array.map(milestones, function(m){
                return {
                    property: "Milestones",
                    value: m.get('_ref')
                };
            });
            milestoneFilter =  Rally.data.wsapi.Filter.or(milestoneFilter);
            this.logger.log('getFeatureFilters milestoneFilter', milestoneFilter.toString());
        }
        return milestoneFilter;
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
            milestones = this.down('#storyMilestones') && this.down('#storyMilestones').getValue();

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
        var includeReports = this.down('#ckIncludeReports').getValue();

        this.logger.log('getTaskFilters', taskOwner,includeReports);
        if (taskOwner){
            var users = [];
            users.push(taskOwner.get('ObjectID'));
            if (includeReports){
                this.logger.log('getTaskFilters including reports', taskOwner.get('ObjectID'));
                var reports = CArABU.technicalservices.Utility.getReports(taskOwner);
                users = users.concat(reports);
            }
            return users;
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
    showError: function(msg){
        this.logger.log('showError', msg);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getColumnCfgs: function(groupBy, maxToDo, maxEstimate, maxCount){

        var columns = [];

        var groupBy = this.getGroupByField();
        var totalWidth = 450,
            treeColumnWidth = 0;

        if (groupBy){
            treeColumnWidth = 25;
            columns.push({
                xtype: 'treecolumn',
               // text: this.getGroupByDisplayName(),
                dataIndex: groupBy,
                tdCls: 'absolute-cell-inner',
                width: treeColumnWidth,
                renderer: function(v,m,r){
                    //We don't want to show this field if this is a leaf node.
                    if (!r.get('FormattedID')){
                        return v;
                    }
                    return '';
                }
            });

        }
        totalWidth = totalWidth-treeColumnWidth;
        return columns.concat([{
            dataIndex: 'FormattedID',
            text: 'ID',
            width: 100,
            renderer: function(v,m,r){
                var tpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');

                return  tpl.apply(r.getData());
            }
        }, {
            text: 'Name',
            dataIndex: 'Name',
            width: totalWidth - 100
        },{
            xtype: 'tasktodocolumn',
            dataIndex: '__taskToDo',
            total: maxToDo,
            text: "Task ToDo (wks)",
            granularityDivider: 24*7,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskEstimate',
            total: maxEstimate,
            text: "Task Estimate (wks)",
            granularityDivider: 24*7,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            text: "% Task Estimate",
            dataIndex: '__taskEstimate',
            flex: 2,
            sortable: false,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskCount',
            text: "# Tasks",
            total: maxCount,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            text: "% #Tasks",
            dataIndex: '__taskCount',
            sortable: false,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }

        }]);

    },
    saveColumnWidths: function(ct, column, width){
        this.logger.log('saveColumnWidths',ct,column,width);
        if (column){
            if (!this.columns){
                this.columns = {};
            }
            this.columns[column.dataIndex] = column;
        }

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
