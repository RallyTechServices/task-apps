Ext.define('CArABU.technicalservices.FeatureTaskStore',{
    logger: new Rally.technicalservices.Logger(),
    MAX_CHUNK_SIZE: 425,
    MAX_THREADS: 10,
    TASK_STATES: ['Defined','In-Progress','Completed'],

    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    loadTasks: function(records, taskOwners, storyOids){
        var featureObjectIDs = _.map(records, function(r){ return r.get('ObjectID'); });
        return this.fetchTaskChunks(featureObjectIDs);
    },
    
    collectTasks: function(featureRecords, taskRecords) {
        var featureObjectIDs = _.map(featureRecords, function(r){ return r.get('ObjectID'); });

        this.logger.log('success inside collectTasks: taskRecords.length', taskRecords.length);
        
        var snapsByOid = this._getSnapsByOid(taskRecords, featureObjectIDs);
        this.logger.log('success inside collectTasks -- after snapsByOid');
        
        taskRecords = null;
        
        for (var i=0; i < featureRecords.length; i++){
            featureRecords[i].addTasks(snapsByOid[featureRecords[i].get('ObjectID') || [] ]);
        }
        
        return featureRecords;
    },

    load: function(records, storyFilters, taskOwners){
        var deferred = Ext.create('Deft.Deferred');

        var featureObjectIDs = _.map(records, function(r){ return r.get('ObjectID'); });
        if (storyFilters){
            this.fetchStories(featureObjectIDs, storyFilters).then({
                success: function(storyIDs){

                    this.fetchTaskChunks(storyIDs, taskOwners).then({
                        success: function(taskRecords){
                            var totals = this.calculateTaskRollups(taskRecords, records, featureObjectIDs);
                            deferred.resolve(totals);
                        },
                        failure: function(msg){
                            this.logger.log('load.fetchStories.fetchTaskChunks FAILURE', msg);
                            deferred.reject(msg);
                        },
                        scope: this
                    });
                },
                failure: function(msg){
                    this.logger.log('load.fetchStories FAILURE', msg);
                    deferred.reject(msg);
                },
                scope: this
            });
        } else {

            this.fetchTaskChunks(featureObjectIDs, taskOwners).then({
                success: function(taskRecords){
                    Rally.getApp().setLoading("Calculating Rollups...");
                    var totals = this.calculateTaskRollups(taskRecords, records, featureObjectIDs);
                    Rally.getApp().setLoading(false);
                    deferred.resolve(totals);
                },
                failure: function(msg){
                    this.logger.log('load.fetchTaskChunks FAILURE', msg);
                    deferred.reject(msg);
                },
                scope: this
            });
        }
        return deferred;
    },
    fetchTaskChunks: function(ancestorObjectIDs, taskOwners, storyOids){
        var deferred = Ext.create('Deft.Deferred'),
            me = this;
        var promises = [];
        var chunk_size = ancestorObjectIDs.length / this.MAX_THREADS;
        
        Ext.Array.each(_.range(0,this.MAX_THREADS), function(page_index){
            var start = page_index * chunk_size;
            var chunk = Ext.Array.slice(ancestorObjectIDs, start, start + chunk_size);
            promises.push(function() { 
                return me._fetchLBAPIChunk(chunk, taskOwners, storyOids); 
            });
        });
        
        //        var chunk_size = this.MAX_CHUNK_SIZE;
//        for (var i=0; i < ancestorObjectIDs.length; i = i+chunk_size){
//            var chunk = Ext.clone( Ext.Array.slice(ancestorObjectIDs, i, i + chunk_size) );
//            promises.push(function() { 
//                return me._fetchLBAPIChunk(chunk, taskOwners, storyOids); 
//            });
//        }

        //Deft.Promise.all(promises).then({
        Deft.Chain.parallel(promises,this).then({
            success: function(results){
                var records = _.flatten(results);
                results = null;
                deferred.resolve(records);
            },
            failure: function(msg){
                this.logger.log('fetchTaskChunks FAILURE', ancestorObjectIDs, taskOwners, msg);
                deferred.reject(msg);
            },
            scope: this
        });
        return deferred;
    },
    fetchStories: function(featureObjectIDs, filters){
        var deferred = Ext.create('Deft.Deferred');
        //we are only interested in stories that have features
        filters = filters.and({
            property: 'Feature.ObjectID',
            operator: '>',
            value: 0
        });

        Ext.create('Rally.data.wsapi.Store',{
            model: 'HierarchicalRequirement',
            fetch: ['ObjectID','Feature'],
            filters: filters,
            limit: 'Infinity'
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    //we only want stories associated with the features that we passed in so we will filter those out.
                    var storyIds = [];
                    for (var i=0; i<records.length; i++){
                        var featureID = records[i].get('Feature') && records[i].get('Feature').ObjectID;
                        if (Ext.Array.contains(featureObjectIDs, featureID)){
                            storyIds.push(records[i].get('ObjectID'));
                        }
                    }
                    deferred.resolve(storyIds);
                } else {
                    deferred.reject("Error fetching stories: " + operation && operation.error && operation.error.errors.join(','));
                }
            }
        });
        return deferred;
    },
    calculateTaskRollups: function(taskRecords, featureRecords, objectIDs){
        this.logger.log('calculateTaskRollups', taskRecords.length, featureRecords.length);
        
        var snapsByOid = this._getSnapsByOid(taskRecords, objectIDs),
            totalToDo = [0,0,0],
            totalEstimate = [0,0,0],
            totalCount = [0,0,0],
            rollupsByOid = {};

        Ext.Array.each(featureRecords, function(r){
            var snaps = snapsByOid[r.get('ObjectID')] || null;
                //rollup = this._calculateRollup(snaps);

            var rollup = null;
            if (snaps && snaps.length > 0){

                rollup = {
                    taskCount: [0,0,0],
                    taskEstimate: [0,0,0],
                    taskToDo: [0,0,0],
                    count: {},
                    estimate: {},
                    todo: {}
                };

                for (var i=0; i<snaps.length; i++){
                    var snap = snaps[i],
                        state = snap.State,
                        stateIdx = _.indexOf(this.TASK_STATES, state);

                    rollup.taskCount[stateIdx]++;
                    rollup.taskEstimate[stateIdx] += (snap.Estimate || 0);
                    rollup.taskToDo[stateIdx] += (snap.ToDo || 0);

                    if (!rollup.count[state]){
                        rollup.count[state] = 0;
                        rollup.estimate[state] = 0;
                        rollup.todo[state] = 0;
                    }

                    rollup.count[state]++;
                    rollup.estimate[state] += (snap.Estimate || 0);
                    rollup.todo[state] += (snap.ToDo || 0)
                }

                for (var i=0; i < this.TASK_STATES.length; i++){
                    totalToDo[i] += rollup.taskToDo[i];
                    totalEstimate[i] += rollup.taskEstimate[i];
                    totalCount[i]+= rollup.taskCount[i];
                }
            }

            rollupsByOid[r.get('ObjectID')] = rollup;
        }, this);

        var totals = {taskToDo: totalToDo, taskEstimate: totalEstimate, taskCount: totalCount};
        
        Ext.Array.each(featureRecords, function(r){
            var rollup = rollupsByOid[r.get('ObjectID')] || null;
            if (rollup){
                rollup.totals = totals;
            }
            r.set('rollup', rollup);
        });

        return totals;

    },
    _calculateRollup: function(snaps){

        var rollup = null;
        if (snaps && snaps.length > 0){

            rollup = {
                taskCount: [0,0,0],
                taskEstimate: [0,0,0],
                taskToDo: [0,0,0],
                count: {},
                estimate: {},
                todo: {}
            };

            for (var i=0; i<snaps.length; i++){
                var snap = snaps[i],
                    state = snap.State,
                    stateIdx = _.indexOf(this.TASK_STATES, state);

                rollup.taskCount[stateIdx]++;
                rollup.taskEstimate[stateIdx] += (snap.Estimate || 0);
                rollup.taskToDo[stateIdx] += (snap.ToDo || 0)

                if (!rollup.count[state]){
                    rollup.count[state] = 0;
                    rollup.estimate[state] = 0;
                    rollup.todo[state] = 0;
                }

                rollup.count[state]++;
                rollup.estimate[state] += (snap.Estimate || 0);
                rollup.todo[state] += (snap.ToDo || 0)
            }
        }

        return rollup;

    },
    _getSnapsByOid: function(snapshots, featureObjectIDs){
        var hash = {};

        for (var i=0; i< snapshots.length; i++){
            var snap = snapshots[i].getData();
            var itemHierarchy = snapshots[i].get('_ItemHierarchy'),
                objectID = Ext.Array.intersect(featureObjectIDs, itemHierarchy)[0];

            if (!hash[objectID]){
                hash[objectID] = [];
            }
            hash[objectID].push(snap);
        }
        return hash;
    },
    _fetchLBAPIChunk: function(objectIDs, taskOwners, storyOids){
        var deferred = Ext.create('Deft.Deferred');

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
            fetch: this._getLBAPIFetchList(),
            filters: filters,
            limit: Infinity,
            hydrate: ['State'],
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],
            removeUnauthorizedSnapshots: true,
            useHttpPost: true
        }).load({
            callback: function(records, operation, success){
                if (success){
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
    },
    _fetchChunk: function(objectIDs){
        var deferred = Ext.create('Deft.Deferred');

        var filters = _.map(objectIDs, function(o){ return {
                property: "Feature.ObjectID",
                value: o
            }
        });
        filters = Rally.data.wsapi.Filter.or(filters);

        filters = filters.and({
            property: "Tasks.ObjectID",
            operator: '>',
            value: 0
        });

        Ext.create('Rally.data.wsapi.Store',{
            fetch: this._getFetchList(),
            filters: filters,
            model: 'HierarchicalRequirement'
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    var msg = "Failure loading records for objectIDs: " + objectIDs.join(', ') + ":  " + operation.error.errors.join(',');
                    deferred.resolve(msg);
                }
            }
        });
        return deferred;
    },
    _getFetchList: function(){
        return ['ObjectID','Feature','Tasks','State','Estimate','ToDo'];
    },
    _getLBAPIFetchList: function(){
        return ['ObjectID','State','Estimate','ToDo','_ItemHierarchy','WorkProduct','Owner'];
    }

});