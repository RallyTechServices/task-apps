Ext.define("manager-task-report", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    config: {
        defaultSettings: {
            employeeIDField: 'c_EmployeeID',
            managerEmployeeIDField: 'c_ManagerID',
            costCenterField: 'CostCenter',
            costCenter: null,
            isManagerField: 'c_IsManager'
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
        this.removeAll();
        this.add({
            xtype: 'container',
            html: msg,
            cls: "configuration-error"
        });
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
        return ['FormattedID','Name','ToDo','Estimate','State','Owner','Milestones',this.getEmployeeIDField(),this.getManagerEmployeeIDField()];
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
    _getDirectReportFilters: function(managerID){
        this.logger.log('_getDirectReportFilters', managerID);
        return [{
            property: this.getManagerEmployeeIDField(),
            value: managerID
        }];
    },
    _getUserFetch: function(){
        return ['UserName','Email','First Name','Last Name','DisplayName'].concat([this.getEmployeeIDField(), this.getManagerEmployeeIDField(), this.getIsManagerField()]);
    },
    _updateManagers: function(store, records, success){
        this.logger.log('_updateManagers', store, records);
        if (success){
            this.userManagerStore._addManagerRecords(records);
        } else {
            Rally.ui.notify.Notifier.showError({message: 'Error loading managers.'});
        }
    },
    _addManagerFilters: function(){
        var employeeIDField = this.getEmployeeIDField();

        this.down('#manager_box').add({
            xtype: 'rallyusercombobox',
            fieldLabel: 'Manager',
            labelAlign: 'right',
            allowNoEntry: true,
            value: null,
            width: 300,
            storeConfig: {
                filters: this._getAllManagerFilters(),
                fetch: this._getUserFetch(),
                limit: 'Infinity',
                listeners: {
                    scope: this,
                    load: this._updateManagers
                }
            },
            valueField: employeeIDField,
            displayField: "DisplayName",
            listeners: {
                scope: this,
                select: this._fetchTasks
            }
        });
    },

    _initializeApp: function(){
        this.logger.log('_initializeApp');

        this._addManagerFilters();
    },
    _fetchTasks: function(cb){
        this.logger.log('_fetchTasks', cb.getValue());
        this.selectedManagerId = cb.getValue();
        //First we need to get all the possible managers
        var managerIds = this.userManagerStore.getReportingManagerIds(cb.getValue()),
            managerIDField = this.getManagerEmployeeIDField(),
            filters = _.map(managerIds, function(id){
                return {
                    property: 'Owner.' + managerIDField,
                    value: id
                };
            });

        filters = Rally.data.wsapi.Filter.or(filters);
        this.logger.log('_fetchTasks filters',filters.toString());

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

        this.down('summary-grid') && this.down('summary-grid').destroy();

        if (!operation.wasSuccessful()){
            Rally.ui.notify.Notifier.showError({ message: "Error fetching Tasks:  " + operation.error.errors.join(',') });
            return;
        }

        var summaryStore = this._buildSummaryStore(records);
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
    _showDetails: function(store, record, index){
        this.logger.log('_rowSelected',record, index);

        this.down('#detail_box').removeAll();

        var defaultShowGrid = true;

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
        this.logger.log('_toggleDetail', btn.iconCls, state, showGrid);

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
            this._addDetailGrid(record.get('tasks'));
        } else {
            this._addDetailChart(record.get('tasks'));
        }

    },
    _addDetailChart: function(tasks){
        var objectIDFilters = _.map(tasks, function(t){ return t.get('ObjectID'); });

        this.down('#detail_box').add({
            xtype: 'rallychart',
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
    _addDetailGrid: function(tasks){

        var filters = _.map(tasks, function(t){ return {
            property: 'ObjectID',
            value: t.get('ObjectID')
            }
        });
        filters = Rally.data.wsapi.Filter.or(filters);
        this.logger.log('filters', filters.toString());

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: ['task'],
            autoLoad: false,
            enableHierarchy: true,
            filters: filters
        }).then({
            success: function(store) {
               this.down('#detail_box').add({
                        xtype: 'rallygridboard',
                        context: this.getContext(),
                        modelNames: ['task'],
                        stateful: false,
                        stateId: "grid-2",
                        itemId: 'detail-grid',
                        toggleState: 'grid',
                        plugins: [{
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'left',
                            modelNames: ['task'],
                            stateful: true,
                            stateId: this.getContext().getScopedStateId('detail-columns-2')
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
                        cardBoardConfig: {
                            attribute: 'State'
                        },
                        gridConfig: {
                            store: store,
                            storeConfig: {
                                filters: filters
                            },
                            rankColumnDataIndex: 'TaskIndex',
                            columnCfgs: [
                                'FormattedID',
                                'Name',
                                'State',
                                'Owner',
                                'ToDo'
                            ]
                        },
                        height: 400
                });
            },
            scope: this
        });
    },
    _getDetailColumnCfgs: function(){
        return [{
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
        },{
            dataIndex: 'Owner',
            text: 'Owner',
            flex: 1,
            renderer: function(v,m,r){
                return v._refObjectName;
            }
        }];
    },
    _getSummaryStoreColumnCfgs: function(){
        var columns = [
            {
                xtype: 'treecolumn',
                text: 'Owner',
                menuDisabled: true,
                dataIndex: 'Owner',
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
        return columns;
    },
    percentRenderer: function(val){
        if (val && Number(val)){
            return (Number(val) * 100).toFixed(1) + "%";
        }
        return "";
    },
    _buildSummaryStore: function(records){

        this.logger.log('_buildSummaryStore', root);

        //now we need to ask the task records to the store
        this.userManagerStore.addTasks(records);
        var root = this.userManagerStore.getUserObj(this.selectedManagerId);


        return Ext.create('Ext.data.TreeStore', {
            root: { children: root.children,
                    expanded: false
            },
            model: CArABU.technicalservices.UserSummaryTaskModel
        });



        //Ext.Array.each(records, function(r){
        //    var empID = r.get('Owner') && r.get('Owner')[employeeIDField];
        //    if (!tasksByEmp[empID]){
        //        tasksByEmp[empID] = [];
        //    }
        //    tasksByEmp[empID].push(r);
        //});
        //
        //var data = [];
        //Ext.Object.each(tasksByEmp, function(empID, tasks){
        //    var m = Ext.create("CArABU.technicalservices.UserSummaryTaskModel");
        //    m.addTasks(tasks);
        //    data.push(m);
        //});
        //
        //return Ext.create('Rally.data.custom.Store',{
        //    data: data,
        //    pageSize: data.length
        //});
    },
    _buildGrid: function(store){
        var context = this.getContext();
        var modelNames = ['task'];
        store.load();
        this.add({
            xtype: 'managertaskboard',
            context: context,
            modelNames: modelNames,
            toggleState: 'grid',
            stateful: false,
          //stateId: context.getScopedStateId('fred'),
            plugins: [
                //{
                //    ptype: 'rallygridboardinlinefiltercontrol',
                //    inlineFilterButtonConfig: {
                //        stateful: true,
                //        stateId: context.getScopedStateId('task-filters-2'),
                //        modelNames: modelNames,
                //        inlineFilterPanelConfig: {
                //            quickFilterPanelConfig: {
                //                defaultFields: [
                //                    'ArtifactSearch',
                //                    'Owner'
                //                ]
                //            }
                //        }
                //    }
                //},
                {
                    ptype: 'rallygridboardfieldpicker',
                    headerPosition: 'left',
                    modelNames: modelNames,
                    stateful: true,
                    stateId: context.getScopedStateId('columns-6')
                }
            ],
            gridConfig: {
                store: store,
                storeConfig: {
                    useCompositeArtifacts: false,
                    sorters: [{
                        property: 'TaskIndex',
                        direction: "ASC"
                    }],
                   // rankColumnDataIndex: 'TaskIndex'
                },
                enableRanking: false,
                rankColumnDataIndex: 'TaskIndex',
                enableInlineAdd: false,
                columnCfgs: [
                    'Name',
                    'State'
                ]
            },
            height: this.getHeight()
        });
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
