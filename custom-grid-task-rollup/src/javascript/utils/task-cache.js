/**
 * Created by kcorkan on 9/6/16.
 */
Ext.define('CArABU.technicalservices.TaskCache',{
    logger: new Rally.technicalservices.Logger(),

    useLookback: false,
    tasks: null,
    taskMap: null,
    lbapiTaskFetchList: null,
    maxChunkSize: 40,

    constructor: function(config){
        if (config.useLookback){
            this.useLookback = true;
        }
        if (config.maxChunkSize > 0){
            this.maxChunkSize = config.maxChunkSize;
        }
        this.tasks = {};
        this.taskMap = {};
        this.lbapiTaskFetchList = ['Estimate','ToDo','State','_ItemHierarchy'];
    },
    getTask: function(objectID){
        return this.tasks[objectID];
    },
    getTaskList: function(objectID){
        return this.taskMap[objectID] || [];
    },
    fetchTasks: function(records){
        var deferred = Ext.create('Deft.Deferred');
        records = records || [];

        var missingRecords = [];
        for (var i=0; i < records.length; i++){
            var oid = records[i].get('ObjectID');
            if (!this.taskMap[oid]){
                missingRecords.push(records[i]);
            }
        }

        //this.logger.log('fetchTasks.missingRecords', missingRecords, records);
        if (missingRecords.length === 0){
            deferred.resolve(records);
        } else {
            if (missingRecords[0].get('_type') === 'task'){
                for (var i=0; i<missingRecords.length; i++){
                    this.taskMap[missingRecords[i].get('ObjectID')] = [missingRecords[i].get('ObjectID')];
                    this.tasks[missingRecords[i].get('ObjectID')] = missingRecords[i].getData();
                }
                deferred.resolve(records);
            } else {
                var missingOids = Ext.Array.map(missingRecords, function(r){ return r.get('ObjectID'); });
                //this.logger.log('fetchTasks.missingOids', missingOids, this.useLookback)
                if (this.useLookback){
                    this._fetchTasksLookback(missingOids).then({
                        success: function(){ deferred.resolve(records); },
                        failure: function(msg){ deferred.reject(msg); },
                        scope: this
                    });
                } else {
                    this._fetchTasksWsapi(missingOids).then({
                        success: function(){ deferred.resolve(records); },
                        failure: function(msg){ deferred.reject(msg); }
                    });
                }
            }
        }
        return deferred.promise;
    },
    _fetchTasksLookbackByChunk: function(ancestorOids){
        var me = this,
        	deferred = Ext.create('Deft.Deferred');

        var promises = [];
//        for (var i=0; i < ancestorOids.length; i = i+this.maxChunkSize){
//            var chunks = Ext.Array.slice(ancestorOids, i, i + this.maxChunkSize);
//            promises.push(function() { 
//                this.logger.log(chunks.length);
//            	return this._fetchLBAPIChunk(chunks); 
//        	});
//        }
        var chunk_count = Math.ceil(ancestorOids.length / this.maxChunkSize, 10);
        this.logger.log('chunk size :', this.maxChunkSize);
        this.logger.log('oid count  :', ancestorOids.length);
        this.logger.log('chunk count:', chunk_count);
        Ext.Array.each(_.range(0,ancestorOids.length,this.maxChunkSize), function(i){
        	var chunks = Ext.Array.slice(ancestorOids,i,i+me.maxChunkSize);
        	promises.push(function() {
        		return me._fetchLBAPIChunk(chunks);
        	});
        });
 
        this.logger.log("_fetchLBAPIChunks, count:", promises);

//        Deft.Promise.all(promises).then({
        Deft.Chain.parallel(promises,this).then({
            success: function(results){
                var snaps = _.flatten(results);
                this._processTaskSnaps(snaps);
                snaps = []; results = [];
                this.logger.log('_fetchTasksLookback SUCCESS results', results, this.tasks, this.taskMap);
                deferred.resolve();
            },
            failure: function(msg){
                this.logger.log('_fetchTasksLookback FAILURE', ancestorOids, msg);
                deferred.reject(msg);
            },
            scope: this
        });
        return deferred.promise;
    },
    _fetchTasksLookback: function(ancestorOids){
        var me = this,
        	deferred = Ext.create('Deft.Deferred');
 
//        Deft.Promise.all(promises).then({
        this._fetchLBAPIChunk(ancestorOids).then({
            success: function(results){
                var snaps = _.flatten(results);
                this._processTaskSnaps(snaps);
                snaps = []; results = [];
                this.logger.log('_fetchTasksLookback SUCCESS results', results, this.tasks, this.taskMap);
                deferred.resolve();
            },
            failure: function(msg){
                this.logger.log('_fetchTasksLookback FAILURE', ancestorOids, msg);
                deferred.reject(msg);
            },
            scope: this
        });
        return deferred.promise;
    },
    _processTaskSnaps: function(snaps){
        Ext.Array.each(snaps, function(snap){
            var itemHierarchy = snap.get('_ItemHierarchy'),
                data = snap.getData();
            this.tasks[data.ObjectID] = data;
            Ext.Array.each(itemHierarchy, function(i){
                if (!this.taskMap[i]){
                    this.taskMap[i] = [];
                }
                if (!Ext.Array.contains(this.taskMap[i], data.ObjectID)){
                    this.taskMap[i].push(data.ObjectID);
                }
            }, this);
        }, this);
    },
    _fetchTasksWsapi: function(ancestors){
        var deferred = Ext.create('Deft.Deferred');

        deferred.resolve([]);

        return deferred;
    },
    _fetchLBAPIChunk: function(objectIDs){
        var deferred = Ext.create('Deft.Deferred');

        var filters = [
        	{
                property: '__At',
                value: "current"
            },{
                property: '_TypeHierarchy',
                value: 'Task'
            },{
                property: '_ItemHierarchy',
                operator: 'in',
                value: objectIDs
            }

        ];

        Ext.create('Rally.data.lookback.SnapshotStore',{
            fetch: this.lbapiTaskFetchList,
            filters: filters,
            //hydrate: ['State'],
            useHttpPost: true,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],
            //compress: true,
            removeUnauthorizedSnapshots: true,
            limit: 'Infinity'
        }).load({
            callback: function(records, operation, success){
                if (success){
                    this.logger.log('_fetchLBAPIChunk SUCCESS', records.length);
                    deferred.resolve(records);
                } else {
                	msg = "Time out while loading lookback data";
                	if ( operation && operation.error && operation.errors ) {
	                    var msg = "Failure loading snapshots for objectIDs: " + objectIDs.join(', ') + ":  " + operation.error.errors.join(',');
	                    this.logger.log('_fetchLBAPIChunk FAILURE', msg);
                	}
                    deferred.reject(msg);
                }
            },
            scope: this
        });
        return deferred;
    }
});