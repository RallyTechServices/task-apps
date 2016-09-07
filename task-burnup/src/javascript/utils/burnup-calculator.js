Ext.define('CArABU.technicalservices.TaskBurnupCalculator', {
    extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    config: {
        completedStates: ['Completed']
    },

    constructor: function (config) {
        this.initConfig(config);
        this.taskOwners = config.taskOwners;
        this.callParent(arguments);
    },

    getDerivedFieldsOnInput: function () {
        var completedStateNames = this.getCompletedStates(),
            taskOwners = this.taskOwners;

        return [
            {
                "as": "Estimated",
                "f": function (snapshot) {
                    if (taskOwners && !Ext.Array.contains(taskOwners,snapshot.Owner)){
                        return 0;
                    }

                    if (snapshot.Estimate) {
                        return snapshot.Estimate/40;
                    }
                    return 0;
                }
            },
            {
                "as": "Completed",
                "f": function (snapshot) {

                    if (taskOwners && !Ext.Array.contains(taskOwners,snapshot.Owner)){
                        return 0;
                    }

                    if (_.contains(completedStateNames, snapshot.State) && snapshot.Estimate) {
                        return snapshot.Estimate/40;
                    }
                    if (!_.contains(completedStateNames, snapshot.State) && snapshot.Estimate && snapshot.ToDo){
                        return (snapshot.Estimate - snapshot.ToDo)/40;
                    }

                    return 0;
                }
            },
            {
                "as": "Remaining",
                "f": function (snapshot) {
                    if (taskOwners && !Ext.Array.contains(taskOwners,snapshot.Owner)){
                        return 0;
                    }

                    if (!_.contains(completedStateNames, snapshot.State) && snapshot.ToDo){
                        return snapshot.ToDo/40;
                    }

                    return 0;
                }
            }
        ];
    },

    getMetrics: function () {
        return [{
                "field": "Completed",
                "as": "Completed",
                "f": "sum",
                "display": "column"
            },{
                "field": "Remaining",
                "as": "Remaining",
                "display": "line",
                "f": "sum"
            },{
            "field": "Estimated",
            "as": "Estimated",
            "display": "line",
            "f": "sum"
        }
        ];
    },
    prepareChartData: function (stores) {

        console.log('store',stores);
        var snapshots = [];
        Ext.Array.each(stores, function(store){
            store.each(function (record) {
                snapshots.push(record.raw);
            });
        });
        return this.runCalculation(snapshots);
    }
});