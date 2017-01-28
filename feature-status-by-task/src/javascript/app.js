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
        {xtype:'container',itemId:'filter_box_4', layout: 'hbox'},
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
                this.addMilestonesBox();
                this.addUserBox();
                this.addGroupByBox();
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
    addGroupByBox: function(){
        var ct = this.down('#filter_box_3');
        ct.removeAll();

        var idx = 0;
        var groupByFields = this.groupByFields;

       var filterBox = this.down('#filter_box_3').add({
            xtype: 'standalonefilter',
            context: this.getContext(),
            flex: 1
        });

        filterBox.getLeft().add({
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
            model: this.getModelName(),
            _isNotHidden: function(field){
                if (Ext.Array.contains(groupByFields, field.name)){
                    return true;
                }
                return false;
            }
        });

        filterBox.getRight().add({
            xtype: 'rallybutton',
            margin: '0 5 0 25',
            text: 'Update',
            width: 100,
            listeners: {
                click: this.updateView,
                scope: this
            }
        });


    },
    addMilestonesBox: function(){
        this.logger.log('addStoryFilters');

        var ct = this.down('#filter_box_1');
        ct.removeAll();

        var idx = 0;
        ct.add({
            xtype: 'rallymilestonepicker',
            itemId: 'featureMilestones',
            fieldLabel: 'Feature Milestones',
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-FeatureMilestones'),
            stateEvents: ['select','deselect'],
            margin: this.margin,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++],
            labelAlign: 'right',
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
        ct.add({
            xtype: 'rallymilestonepicker',
            itemId: 'storyMilestones',
            margin: this.margin,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++],
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-storyMilestones'),
            stateEvents: ['select','deselect'],
            fieldLabel: 'Story Milestones',
            labelAlign: 'right',
            storeConfig: {
                autoLoad: true
            },

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

        ct.add({
            xtype: 'rallyreleasecombobox',
            margin: this.margin,
            fieldLabel: 'Story Release',
            labelWidth: this.labelWidth[idx],
            allowNoEntry: true,
            allowBlank: false,
            multiSelect: true,
            stateful: true,
            valueField: 'Name',
            displayField: 'Name',
            stateId: this.getContext().getScopedStateId('fts-storyRelease'),
            width: this.controlWidth[idx++],
            labelAlign: 'right',
            cls: 'rally-checkbox-combobox',
            autoSelect: false,
            editable: false,
            defaultSelectionPosition: null,
            allowClear: false,
            showArrows: false,
            listConfig: {
                cls: 'rally-checkbox-boundlist',
                itemTpl: Ext.create('Ext.XTemplate',
                    '<div class="rally-checkbox-image"></div>',
                    '<div class="rally-checkbox-text timebox-name">',
                    '{[this.getDisplay(values)]}</div>',
                    {
                        getDisplay: function(values){
                            return values.Name || "Unscheduled";
                        }
                    }
                )
            }

        });
    },
    addUserBox: function(){

        this.logger.log('addUserBox');

        var ct = this.down('#filter_box_2');
        ct.removeAll();

        var idx = 0;
        ct.add({
            xtype: 'rallyusercombobox',
            margin: this.margin,
            itemId: 'usrTaskOwner',
            fieldLabel: 'Task Owner',
            labelAlign: 'right',
            allowNoEntry: true,
            stateful: true,
            value: null,
            stateId: 'fts-task-owner',
            displayField: "DisplayName",
            valueField: "ObjectID",
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++]

        });

        ct.add({
            xtype: 'rallyusercombobox',
            margin: this.margin,
            fieldLabel: 'Manager',
            itemId: 'usrManager',
            labelAlign: 'right',
            stateful: true,
            allowNoEntry: true,
            stateId: this.getContext().getScopedStateId('fts-manager'),
            displayField: "DisplayName",
            valueField: "ObjectID",
            value: null,
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++]
        });

        ct.add({
            xtype: 'rallyusercombobox',
            margin: this.margin,
            fieldLabel: 'Feature Owner',
            itemId: 'usrFeatureOwner',
            allowNoEntry: true,
            labelAlign: 'right',
            stateful: true,
            stateId: this.getContext().getScopedStateId('fts-feature-owner'),
            displayField: "DisplayName",
            valueField: "ObjectID",
            labelWidth: this.labelWidth[idx],
            width: this.controlWidth[idx++]
        });

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
            limit: 'Infinity',
            pageSize: 2000
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
        this.logger.log('fetchFeatures filterStoryObjectIDs', this.filterStoryObjectIDs);
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
        this.logger.log('refineRecords taskOwners', taskOwners);
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

        if (!refinedRecords || refinedRecords.length === 0){
            this.setLoading(false);
            this.down('#summary_box').add({
                xtype: 'container',
                html: '<div class="no-data-container"><div class="secondary-message">No Features were found for the currently selected filters and project.</div></div>'
            });
            return;
        }
        this.buildSummaryBar(refinedRecords.length, totalToDo, totalEstimate, totalCount);
        this.buildTreeGrid(refinedRecords, maxToDo, maxEstimate, maxCount);
    },
    buildSummaryBar: function(totalFeatures, totalToDo, totalEstimate, totalCount) {
        this.logger.log('buildSummaryBar', totalFeatures, totalToDo, totalEstimate, totalCount);

        var colorData = [{
            color: '#FBB990',
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
                granularityDivider: 40,
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                dataIndex: 'totalTaskEstimate',
                total: maxEstimate,
                text: "Total Task Estimate (wks)",
                granularityDivider: 40,
                flex: 2,
                align: 'center'
            },{
                xtype: 'taskprogresscolumn',
                text: "Total Task Estimate %",
                dataIndex: 'totalTaskEstimate',
                calcPercent: true,
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
                calcPercent: true,
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

        if (records.length === 0){

        }


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
                flex: 1,
                viewConfig: {
                    stripeRows: false,
                    getRowClass: function(record) {
                        if (!record.get('FormattedID')){
                            return 'grouped-row';
                        }
                        return '';
                    }
                }
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
                    //pageSize: records.length
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
                //showPagingToolbar: false
            });
       }


    },
    buildTreeStore: function(groupBy, featureRecords){
        this.logger.log('buildTreeStore', groupBy, featureRecords);


        var treeModel = Ext.define("GroupedFeatureModel", {
            extend: "Ext.data.TreeModel",
            fields: featureRecords[0].getFields()
        });

        var hash = {},
            displayGroup = {};

        var otherGroupBy = this.groupByFields[0];
        if (groupBy === this.groupByFields[0]){
            otherGroupBy = this.groupByFields[1];
        }

        Ext.Array.each(featureRecords, function(f){
            var groupValue = f.get(groupBy) || "None";
            if (!hash[groupValue]) {
                hash[groupValue] = [];
            }
            var childData = f.getData();
            childData.children = [];
            childData.leaf = true;
            hash[groupValue].push(Ext.create(treeModel, childData));

            if (!displayGroup[groupValue]){
                displayGroup[groupValue] = [];
            }
            if (!Ext.Array.contains(displayGroup[groupValue],childData[otherGroupBy])){
                displayGroup[groupValue].push(childData[otherGroupBy]);
            }

        });

        this.logger.log('buildTreeStore', hash, displayGroup);
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
            fields[otherGroupBy] = displayGroup[key];
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
        return ['ObjectID','FormattedID','Name','Feature','Milestones','Owner',"DisplayName","c_PMTQEOwner","WorkProduct"];

    },
    getStoryColumnCfgs: function(){
        var columns = [{
            xtype: 'templatecolumn',
            dataIndex: 'FormattedID',
            tpl: 'Rally.ui.renderer.template.FormattedIDTemplate'
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
            xtype: 'templatecolumn',
            tpl: '<tpl>{name}</tpl>',
            text: "Feature Owner",
            defaultRenderer: function(value, meta, record) {
                var feature = record.get('Feature')
                return this.tpl.apply({name: feature && feature.Owner && feature.Owner.DisplayName || "" });
            }
        },{
            xtype: 'templatecolumn',
            text: "Feature QE Owner",
            tpl: '<tpl>{c_PMTQEOwner}</tpl>',
            defaultRenderer: function(value, meta, record) {
                var feature = record.get('Feature')
                return this.tpl.apply(feature);
            }
        }];
    },
    _showStories: function(store, record, index){
        this.logger.log('_showStories',record, index);

        this.down('#detail_box').removeAll();

        var groupBy = this.getGroupByField(),
            featureFilterField =  "ObjectID",
            modelNames = ['hierarchicalrequirement'],
            taskOwners = this.getTaskOwners();

        if (!record.get('ObjectID')){
            featureFilterField = groupBy;
        }

       var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: "Feature." + featureFilterField,
                value: record.get(featureFilterField)
            });

        var storyFilters = this.getStoryFilters();
        if (storyFilters && storyFilters.length > 0){
            filters = filters.and(storyFilters);
        }

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
                    stateId: "grid-detail",
                    itemId: 'detail-grid',
                    toggleState: 'grid',
                    plugins: [{
                        ptype: 'rallygridboardfieldpicker',
                        headerPosition: 'left',
                        modelNames: modelNames,
                        stateful: true,
                        stateId: this.getContext().getScopedStateId('detail-columns')
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
                        derivedColumns: this.getAdditionalStoryColumnCfgs(),
                        viewConfig: {
                            xtype: 'rallytreeview',
                            enableTextSelection: false,
                            animate: false,
                            loadMask: false,
                            forceFit: true,
                            plugins: ['rallytreeviewdragdrop', 'rallyviewvisibilitylistener'],
                            getRowClass: function(record) {
                                console.log('getRowClass',record, taskOwners);
                                if (record.get('_type') === 'task') {

                                    var ownerID = record.get('Owner') && record.get('Owner').ObjectID || 0;
                                    if (!taskOwners || taskOwners.length === 0 || Ext.Array.contains(taskOwners, ownerID)){
                                        return 'included-task';
                                    }
                                }
                                return '';
                            }
                        }
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
    getOtherGroupByField: function(){

        if (this.getGroupByField() === this.groupByFields[0]){
            return this.groupByFields[1];
        }
        return this.groupByFields[0];
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

        var featureFilters = this.down('standalonefilter').getCustomFilter(),
            filters = [];

        if (featureFilters){
            filters.push(featureFilters);
            this.logger.log('fetFeatureFilters', featureFilters.toString());
        }

        var milestones = this.down('#featureMilestones') && this.down('#featureMilestones').getValue();
        if (milestones && milestones.length > 0){
            var milestoneFilter = Ext.Array.map(milestones, function(m){
                return {
                    property: "Milestones",
                    value: m.get('_ref')
                };
            });
            milestoneFilter =  Rally.data.wsapi.Filter.or(milestoneFilter);
            filters.push(milestoneFilter);
            this.logger.log('getFeatureFilters milestoneFilter', milestoneFilter.toString());
        }

        var featureOwner = this.down('#usrFeatureOwner') && this.down('#usrFeatureOwner').getValue(),
            featureOwnerFilter = null;
        this.logger.log('getFeatureFilters',featureOwner);

        if (featureOwner){
            featureOwnerFilter = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Owner.ObjectID',
                value: featureOwner
            });
            this.logger.log('getFeatureFilters featureOwnerFilter', featureOwnerFilter.toString());

            filters.push(featureOwnerFilter);
        }

        if (filters.length > 0){
            filters = Rally.data.wsapi.Filter.and(filters);
            this.logger.log('getFeatureFilters',filters.toString());
            return filters;
        }
        return [];
    },
    getFeatureFetchList: function(){
        var fetch =  ['ObjectID','FormattedID','Name','Owner','c_PMTQEOwner'];
        if (this.getGroupByField()){
            fetch = fetch.concat(this.groupByFields);
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

    getStoryDetailFilters: function(){
        var filters = this.getStoryFilters();

        var taskOwners = this.getTaskOwners();
        if (taskOwners){

            var taskOwnerFilters = _.map(taskOwners, function(t){
                return {
                    property: 'Tasks.Owner.ObjectID',
                    value: t
                };
            });
            taskOwnerFilters = Rally.data.wsapi.Filter.or(taskOwnerFilters);
            if (filters){
                filters = taskOwnerFilters.and(filters);
            } else {
                filters = taskOwnerFilters;
            }

        }
        this.logger.log('getStoryDetailFilters', filters.toString());
        return filters;

        //Now we need to filter on task owner and manager owner
    },
    getStoryFilters: function(){
        var timeboxCombo = this.down('rallyreleasecombobox'),
            timeboxFilter = timeboxCombo && timeboxCombo.getValue() || null,
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

        if (Ext.isArray(timeboxFilter) && timeboxFilter.length > 0){
            var timeboxFilters = [];
            Ext.Array.each(timeboxFilter, function(t){
                if (!t){
                    timeboxFilters.push({
                        property: 'Release',
                        value: ""
                    });
                } else {
                    timeboxFilters.push({
                        property: 'Release.Name',
                        value: t
                    });
                }
            });
            if (timeboxFilters.length > 1){
                timeboxFilter = Rally.data.wsapi.Filter.or(timeboxFilters);
            } else {
                timeboxFilter = Ext.create('Rally.data.wsapi.Filter',timeboxFilters[0]);
            }
            if (milestoneFilter){
                return timeboxFilter.and(milestoneFilter);
            }
            return timeboxFilter;
        }

       return milestoneFilter || [];
    },
    getTaskOwners: function(){
        var taskOwner = this.down('#usrTaskOwner') && this.down('#usrTaskOwner').getRecord();
        var manager = this.down('#usrManager') && this.down('#usrManager').getRecord();

        this.logger.log('getTaskFilters', taskOwner,manager);
        var users = [];
        if (taskOwner && taskOwner.get('ObjectID')){
            users.push(taskOwner.get('ObjectID'));
        }
        if (manager){
            this.logger.log('getTaskFilters including manager reports', manager);
            var reports = CArABU.technicalservices.Utility.getReports(manager);
            users = users.concat(reports);
        }
        if (users.length > 0){
            return users;
        }
        return null;
    },

    showError: function(msg){
        this.logger.log('showError', msg);
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    getColumnCfgs: function(groupBy, maxToDo, maxEstimate, maxCount){

        var columns = [];

        var groupBy = this.getGroupByField(),
            otherGroupBy = this.getOtherGroupByField();
        var totalWidth = 450,
            treeColumnWidth = 0,
            idAndNameSortable = true ;

        if (groupBy){
            treeColumnWidth = 75;
            idAndNameSortable = false;
            columns.push({
                xtype: 'treecolumn',
                text: this.getGroupByDisplayName(),
                dataIndex: groupBy,
                tdCls: 'absolute-cell-inner',
                menuDisabled: true,
                width: treeColumnWidth,
                renderer: function(v,m,r){
                    //We don't want to show this field if this is a leaf node.
                    if (!r.get('FormattedID')) {
                        var val = r.get(groupBy),
                            otherVals = r.get(otherGroupBy) || [];

                        var x = val;
                        if (!Ext.isArray(otherVals)){
                            x = Ext.String.format("{0} - {1}", val, otherVals);
                        } else if(otherVals.length === 1) {
                           x = Ext.String.format("{0} - {1}", val, otherVals[0]);
                        } else {
                           x = Ext.String.format("{0} - {1}", val, otherVals.join(','));
                        }

                        return x;
                    }
                    return '';
                }
            });

        }
        totalWidth = totalWidth-treeColumnWidth;
        var formattedIDColText = "ID";
        if (groupBy){
            formattedIDColText = '';
        }
        return columns.concat([{
            dataIndex: 'FormattedID',
            text: formattedIDColText,
            menuDisabled: true,
            width: 100,
            sortable: idAndNameSortable,
            renderer: function(v,m,r){
                var tpl = Ext.create('Rally.ui.renderer.template.FormattedIDTemplate');

                return  tpl.apply(r.getData());
            }
        }, {
            text: 'Name',
            dataIndex: 'Name',
            menuDisabled: true,
            width: totalWidth - 100,
            sortable: idAndNameSortable,
            renderer: function (val, metadata, record) {
                metadata.style = 'cursor: pointer;';
                return val;
            }
        },{
            dataIndex: 'Owner',
            text: 'Owner',
            renderer: function(v,m,r){
                return v && v._refObjectName;
            }
        },{
            dataIndex: 'c_PMTQEOwner',
            text: 'QE Owner'
        },{
            xtype: 'tasktodocolumn',
            menuDisabled: true,
            dataIndex: '__taskToDo',
            total: maxToDo,
            text: "Task ToDo (wks)",
            granularityDivider: 40,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskEstimate',
            total: maxEstimate,
            menuDisabled: true,
            text: "Task Estimate (wks)",
            granularityDivider: 40,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            text: "% Task Estimate",
            menuDisabled: true,
            dataIndex: '__taskEstimatePct',
            flex: 2,
            sortable: true,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            dataIndex: '__taskCount',
            text: "# Tasks",
            menuDisabled: true,
            total: maxCount,
            flex: 2,
            listeners: {
                columnresize: this.saveColumnWidths,
                scope: this

            }
        },{
            xtype: 'taskprogresscolumn',
            text: "% #Tasks",
            dataIndex: '__taskCountPct',
            sortable: true,
            menuDisabled: true,
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
    //getCalculatedColumns: function(){
    //    var columns = [{
    //        xtype: 'taskremainingcolumn',
    //        text: "Task ToDo (wks)",
    //        granularity: 'week',
    //        field: 'todo'
    //    },{
    //        xtype: 'taskprogresscolumn',
    //        text: "Task Estimate (wks)",
    //        granularity: 'week',
    //        field: 'taskEstimate'
    //    },{
    //        xtype: 'taskprogresscolumn',
    //        text: "% Task Estimate",
    //        field: 'taskEstimate',
    //        percent: true
    //    },{
    //        xtype: 'taskprogresscolumn',
    //        text: "# Tasks",
    //        field: 'taskCount'
    //    },{
    //        xtype: 'taskprogresscolumn',
    //        text: "% #Tasks",
    //        field: 'taskCount',
    //        percent: true
    //
    //    }];
    //    return columns;
    //},
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
