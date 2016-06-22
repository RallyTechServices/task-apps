Ext.define("CArABU.technicalservices.BurndownCalculator", {
    extend: "Rally.data.lookback.calculator.TimeSeriesCalculator",
    completedStates: ['Completed'],

    getDerivedFieldsOnInput: function() {

        return [
            {
                "as": "Estimated",
                "f": function(snapshot) {
                    if (snapshot.Estimate) {
                        return snapshot.Estimate;
                    }

                    return 0;
                }
            },
            {
                "as": "Remaining",
                "f": function(snapshot) {
                    if (snapshot.ToDo){ //(_.contains(completedScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
                        return snapshot.ToDo;
                    }
                    return 0;
                }
            }
        ];
    },

    getMetrics: function() {
        return [
            {
                "field": "Estimated",
                "as": "Estimated",
                "display": "line",
                "f": "sum"
            },
            {
                "field": "Remaining",
                "as": "Remaining",
                "f": "sum",
                "display": "column"
            }
        ];
    }
});