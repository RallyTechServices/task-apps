Ext.define('CArABU.technicalservices.TaskCFDCalculator', {
    extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    config: {
        stateFieldName: 'State',
        stateFieldValues: ['Defined', 'In-Progress', 'Completed'],
        completedStates: ['Completed']
    },

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },

    getMetrics: function() {

        return [{
            as: "Defined",
            field: "Remaining",
            f: "filteredSum",
            filterField: "State",
            filterValues: ["Defined"],
            display: "area"
        },{
            as: "In-Progress",
            field: "Remaining",
            f: "filteredSum",
            filterField: "State",
            filterValues: ["In-Progress"],
            display: "area"
        },{
            as: "Completed",
            field: "Completed",
            f: "sum",
            display: "area"
        }];

    },
    getDerivedFieldsOnInput: function () {
        var completedStateNames = this.getCompletedStates();
        return [
            {
                "as": "Remaining",
                "f": function (snapshot) {
                    if (snapshot.ToDo){
                        return snapshot.ToDo/40;
                    } else {
                        return snapshot.Estimate/40;
                    }
                    return 0;
                }
            },
            {
                "as": "Completed",
                "f": function (snapshot) {
                    if (_.contains(completedStateNames, snapshot.State) && snapshot.Estimate) {
                        return snapshot.Estimate/40;
                    }
                    if (!_.contains(completedStateNames, snapshot.State) && snapshot.Estimate && snapshot.ToDo){
                        return (snapshot.Estimate - snapshot.ToDo)/40;
                    }

                    return 0;
                }
            }
        ];
    },
    prepareChartData: function (stores) {

        var snapshots = [];
        Ext.Array.each(stores, function(store){
            store.each(function (record) {
                snapshots.push(record.raw);
            });
        });
        return this.runCalculation(snapshots);
    }
});