Ext.define('CArABU.technicalservices.ModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {

                var default_fields = [{
                    name: '__taskToDo',
                    defaultValue: [0,0,0],
                    sortType: function(value) {
                        return Ext.Array.sum(value);
                    }
                },{
                    name: '__taskEstimate',
                    defaultValue: [0,0,0],
                    sortType: function(value) {
                        return Ext.Array.sum(value);
                    }
                 },{
                    name: '__taskCount',
                    defaultValue: [0,0,0],
                    sortType: function(value) {
                        return Ext.Array.sum(value);
                    }
                },{
                    name: '__taskEstimatePct',
                    defaultValue: [0,0,0],
                    sortType: function(value) {
                        return  value && value[2] || 0;
                    }
                },{
                    name: '__taskCountPct',
                    defaultValue: [0,0,0],
                    sortType: function(value) {
                        return value && value[2] || 0;
                    }
                },{
                    name: '__missingEstimates',
                    defaultValue: 0
                }];

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    logger: new Rally.technicalservices.Logger(),
                    fields: default_fields,
                    snaps: undefined,

                    addTasks: function(snaps){
                        this.logger.log('addTasks', snaps);
                        this.tasks = snaps || [];
                    },
                    hasTasks: function(){
                        var taskCount = this.get('__taskCount') || [0];
                        return Ext.Array.sum(taskCount) > 0;
                    },
                    calculateRollups: function(taskOwners, storyOids) {
                        var TASK_STATES = ['Defined','In-Progress','Completed'];
                        var snaps = this.tasks || [];
                        this.logger.log('calculateRollups',  this.get('FormattedID'), snaps, taskOwners, storyOids);


                        storyOids = storyOids || [];

                        var taskCount = [0, 0, 0],
                            taskEstimate = [0, 0, 0],
                            taskToDo = [0, 0, 0],
                            taskCompleted = 0,
                            missingEstimates = 0;

                        if (snaps && snaps.length > 0) {

                            for (var i = 0; i < snaps.length; i++) {
                                var snap = snaps[i],
                                    state = snap.State,
                                    stateIdx = _.indexOf(TASK_STATES, state),
                                    includeTask = true;

                                if (taskOwners && taskOwners.length > 0){
                                    includeTask = Ext.Array.contains(taskOwners, snap.Owner);
                                }

                                if (includeTask && storyOids && storyOids.length > 0){
                                    includeTask = Ext.Array.contains(storyOids, snap.WorkProduct);
                                }

                                if (includeTask){
                                    taskCount[stateIdx]++;
                                    if (!snap.Estimate){
                                        console.log('snap',snap, snap.Estimate);
                                        missingEstimates++;
                                    }
                                    var est = snap.Estimate || 0;
                                    if (stateIdx < 2){
                                        est = Math.max(est, snap.ToDo || 0);
                                        taskToDo[stateIdx] += (snap.ToDo || 0);
                                        taskCompleted += est - (snap.ToDo || 0);
                                    } else {
                                        taskCompleted += est;
                                    }
                                    taskEstimate[stateIdx] += est;
                                }
                            }
                        }
                        this.logger.log('calculateRollups', this.get('FormattedID'), missingEstimates, taskCount, taskEstimate, taskToDo);

                        this.set('__taskToDo', taskToDo);
                        this.set('__taskEstimate', taskEstimate);
                        this.set('__taskCount', taskCount);
                        this.set('__missingEstimates', missingEstimates);

                        var totalEstimate =  Ext.Array.sum(taskEstimate),
                            totalCount = Ext.Array.sum(taskCount),
                            taskCountPct = [0,0,0],
                            taskEstimatePct = [0,0,0];

                        for (var i=0; i<3; i++){
                            if (totalCount > 0){taskCountPct[i] = taskCount[i]/totalCount * 100};
                            if (totalEstimate > 0) {
                                if (i === 2){
                                    taskEstimatePct[i] = taskCompleted/totalEstimate * 100
                                } else {
                                    taskEstimatePct[i] = taskToDo[i]/totalEstimate * 100
                                }
                            };
                        }

                        this.set('__taskCountPct', taskCountPct);
                        this.set('__taskEstimatePct', taskEstimatePct);

                        return { todo: taskToDo, count: taskCount, estimate: taskEstimate };
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    },

    // sometimes, dates are provided as beginning of day, but we 
    // want to go to the end of the day
    shiftToEndOfDay: function(js_date) {
        return Rally.util.DateTime.add(Rally.util.DateTime.add(js_date,'day',1),'second',-1);
    },

    isAccepted: function(state) {
        return ( state == 'Accepted' );
    }
});