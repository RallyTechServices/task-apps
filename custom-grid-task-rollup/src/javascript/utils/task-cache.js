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

        this.logger.log('fetchTasks.missingRecords', missingRecords, records);
        if (missingRecords.length === 0){
            deferred.resolve(records);
        } else {
            if (missingRecords[0].get('_type') === 'task'){
                for (var i=0; i<missingRecords.length; i++){
                    this.tasks[missingRecords[i].get('ObjectID')] = missingRecords[i].getData();
                }
                deferred.resolve(records);
            } else {
                var missingOids = Ext.Array.map(missingRecords, function(r){ return r.get('ObjectID'); });
                this.logger.log('fetchTasks.missingOids', missingOids, this.useLookback)
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
        return deferred;
    },
    _fetchTasksLookback: function(ancestorOids){
        var deferred = Ext.create('Deft.Deferred');

        var promises = [];
        for (var i=0; i < ancestorOids.length; i = i+this.maxChunkSize){
            var chunks = Ext.Array.slice(ancestorOids, i, i + this.maxChunkSize);
            promises.push(this._fetchLBAPIChunk(chunks));
        }

        Deft.Promise.all(promises).then({
            success: function(results){
                var snaps = _.flatten(results);
                this._processTaskSnaps(snaps);
                this.logger.log('_fetchTasksLookback SUCCESS results', results, this.tasks, this.taskMap);
                deferred.resolve();
            },
            failure: function(msg){
                this.logger.log('_fetchTasksLookback FAILURE', ancestorOids, msg);
                deferred.reject(msg);
            },
            scope: this
        });
        return deferred;
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
        this.logger.log('_fetchLBAPIChunk', objectIDs);

        var filters = [
            {
                property: '_ItemHierarchy',
                operator: 'in',
                value: objectIDs
            },{
                property: '_TypeHierarchy',
                value: 'Task'
            },{
                property: '__At',
                value: "current"
            }

        ];

        Ext.create('Rally.data.lookback.SnapshotStore',{
            fetch: this.lbapiTaskFetchList,
            filters: filters,
            hydrate: ['State'],
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],
            compress: true,
            removeUnauthorizedSnapshots: true
        }).load({
            callback: function(records, operation, success){
                if (success){
                    this.logger.log('_fetchLBAPIChunk SUCCESS', records);
                    deferred.resolve(records);
                } else {
                    var msg = "Failure loading snapshots for objectIDs: " + objectIDs.join(', ') + ":  " + operation.error.errors.join(',');
                    this.logger.log('_fetchLBAPIChunk FAILURE', msg);
                    deferred.resolve(msg);
                }
            },
            scope: this
        });
        return deferred;
    }
});