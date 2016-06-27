Ext.define('CArABU.technicalservices.UserTreeItem',{
    empId: null,
    children: null,
    leaf: true,
    tasks: null,

    constructor: function(config) {
        this.employeeId = config && config.employeeId || null;
        this.timestamp = new Date();
    },
    setUserData: function(userData){
        if (!this.userName){
            this.userName = userData.UserName || null;
        }
        if (!this.displayName){
            this.displayName = userData.DisplayName || userData._refObjectName || userData.UserName;
            if (userData.FirstName && userData.LastName){
                this.displayName = userData.FirstName + ' ' + userData.LastName;
            }
        }
        this.objectID = userData.ObjectID || null;
    },
    addChild: function(child){

        //Check that child doesn't already exist...
        var existingChild = Ext.Array.findBy(this.getChildren(), function(item){return item.employeeId.toString() === child.employeeId.toString();});
        if (!existingChild) {
            this.getChildren().push(child);
        }
        this.leaf = false;
    },
    getChildren: function(){
        console.log('getChildren', this.displayName, this.timestamp, Ext.clone(this.children), this.children);
        if (!this.children){
            this.children = [];
        }
        return this.children;
    },
    addTasks: function(tasks, historical){
        var userTasks = [];
        Ext.Array.each(tasks, function(t){
            userTasks.push({
                ObjectID: t.get('ObjectID'),
                ToDo: t.get('ToDo'),
                Estimate: t.get('Estimate'),
                State: t.get('State')
            });
        });
        if (historical){
            this.historicalTasks = userTasks;
        } else {
            this.taskIds = _.pluck(userTasks, 'ObjectID');
            this.currentTasks = userTasks;
        }
    },
    getCurrentTasks: function(){
        return this.currentTasks || [];
    },
    getHistoricalTasks: function(){
        return this.historicalTasks || [];
    },
    doCalculations: function(noRollup) {
        this.ToDo = 0;
        this.numDefined = 0;
        this.numInProgress = 0;
        this.numCompleted = 0;
        this.totalCount = 0;
        this.totalEffort = 0;

        if (!noRollup){
            Ext.Array.each(this.getChildren(), function (child) {
                child.doCalculations();
                this.ToDo += child.ToDo;
                this.numDefined += child.numDefined;
                this.numInProgress += child.numInProgress;
                this.numCompleted += child.numCompleted;
                this.totalEffort += child.totalEffort;
                this.totalCount += child.totalCount;
                this.taskIds = Ext.Array.merge(this.taskIds, child.taskIds || []);
            }, this);
        }

        this.ToDo += Ext.Array.sum(Ext.Array.pluck(this.getCurrentTasks(), 'ToDo'));
        this.totalCount += this.getCurrentTasks().length;
        this.totalEffort += Ext.Array.sum(Ext.Array.pluck(this.getCurrentTasks(), 'Estimate'));
        this.numDefined += Ext.Array.filter(this.getCurrentTasks(), function(t){ return t.State === "Defined"; }).length;
        this.numInProgress += Ext.Array.filter(this.getCurrentTasks(), function(t){ return t.State === "In-Progress"; }).length;
        this.numCompleted += Ext.Array.filter(this.getCurrentTasks(), function(t){ return t.State === "Completed"; }).length;

        this.pctCompleteEffort = this.totalEffort > 0 ? (this.totalEffort - this.ToDo)/this.totalEffort : 0;
        this.pctCompleteCount = this.totalCount > 0 ? this.numCompleted/this.totalCount : 0;
    },
    doHistoricalCalculations: function(noRollup){
        this.historicalToDo = 0;

        if (!noRollup){
            Ext.Array.each(this.getChildren(), function (child) {
                child.doHistoricalCalculations();
                this.historicalToDo += child.historicalToDo;
            }, this);
        }
        this.historicalToDo += Ext.Array.sum(Ext.Array.pluck(this.getHistoricalTasks(), 'ToDo'));

        this.deltaToDo = this.historicalToDo - this.ToDo;
    }

});

Ext.define('CArABU.technicalservices.UserTree',{
    logger: new Rally.technicalservices.Logger(),
    constructor: function(config){
        this.logger.log('config', config);
        var users = config && config.users || [];
        var managerId = config && config.managerId || null;

        this.employeeIDField = config.employeeIDField;
        this.managerIDField = config.managerIDField;

        if (users && users.length > 0){
            this._initializeUsers(users, managerId);
        }

    },
    _initializeUsers: function(users, rootId){
        Ext.Array.each(users, function(r){
            var empId = r.get(this.employeeIDField);
            if (empId){
                var userObj = this.getUserItem(empId),
                    mgrID = r.get(this.managerIDField);

                userObj.setUserData(r.getData());

                if (mgrID && mgrID.length > 0){
                    var mgrObj = this.getUserItem(mgrID);
                    mgrObj.addChild(userObj);
                }
            }
            console.log('users', this.userTree, empId, this.employeeIDField);
        }, this);

        //Todo clean out all users other than root.
        this.logger.log('_initializeUsers', this.userTree);
    },
    getAllChildrenEmployeeIds: function(empId){
        var user = this.getUserItem(empId),
            ids = [empId],
            children = user.getChildren();

        Ext.Array.each(children, function(c){
            ids = ids.concat(this.getAllChildrenEmployeeIds(c.employeeId, true));
        }, this);
        this.logger.log('getAllChildrenEmployeeIds', empId, ids);
        return ids;
    },
    getUserItem: function(employeeId){
            if (!this.userTree){
                this.userTree = {};
            }
            employeeId = employeeId.toString();
            console.log('getUserItem', employeeId,this.userTree[employeeId] && this.userTree[employeeId].displayName, this.userTree[employeeId] && this.userTree[employeeId].getChildren().length );
            if (!this.userTree[employeeId]){
                this.userTree[employeeId] = Ext.create('CArABU.technicalservices.UserTreeItem',{
                    employeeId: employeeId
                }); //{text: employeeId, empId: employeeId, user: null, children: [], leaf: true, tasks: []};
            }
            return this.userTree[employeeId];
    },

    processTasks: function(records, snapshots, managerId){
        var employeeIdField = this.employeeIDField,
            managerIDField = this.managerIDField,
            tasksByEmpId = {};
        this.logger.log('processTasks', this.userTree, this.getUserItem("316380").getChildren().length);

        Ext.Array.each(records, function(r){
            var empId = r.get('Owner') && r.get('Owner')[employeeIdField];
            if (empId){
                if (!tasksByEmpId[empId]){
                    tasksByEmpId[empId] = [];
                }
                tasksByEmpId[empId].push(r);
            }
        });

        Ext.Object.each(tasksByEmpId, function(empId, tasks){
            if (empId && tasks && tasks.length > 0){
                var owner = tasks[0].get('Owner'),
                    mgrID =owner && owner[managerIDField];

                var userObj = this.getUserItem(empId);
                userObj.setUserData(owner);
                console.log('owner',owner);

                userObj.addTasks(tasks);
                if (mgrID && mgrID.length > 0){
                    var mgrObj = this.getUserItem(mgrID);
                    console.log('mgrId',mgrID,mgrObj,mgrObj.displayName);
                    mgrObj.addChild(userObj);
                }
            }
        }, this);
        this.logger.log('processTasks after',this.userTree, this.getUserItem("316380").getChildren().length);

        var snapsByOwner = {},
            userOids = [];
        Ext.Array.each(snapshots, function(s){
            var objectID = s.get('Owner').toString();
            if (!snapsByOwner[objectID]){
                snapsByOwner[objectID] = [];
                userOids.push(objectID.toString());
            }
            snapsByOwner[objectID].push(s);

        });

        var usersByObjectID = {};
        Ext.Object.each(this.userTree, function(empId, user){
            var userObjectId = user.objectID && user.objectID.toString() || 0;
            if (Ext.Array.contains(userOids, userObjectId)){
                usersByObjectID[userObjectId] = user;
            }
        });

        Ext.Object.each(snapsByOwner, function(objectId, snaps){
            var userObject = usersByObjectID[objectId.toString()];
            if (userObject){
                userObject.addTasks(snaps, true);
            }
        });
        this.logger.log('processTasks after 2',this.userTree, this.getUserItem("316380").getChildren().length);
        this.getUserItem(managerId).doCalculations();
        this.getUserItem(managerId).doHistoricalCalculations();
        this.logger.log('processTasks after 3',this.userTree, this.getUserItem("316380").getChildren().length);
        this.logger.log('processTasks manager', this.getUserItem(managerId));
    }
});


Ext.define("CArABU.technicalservices.UserSummaryTaskModel", {
    extend: "Ext.data.TreeModel",

    fields: [{
        name: 'employeeId',
        displayName: 'Employee ID',
        defaultValue: null
    },{
        name: "displayName",
        displayName: "Owner"
    },{
        name: "numDefined"
    },{
        name: "numInProgress"
    },{
        name: "numCompleted"
    },{
        name: "ToDo"
    },{
        name: 'pctCompleteCount'
    },{
        name: 'pctCompleteEffort'
    },{
        name: 'deltaToDo'
    },{
        name: 'taskIds'
    },{
        name: 'children'
    }]
});
