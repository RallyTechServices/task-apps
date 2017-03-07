 Ext.define("custom-list-task-rollup", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    integrationHeaders : {
        name : "custom-list-task-rollup"
    },

    config: {
        defaultSettings: {
            viewType: 'HierarchicalRequirement',
            useLookback: true,
            maxChunkSize: 40,
            queryFilter: ''
        }
    },
                        
    launch: function() {
        this.buildStore();
    },
    buildStore: function(){
        if (this.down('rallygridboard')){
            this.down('rallygridboard').destroy();
        }
        this.logger.log('buildStore', this.getViewType());
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.getViewType()],
            fetch: this.getFetchList(),
            filters: this.getFilters(),
            enableHierarchy: true
        }).then({
            success: this.buildGrid,
            failure: this.showErrorMessage,
            scope: this
        });
    },
    getFetchList: function(){
        var fetch = ['ObjectID'];
        if (this.getViewType().toLowerCase() === 'task'){
            return fetch.concat(['Estimate','ToDo','State']);
        }
        return fetch;
    },
     getFilters: function(){
         if (this.getSetting('queryFilter')){
             return Rally.data.wsapi.Filter.fromQueryString(this.getSetting('queryFilter'));
         }
         return [];
     },
    buildGrid: function(store){
        this.logger.log('buildGrid');

        this.taskCache = Ext.create('CArABU.technicalservices.TaskCache',{
            useLookback: this.getUseLookback(),
            maxChunkSize: this.getMaxChunkSize()
        });
        
        this.setLoading('Loading...');
        
        store.model.addField({name: '__tasks', type: 'auto', defaultValue: null});
        store.on('load', this.updateTaskCache, this);

        this._addGridBoard(store);

    },
    
    _addGridBoard: function(store) {
    	var context = this.getContext(),
	        modelNames = [this.getViewType()],
	        margin = '3 10 3 10',
	        rankField = 'DragAndDropRank',
	        enableRank = true;

	    if (this.getViewType().toLowerCase() === 'task'){
	        rankField = 'TaskIndex';
	        enableRank = false;
	    }
    
        this.add({
            xtype: 'rallygridboard',
            context: context,
            modelNames: modelNames,
            toggleState: 'grid',
            stateful: false,

            plugins: [{
                ptype: 'rallygridboardaddnew'
            },{
                    ptype: 'rallygridboardfieldpicker',
                    headerPosition: 'left',
                    modelNames: modelNames,
                    stateful: true,
                    margin: margin,
                    stateId: context.getScopedStateId('task-rollup-columns')
                },{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    inlineFilterButtonConfig: {
                        stateful: true,
                        margin: margin,
                        stateId: context.getScopedStateId('task-rollup-filter'),
                        modelNames: modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                defaultFields: [
                                    'ArtifactSearch',
                                    'Owner',
                                    'ModelType',
                                    'Milestones'
                                ]
                            }
                        }
                    }
                },{
                ptype: 'rallygridboardsharedviewcontrol',
                stateful: true,
                stateId: context.getScopedStateId('task-view'),
                stateEvents: ['select','beforedestroy'],
                margin: margin
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
                rankColumnDataIndex: rankField,
                enableRanking: enableRank,
                store: store,
                storeConfig: {
                    filters: this.getFilters()
                },
                columnCfgs: [
                    'FormattedID',
                    'Name'
                ].concat(this.getDerivedColumns()),
                derivedColumns: this.getDerivedColumns()
            },
            listeners: {
                viewchange: function(gb){
                    this.buildStore();
                },
                scope: this
            },
            height: this.getHeight()
        });
    },
    getDerivedColumns: function(){
       // return [];
        return [{
            text: 'Task % Complete (Effort)',
            xtype: 'taskpctcomplete',
            taskCache: this.taskCache,
            align: 'center'
        },{
            text: 'Task % Complete (Count)',
            xtype: 'taskpctcomplete',
            taskCache: this.taskCache,
            useCount: true,
            align: 'center'
        }];
    },
    showErrorMessage: function(error){
        this.logger.log('showErrorMessage', error);
    },
    
    updateModels: function(records){
    	this.setLoading('Rolling Up Information');
        this.logger.log('updateModels', this.taskCache);
        
        // suspend layout so that we can set all the records more quickly and refresh the view all at once
        this.down('rallygridboard').getGridOrBoard().suspendLayouts();
        for ( var i=0; i<records.length; i++ ) {
            records[i].set('__tasks', this.taskCache && this.taskCache.getTaskList(records[i].get('ObjectID')));
            //console.log('r', r.get('__tasks'))
        }
        this.down('rallygridboard').getGridOrBoard().resumeLayouts();
                
        this.logger.log('Refreshing view');
        
        this.down('rallygridboard').getGridOrBoard().getStore().fireEvent('refresh', this.down('rallygridboard').getGridOrBoard().getStore());
        this.setLoading(false);
    },
    
    updateTaskCache: function(store, nodes, records, success){
    	var me = this;
        this.logger.log('updateTaskCache', success);

        this.setLoading('Updating Task Cache');
        this.taskCache.fetchTasks(records).then({
            success: this.updateModels,
            failure: this.showErrorNotification,
            scope: this
        }).always(function(){ me.setLoading(false); });
    },
    
    showErrorNotification: function(msg) {
    	var message = msg || "There was a problem loading data";
    	
    	Rally.ui.notify.Notifier.showError({message: message});
    },

    getViewType: function(){
        return this.getSetting('viewType') || "HierarchicalRequirement";
    },
    getUseLookback: function(){
        return this.getSetting('useLookback') === true || this.getSetting('useLookback') === 'true';
    },
    getMaxChunkSize: function(){
        return this.getSetting('maxChunkSize');
    },
    getSettingsFields: function(){

        var labelWidth = 100,
            typeFilters = [{
            property: 'TypePath',
            operator: 'contains',
            value: 'PortfolioItem/'
        },{
            property: 'TypePath',
            value: 'HierarchicalRequirement'
        },{
            property: 'TypePath',
            value: 'Task'
        }];
        typeFilters = Rally.data.wsapi.Filter.or(typeFilters);

        return [{
            name: 'viewType',
            xtype: 'rallycombobox',
            fieldLabel: 'Grid Type',
            labelAlign: 'right',
            labelWidth: labelWidth,
            storeConfig: {
                model: 'TypeDefinition',
                fetch: ['TypePath','DisplayName'],
                filters: typeFilters,
                remoteFilter: true
            },
            displayField: 'DisplayName',
            valueField: 'TypePath'
        },{
            xtype: 'textarea',
            fieldLabel: 'Query Filter',
            name: 'queryFilter',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            labelAlign: 'right',
            labelWidth: 100,
            plugins: [
                {
                    ptype: 'rallyhelpfield',
                    helpId: 194
                },
                'rallyfieldvalidationui'
            ],
            validateOnBlur: false,
            validateOnChange: false,
            validator: function(value) {
                try {
                    if (value) {
                        Rally.data.wsapi.Filter.fromQueryString(value);
                    }
                    return true;
                } catch (e) {
                    return e.message;
                }
            }
        }];
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
        this.buildStore();
    }
});
