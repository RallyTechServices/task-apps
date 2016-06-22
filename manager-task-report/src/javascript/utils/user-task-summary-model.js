Ext.define('CArABU.technicalservices.UserSummaryObject',{
    empId: null,

    children: null,
    leaf: true,

    tasks: null,
    constructor: function(config){
        if (config){
            this.employeeId = config.employeeId || null;
        }
    },
    addChild: function(child){
        if (!this.children){
            this.children = [];
        }
        this.children.push(child);
    },
    setUser: function(userData){
        this.userName = userData.UserName || null;
        this.firstName = userData.FirstName || null;
        this.lastName = userData.LastName || null;
        this.objectID = userData.ObjectID || null;
        this.displayName = userData.DisplayName || null;
    },
    addTasks: function(tasks){
        var stateCount = {},
            stateToDo = {},
            stateEstimate = {};

        this.tasks = (this.tasks || []).concat(tasks);

        Ext.Array.each(tasks, function(t){
            var state = t && t.get('State'),
                estimate = t && t.get('Estimate'),
                todo = t && t.get('ToDo');

            if (state){
                if (!stateCount[state]){
                    stateCount[state] = 0;
                }
                if (!stateToDo[state]){
                    stateToDo[state] = 0;
                }
                if (!stateEstimate[state]){
                    stateEstimate[state] = 0;
                }
                stateCount[state]++;
                stateToDo[state] += Number(todo);
                stateEstimate[state] += Number(estimate);
            }
        });

    },
    _fetchTaskHistory: function(){}

});


Ext.define("CArABU.technicalservices.UserSummaryTaskModel", {
    extend: "Ext.data.TreeModel",
    logger: new Rally.technicalservices.Logger(),
    fields: [{
        name: 'empId',
        displayName: 'Employee ID',
        defaultValue: null
    },{
        name: "User",
        displayName: "User"
    },{
        name: "Owner",
        displayName: "Owner"
    },{
        name: "numDefined",
        convert: function(value, record) {
            var tasks  = record.get('tasks'),
                defined = 0;
            Ext.Array.each(tasks, function(t){
                console.log('t', t);
                if (t && t.get('State') === "Defined"){
                    defined++;
                }
            });
            return defined;
        }
    },{
        name: "numInProgress",
        convert: function(value, record) {
            var tasks  = record.get('tasks'),
                count = 0;
            Ext.Array.each(tasks, function(t){
                console.log('t', t);
                if (t && t.get('State') === "In-Progress"){
                    count++;
                }
            });
            return count;
        }
    },{
        name: "numCompleted",
        convert: function(value, record) {
            var tasks  = record.get('tasks'),
                count = 0;
            Ext.Array.each(tasks, function(t){
                console.log('t', t);
                if (t && t.get('State') === "Completed"){
                    count++;
                }
            });
            return count;
        }
    },{
        name: "ToDo",
        convert: function(value, record){
            var tasks  = record.get('tasks'),
                count = 0;
            Ext.Array.each(tasks, function(t){
                console.log('t', t);
                if (t && t.get('ToDo')){
                    count += Number(t.get('ToDo'));
                }
            });
            return count;
        }
    },{
        name: 'pctCompleteCount',
        convert: function(value, record){
            var tasks  = record.get('tasks'),
                count = 0,
                total = 0;
            Ext.Array.each(tasks, function(t){
                total++;
                if (t && t.get('State') === "Completed"){
                    count++;
                }
            });
            return total > 0 ? count/total : 0;
        }
    },{
        name: 'pctCompleteEffort',
        convert: function(value, record){
            var tasks  = record.get('tasks'),
                count = 0,
                total = 0;
            Ext.Array.each(tasks, function(t){
                var estimate = t && t.get('Estimate') || 0;
                total += estimate;
                if (t && t.get('State') === "Completed"){
                    count += estimate;
                }
            });
            return total > 0 ? count/total : 0;
        }
    },{

        name: "tasks"
    //},{
    //    name: "children",
    //    type: "auto",
    //    defaultValue: []
    }],

    addTasks: function(records){
        var states = {
            "Defined": 0,
            InProgress: 0,
            "Completed": 0
        };

        if (records && records.length > 0){
            this.set('Owner', records[0].get('Owner')._refObjectName);
        }

        Ext.Array.each(records, function(t){
            var state = t.get('State');
            states[state]++;
        });
        this.set('numDefined', states.Defined);
        this.set('numInProgress', states.InProgress);
        this.set('numCompleted', states.Completed);
        this.set('tasks', records);
    }
});
