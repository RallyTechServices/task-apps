Ext.define("manager-task-report", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    config: {
        defaultSettings: {
            employeeIDField: 'c_EmployeeId',
            managerEmployeeIDField: 'c_ManagerEmployeeId',
            costCenterField: 'CostCenter',
            costCenter: null,
            isManagerField: 'c_IsManager',
            showHistoricalData: true,
            daysBack: 7
        }
    },

    items: [
        {xtype:'container',itemId:'manager_box',layout:'hbox'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'container',itemId:'detail_box'}
    ],

    integrationHeaders : {
        name : "manager-task-report"
    },
                        
    launch: function() {
        this.logger.log('launch')
        this.userManagerStore = Ext.create('CArABU.technicalservices.UserManagerStore',{
            employeeIDField: this.getEmployeeIDField(),
            managerEmployeeIDField: this.getManagerEmployeeIDField(),
            costCenterField: this.getCostCenterField(),
            costCenter: this.getCostCenter(),
            context: this.getContext(),
            isManagerField: this.getIsManagerField()
        });
        this.userManagerStore.on('ready', this._initializeApp, this);
        this.userManagerStore.on('configurationerror', this._showConfigurationError, this);
    },
    _showConfigurationError: function(msg){
        this.down('#display_box').removeAll();
        this.down('#detail_box').removeAll();
        this.down('#display_box').add({
            xtype: 'container',
            html: msg,
            cls: "configuration-error"
        });
    },
    showHistoricalData: function(){
        return this.getSetting('showHistoricalData') === "true" || this.getSetting('showHistoricalData') === true;
    },
    getHistoricalDate: function(){
        var daysBack = this.getSetting('daysBack') || 7,
            backDate =Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(),'day',-daysBack));
        this.logger.log('getHistoricalDate', backDate);
        return backDate;
    },
    getIsManagerField: function(){
        return this.getSetting('isManagerField');
    },
    getEmployeeIDField: function(){
        return this.getSetting('employeeIDField');
    },
    getManagerEmployeeIDField: function(){
        return this.getSetting('managerEmployeeIDField');
    },
    getCostCenterField: function(){
        return this.getSetting('costCenterField');
    },
    getCostCenter: function(){
        return this.getSetting('costCenter');
    },
    getTaskFetchList: function(){
        return ['ObjectID','FormattedID','Name','ToDo','Estimate','State','Owner','Milestones','WorkProduct',this.getEmployeeIDField(),this.getManagerEmployeeIDField()];
    },
    _getAllManagerFilters: function(){
        return [{
            property: this.getEmployeeIDField(),
            operator: "!=",
            value: ""
        },{
            property: this.getIsManagerField(),
            value: 'Y'
        }];
    },
    _getUserFetch: function(){
        return ['ObjectID','UserName','Email','First Name','Last Name','DisplayName'].concat([this.getEmployeeIDField(), this.getManagerEmployeeIDField(), this.getIsManagerField()]);
    },
    _updateManagers: function(store, records, success){
        this.logger.log('_updateManagers', store, records);
        this.managerRecords = null;
        if (success){
            this.managerRecords = records;
        } else {
            Rally.ui.notify.Notifier.showError({message: 'Error loading managers.'});
        }
    },
    _addIterationFilter: function(){
        this.down('#manager_box').add({
            xtype: 'rallyiterationcombobox',
            fieldLabel: 'Iteration',
            labelAlign: 'right',
            margin: 10
        });
    },
    _addManagerFilters: function(){
        var employeeIDField = this.getEmployeeIDField();

        this.down('#manager_box').add({
            xtype: 'rallyusercombobox',
            fieldLabel: 'Manager',
            labelAlign: 'right',
            allowNoEntry: true,
            value: null,
            margin: 10,
            width: 300,
            remoteFilter: false,
            storeConfig: {
                filters: this._getAllManagerFilters(),
                fetch: this._getUserFetch(),
                limit: 'Infinity',
                autoLoad: true,
                listeners: {
                    scope: this,
                    load: this._updateManagers,
                    single: true
                }
            },
            valueField: employeeIDField,
            displayField: "DisplayName"

        });
    },
    _clearApp: function(){
        this.down('#display_box').removeAll();
        this.down('#detail_box').removeAll();
    },
    _initializeApp: function(){
        this.logger.log('_initializeApp');
        this._clearApp();
        this.down('#manager_box').removeAll();


        this._addIterationFilter();
        this._addManagerFilters();
        this._addMilestonePicker();

        var btn = this.down('#manager_box').add({
            xtype: 'rallybutton',
            text: 'Update',
            margin: 10
        });
        btn.on('click', this._fetchTasks, this);

    },
    _addMilestonePicker: function(){
        this.down('#manager_box').add({
            fieldLabel: 'Milestone(s)',
            labelAlign: 'right',
            width: 300,
            margin: 10,
            xtype: 'rallymilestonepicker'
        });
    },
    getSelectedManagerId: function(){
        return this.down('rallyusercombobox') && this.down('rallyusercombobox').getValue() || null;
    },
    getSelectedIterationFilter: function(){
        var iterationRecord = this.down('rallyiterationcombobox') && this.down('rallyiterationcombobox').getRecord();
        if (iterationRecord){
            return Rally.data.wsapi.Filter.and([{
                property: 'WorkProduct.Iteration.Name',
                value: iterationRecord.get('Name')
            },{
                property: 'WorkProduct.Iteration.StartDate',
                value: iterationRecord.get('StartDate')
            },{
                property: 'WorkProduct.Iteration.EndDate',
                value: iterationRecord.get('EndDate')
            }]);
        }
        return null;
    },
    getSelectedMilestones: function(){
        var milestones = this.down('rallymilestonepicker') && this.down('rallymilestonepicker').getValue();
        this.logger.log('getSelectedMilestones', milestones);
        if (milestones && milestones.length > 0){
            var milestoneFilter = Ext.Array.map(milestones, function(m){
                return {
                    property: "WorkProduct.Milestones",
                    value: m.get('_ref')
                };
            });
            return Rally.data.wsapi.Filter.or(milestoneFilter);
        }
        return null;


    },
    getManagerRecords: function(){
       return this.managerRecords;
    },
    _getWsapiTaskFilters: function(empId, includeEmployeeTasks){
        if (!this.managerTree){
            this.managerTree = this.userManagerStore.buildManagerTree(null,this.getManagerRecords());
        }

        var managerIds = this.managerTree.getAllChildrenEmployeeIds(empId),
            managerIDField = this.getManagerEmployeeIDField(),
            filters = _.map(managerIds, function(id){
                return {
                    property: 'Owner.' + managerIDField,
                    value: id
                };
            });

        this.logger.log('_getWsapiTaskFilters managerIds', managerIds);
        if (includeEmployeeTasks){
            filters.push({
                property: 'Owner.' + this.getEmployeeIDField(),
                value: empId
            });
        }

        filters = Rally.data.wsapi.Filter.or(filters);
        var iterationFilter = this.getSelectedIterationFilter();
        if (iterationFilter){
            this.logger.log('iterationFilter', iterationFilter.toString());
            filters = filters.and(iterationFilter);

        }

        var milestoneFilter = this.getSelectedMilestones();
        if (milestoneFilter){
            filters = filters.and(milestoneFilter);
        }

        this.logger.log('_getWsapiTaskFilters',filters.toString());
        return filters;
    },
    _fetchTasks: function(){
        var managerId = this.getSelectedManagerId();
        this._clearApp();
        this.logger.log('_fetchTasks', this.getSelectedManagerId());

        if (!managerId){
            Rally.ui.notify.Notifier.showWarning({message: "Please select a manager."});
            return;
        }
        this.setLoading("Loading tasks...");

        this.userTree = this.userManagerStore.buildManagerTree(managerId, this.getManagerRecords());
        var filters = this._getWsapiTaskFilters(managerId, false);

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Task',
            filters: filters,
            fetch: this.getTaskFetchList(),
            limit: 'Infinity',
            pageSize: 1000
        }).load({
            callback: this._createSummaryGrid,
            scope: this
        });

    },
    _createSummaryGrid: function(records, operation){
        this.logger.log('_createSummaryGrid', records, operation);

        this.down('#display_box').removeAll();
        this.down('#detail_box').removeAll();

        if (!operation.wasSuccessful()){
            Rally.ui.notify.Notifier.showError({ message: "Error fetching Tasks:  " + operation.error.errors.join(',') });
            this.setLoading(false);
            return;
        }

        this._fetchHistoricalSummaryTasks(records).then({
            success: function(snapshots){
                this.setLoading(false);
                var userItem = this.userTree.getUserItem("320785");
                this.logger.log('userItem 1', userItem.getChildren().length, userItem.kids && userItem.kids.length);

                var summaryStore = this._buildSummaryStore(records, snapshots);

                this.logger.log('_createSummaryGrid', summaryStore);
                this.down('#display_box').add({
                    xtype: 'treepanel',
                    itemId: 'summary-grid',
                    cls: 'rally-grid',
                    padding: 25,
                    selModel: Ext.create("Ext.selection.RowModel",{
                        listeners: {
                            select: this._showDetails,
                            scope: this
                        }
                    }),
                    store: summaryStore,
                    rootVisible: false,
                    columns: this._getSummaryStoreColumnCfgs()
                });
            },
            scope: this
        });
    },
    _fetchHistoricalSummaryTasks: function(currentTaskRecords){
        var deferred = Ext.create('Deft.Deferred'),
            maxObjectIds = 25;

        if (!this.showHistoricalData()){
            deferred.resolve([]);
        }

        var tasks = Ext.Array.map(currentTaskRecords, function(r){
            return r.get('ObjectID');
        });
        this.logger.log('_fetchHistoricalSummaryTasks users', tasks);

        var promises = [];
        for (var i= 0, j=tasks.length; i<j; i+=maxObjectIds){
            var tempArray = tasks.slice(i,i+maxObjectIds);
            promises.push(this._fetchLookbackData({
                fetch: ['ObjectID','_ItemHierarchy','ToDo','Estimate','State','Owner'],
                find: {
                    ObjectID: {$in: tempArray},
                    __At: this.getHistoricalDate()
                },
                limit: 'Infinity'
            }));
        }
        Deft.Promise.all(promises).then({
            success: function(results){
                this.historicalRecords = _.flatten(results);
                deferred.resolve(_.flatten(results));
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({ message: "Error loading historical task summary data:  " + msg });
                deferred.resolve([]);
            },
            scope: this
        });

        return deferred;
    },
    _fetchLookbackData: function(config){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.lookback.SnapshotStore',config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    var msg = operation && operation.error && operation.error.errors.join(',') || "No Response provided - The connection may have been closed because the request was too big or timed out." ;
                    deferred.reject(msg);
                }
            }
        });

        return deferred;
    },
    _showDetails: function(store, record, index){

        this.logger.log('_rowSelected',record, index);

        this.down('#detail_box').removeAll();

        var defaultShowGrid = this.showGridState || true;

        this.down('#detail_box').add({
            xtype: 'container',
            layout:'hbox',
            padding: 0,
            items: [{
                xtype: 'rallybutton',
                iconCls: 'icon-graph',
                cls: 'secondary rly-small',
                pressedCls: 'primary rly-small',
                toggleGroup: 'detailView',
                enableToggle: true,
                pressed: !defaultShowGrid,
                scope: this,
                listeners: {
                    toggle: function(btn, state){
                        this._toggleDetail(btn,state,record);
                    },
                    scope: this
                }
            },{
                xtype: 'rallybutton',
                itemId: 'btn-grid',
                iconCls: 'icon-grid',
                cls: 'secondary rly-small',
                pressedCls: 'primary rly-small',
                toggleGroup: 'detailView',
                enableToggle: true,
                scope: this,
                pressed: defaultShowGrid,
                listeners: {
                    toggle: function(btn, state){
                        this._toggleDetail(btn,state,record);
                    },
                    render: function(btn){
                        this._toggleDetail(btn, defaultShowGrid, record);
                    },
                    scope: this
                }
            }]
        });



    },
    _toggleDetail: function(btn, state, record){
        var showGrid = true;
        if ((btn.iconCls === 'icon-graph' && state === true) || (btn.iconCls === 'icon-grid' && state===false)){
            showGrid = false;
        }
        this.showGridState = showGrid;
        this.logger.log('_toggleDetail', btn.iconCls, state, showGrid, record);

        if (state){
            btn.removeCls('secondary');
            btn.addCls('primary');
        } else {
            btn.removeCls('primary');
            btn.addCls('secondary');
        }

        this.down('rallygridboard')  && this.down('rallygridboard').destroy();
        this.down('rallychart') && this.down('rallychart').destroy();

        if (showGrid){
            this._addDetailGrid(record);
        } else {
            this._addDetailChart(record);
        }

    },
    _addDetailChart: function(user){
        var objectIDFilters = user.get('taskIds') || [];

        if (objectIDFilters.length ===0){
            objectIDFilters.push(0);
        }

        this.down('#detail_box').add({
            xtype: 'rallychart',
            loadMask: false,
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    _TypeHierarchy: 'Task',
                    ObjectID: {$in: objectIDFilters}
                },
                fetch: ['ToDo', 'Estimate','State','_ValidTo','_ValidFrom'],
                hydrate: ['State'],
                removeUnauthorizedSnapshots: true
            },

            calculatorType: 'CArABU.technicalservices.BurndownCalculator',
            calculatorConfig: {},
            chartConfig: {
                chart: {
                    defaultSeriesType: 'area',
                    zoomType: 'xy'
                },
                title: {
                    text: 'Task Burndown'
                },
                xAxis: {
                    categories: [],
                    tickmarkPlacement: 'on',
                    tickInterval: 5,
                    title: {
                        text: 'Date',
                        margin: 10
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: 'Hours'
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
            }
        });

    },
    _addDetailGrid: function(user){

        var employeeId = user.get('employeeId'),
            filters = this._getWsapiTaskFilters(user.get('employeeId'), true);
        this.setLoading("Loading Task Details...");
        this.logger.log('_addDetailGrid filters', filters.toString());
                Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
                    models: ['task'],
                    autoLoad: false,
                    enableHierarchy: true,
                    fetch: this.getTaskFetchList(),
                    filters: filters
                }).then({
                    success: function(store) {
//                        store.model.addField('WorkProductRecord');
                        store.on('load', this._loadWorkProducts, this);

                        this.down('#detail_box').add({
                            xtype: 'rallygridboard',
                            context: this.getContext(),
                            modelNames: ['task'],
                            stateful: false,
                            stateId: "grid-100",
                            itemId: 'detail-grid',
                            toggleState: 'grid',
                            plugins: [{
                                ptype: 'rallygridboardfieldpicker',
                                headerPosition: 'left',
                                modelNames: ['task'],
                                stateful: true,
                                stateId: this.getContext().getScopedStateId('detail-columns-100')
                            },{
                                ptype: 'rallygridboardinlinefiltercontrol',
                                inlineFilterButtonConfig: {
                                    stateful: true,
                                    stateId: this.getContext().getScopedStateId('detail-filters'),
                                    modelNames: ['task'],
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
                            //},{
                            //    ptype: 'rallygridboardactionsmenu',
                            //    menuItems: [
                            //        {
                            //            text: 'Export...',
                            //            handler: function() {
                            //                window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(
                            //                    this.down('rallygridboard').getGridOrBoard());
                            //            },
                            //            scope: this
                            //        }
                            //    ],
                            //    buttonConfig: {
                            //        iconCls: 'icon-export'
                            //    }
                            }],
                            cardBoardConfig: {
                                attribute: 'State'
                            },
                            gridConfig: {
                                store: store,
                                storeConfig: {
                                    filters: filters
                                },
                                rankColumnDataIndex: 'TaskIndex',
                                remoteSort: true,
                                enableRanking: false,
                                columnCfgs: this._getDetailColumnCfgs(),
                                derivedColumns: this._getDefaultColumns()
                            },
                            height: 400
                        });
                    },
                    scope: this
                });
    },
    _loadWorkProducts: function(store, node, records, success){
        this.setLoading("Loading Work Product data...");
        this.logger.log('_loadWorkProducts', records, success);
        var maxObjectIds = 25,
            objectIds = _.map(records, function(r){
            return r.get('WorkProduct') && r.get('WorkProduct').ObjectID || 0
        });
        objectIds = _.uniq(objectIds);
        objectIds = Ext.Array.map(objectIds, function(o){
            return {
                property: 'ObjectID',
                value: o
            }
        });


        var promises = [];
        for (var i= 0, j=objectIds.length; i<j; i+=maxObjectIds){
            var tempArray = objectIds.slice(i,i+maxObjectIds);
            promises.push(this._fetchWsapiArtifactData({
                models: ['UserStory','Defect'],
                //model: 'UserStory',
                compact: false,
                fetch: ['ObjectID','Predecessors','Successors','Milestones','Feature','Parent','Name','FormattedID','PlanEstimate'],
                filters: Rally.data.wsapi.Filter.or(tempArray),
                limit: 'Infinity'
            }));
        }
        Deft.Promise.all(promises).then({
            success: function(results){
                var artifactHash = {},
                    artifacts = _.flatten(results);

                Ext.Array.each(artifacts, function(a){
                    artifactHash[a.get('ObjectID')] = a.getData();
                });
                Ext.Array.each(records, function(r){
                    r.set('WorkProduct', artifactHash[r.get('WorkProduct').ObjectID]);
                });
                this.setLoading(false);

            },
            failure: function(msg){
                this.setLoading(false);
                Rally.ui.notify.Notifier.showError({ message: msg });

            },
            scope: this
        });

    },
    _fetchWsapiArtifactData: function(config){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.artifact.Store', config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject("Error fetching work product data: " + operation.error && operation.error.errors && operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    _getDefaultColumns: function(){
        var columns = [{
            text: '% Completed',
            xtype: 'pctcompletetemplatecolumn'
        },{
            text: 'Work Product Dependencies',
            xtype: 'workproducttemplatecolumn',
            workProductField: 'PredecessorsAndSuccessors'
        },{
            text: 'Work Product Milestones',
            xtype: 'workproducttemplatecolumn',
            workProductField: 'Milestones'
        },{
            text: 'Work Product Feature',
            xtype: 'workproducttemplatecolumn',
            workProductField: 'Feature'
        },{
            text: 'Work Product Initiative',
            xtype: 'workproducttemplatecolumn',
            workProductField: 'Initiative'
        }];
        if (this.showHistoricalData()){
            columns = columns.concat([{
                text: 'Historical State',
                xtype: 'historicalstatetemplate',
                historyField: 'State',
                historicalRecords: this.historicalRecords,
                width: 70,
                align: 'center'
            },{
                text: 'Delta ToDo',
                xtype: 'historicaldeltatemplate',
                deltaField: 'ToDo',
                historicalRecords: this.historicalRecords,
                width: 60,
                align: 'center'}]);
        }
        return columns;

    },
    _getDetailColumnCfgs: function(){
       var columns = [{
            dataIndex: 'FormattedID'
        },{
            dataIndex: 'Name',
            text: 'Name',
            flex: 1
        },{
            dataIndex: 'ToDo',
            text: 'Todo'
        },{
            dataIndex: 'State'
        }];

        return columns.concat(this._getDefaultColumns());
    },
    _getSummaryStoreColumnCfgs: function(){
        var columns = [
            {
                xtype: 'treecolumn',
                text: 'Owner',
                menuDisabled: true,
                dataIndex: 'displayName',
                flex: 1
            },{
                text:'Defined',
                menuDisabled: true,
                dataIndex:'numDefined'
            },{
                text:'In Progress',
                menuDisabled: true,
                dataIndex:'numInProgress'
            },{
                text:'Completed',
                menuDisabled: true,
                dataIndex:'numCompleted'
            },{
                text: 'Total ToDo',
                menuDisabled: true,
                dataIndex: 'ToDo'
            },{
                text: '%Complete (Count)',
                dataIndex: 'pctCompleteCount',
                menuDisabled: true,
                renderer: function(value,meta_data,item) {
                    return Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate',{
                        percentDoneName: 'pctCompleteCount',
                        calculateColorFn: function(){
                            return Rally.util.Colors.lime; //'#8DC63F';
                        }
                    }).apply(item.getData());
                }
            },{
                text: '%Complete (Effort)',
                dataIndex: 'pctCompleteEffort',
                menuDisabled: true,
                renderer: function(value,meta_data,item) {
                    return Ext.create('Rally.ui.renderer.template.progressbar.ProgressBarTemplate',{
                        percentDoneName: 'pctCompleteEffort',
                        calculateColorFn: function(){
                            return Rally.util.Colors.lime; //'#8DC63F';
                        }
                    }).apply(item.getData());
                }

            }
        ];

        if (this.showHistoricalData()){
            columns.push({
                text: 'Delta ToDo',
                dataIndex: 'deltaToDo',
                menuDisabled: true,
                renderer: function(value,meta_data,item) {
                    if (value < 0){
                        return '<div class="icon-down"></div>' + Math.abs(value);
                    }
                    if (value > 0){
                        return '<div class="icon-up"></div>' + value;
                    }
                    return 'No Change';
                }
            });
        }
        return columns;
    },
    percentRenderer: function(val){
        if (val && Number(val)){
            return (Number(val) * 100).toFixed(1) + "%";
        }
        return "";
    },
    _buildSummaryStore: function(records, snapshots){

        //now we need to ask the task records to the store
        this.userTree.processTasks(records,snapshots, this.getSelectedManagerId());

        var root = this.userTree.getUserItem(this.getSelectedManagerId());

        this.logger.log('_buildSummaryStore', root);

        return Ext.create('Ext.data.TreeStore', {
            root: { children: root.children,
                    expanded: false
            },
            model: CArABU.technicalservices.UserSummaryTaskModel
        });
    },
    getSettingsFields: function(){
        return CArABU.technicalservices.ManagerTaskReport.Settings.getFields();
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
