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
                    calculateRollups: function(taskOwners) {
                        var TASK_STATES = ['Defined','In-Progress','Completed'];
                        var snaps = this.tasks || [];
                        this.logger.log('calculateRollups', snaps, taskOwners);

                        var taskCount = [0, 0, 0],
                            taskEstimate = [0, 0, 0],
                            taskToDo = [0, 0, 0];

                        if (snaps && snaps.length > 0) {

                            for (var i = 0; i < snaps.length; i++) {
                                var snap = snaps[i],
                                    state = snap.State,
                                    stateIdx = _.indexOf(TASK_STATES, state),
                                    includeTask = true;

                                if (taskOwners && taskOwners.length > 0){
                                    includeTask = Ext.Array.contains(taskOwners, snap.Owner);
                                }

                                if (includeTask){
                                    taskCount[stateIdx]++;
                                    var est = snap.Estimate || 0;
                                    if (stateIdx < 2){
                                        est = Math.max(est, snap.ToDo || 0);
                                        taskToDo[stateIdx] += (snap.ToDo || 0);
                                    }
                                    taskEstimate[stateIdx] += est;
                                }
                            }
                        }
                        this.logger.log('calculateRollups', this.get('FormattedID'), taskCount, taskEstimate, taskToDo);

                        this.set('__taskToDo', taskToDo);
                        this.set('__taskEstimate', taskEstimate);
                        this.set('__taskCount', taskCount);

                        return { todo: taskToDo, count: taskCount, estimate: taskEstimate };

                        //'__pctTaskEstimate'
                        //'__pctTaskCount'
                    },
                    //updateTotals: function(totalToDo, totalCount, totalEstimate){
                    //    this.set('__totalToDo', totalToDo);
                    //    this.set('__totalEstimate', totalEstimate);
                    //    this.set('__totalCount', totalCount);
                    //}
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