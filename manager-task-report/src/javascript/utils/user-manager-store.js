Ext.define('CArABU.technicalservices.UserManagerStore',{
    logger: new Rally.technicalservices.Logger(),
    mixins: {
        observable: 'Ext.util.Observable'
    },

    fetch: ['UserName','Email','First Name','Last Name','DisplayName'],
    constructor: function(config){
        Ext.apply(this,config);
        this.mixins.observable.constructor.call(this, config);

        this.employeeIDField = config.employeeIDField;
        this.managerIDField = config.managerEmployeeIDField;
        this.costCenterField = config.costCenterField;
        this.isManagerField = config.isManagerField;
        var costCenter = config.costCenter;

        this._loadUserModel().then({
            success: function(model){
                if (this._validateFields(model)){
                    this.fireEvent('ready');
                }
            },
             scope: this
        });
    },
    _loadUserModel: function(){
        return Rally.data.ModelFactory.getModel({
            type: 'User'
        });
    },
    _validateFields: function(model){
        var missingFields = [];
        if (!model.getField(this.employeeIDField)){
            missingFields.push("Employee ID Field (" + this.employeeIDField + ")");
        }
        if (!model.getField(this.managerIDField)){
            missingFields.push("Manager ID Field (" + this.managerIDField + ")");
        }
        if (!model.getField(this.costCenterField)){
            missingFields.push("Cost Center Field (" + this.costCenterField + ")");
        }
        if (missingFields.length > 0){
            this.fireEvent('configurationerror', Ext.String.format("The following custom fields are missing from the User Model:<br/>{0}<br/><br/> Please add these fields or use the app settings to configure the appropriate fields.", missingFields.join('<br/>')))
            return false;
        }
        return true;

    },
    _addManagerRecords: function(records){
        this._buildUserTree(records);

    },
    getUserObj: function(employeeID){
        if (!this.usersById){
            this.usersById = {};
        }
        if (!this.usersById[employeeID]){
             this.usersById[employeeID] = {text: employeeID, empId: employeeID, user: null, children: [], leaf: true, tasks: []};
        }
        return this.usersById[employeeID];
    },
    _buildUserTree: function(records){
        var managerIDField = this.managerEmployeeIDField,
            employeeIDField = this.employeeIDField;

        Ext.Array.each(records, function(r){
            var empId = r.get(employeeIDField);
            if (empId){
                var userObj = this.getUserObj(empId),
                    mgrID = r.get(managerIDField);

                userObj.User = r.getData();
                userObj.Owner = r.get('_refObjectName');

                if (mgrID && mgrID.length > 0){
                    var mgrObj = this.getUserObj(mgrID);
                    mgrObj.leaf = false;
                    mgrObj.children.push(userObj);
                }
            }
        }, this);
        this.logger.log('_buildUserTree usersById', this.usersById);
    },
    /**
     * returns all employee ids of the managers reporting to the person with the
     * employee id passed.  It also includes the employee id passed.
     * This is because this will be used in the filter to retrieve tasks
     * for all people who report to manager under this person
     * @param empId
     */
    getReportingManagerIds: function(empId){
        var user = this.getUserObj(empId),
            ids = [empId],
            children = user.children || [];

        Ext.Array.each(children, function(c){
           ids = ids.concat(this.getReportingManagerIds(c.empId));
        }, this);
        this.logger.log('getReportingManagerIds', empId, ids);
        return ids;
    },
    /**
     * This function takes task records and adds them to the users (or adds users for them)
     * @param records
     */
    addTasks: function(records){
        var employeeIdField = this.employeeIDField,
            managerIDField = this.managerIDField,
            tasksByEmpId = {};

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
                    mgrID = owner && owner[managerIDField];
                var userObj = this.getUserObj(empId);
                if (!userObj.User){
                    userObj.User = owner;
                    userObj.Owner = owner._refObjectName;
                }
                userObj.tasks = (userObj.tasks || []).concat(tasks);
            }

            if (mgrID && mgrID.length > 0){
                var mgrObj = this.getUserObj(mgrID);
                mgrObj.leaf = false;
                mgrObj.children.push(userObj);
            }
        }, this);
    },




    fetchDirectReports: function(employeeIDs){
        if (!Ext.isArray(employeeIDs)){
            employeeIDs = [employeeIDs];
        }
        var reports = [];
        Ext.Array.each(employeeIDs, function(e){
            reports = reports.concat(this.usersByManager[e] || []);
        }, this);
        return reports;
    },
    getManagerLevels: function(){
        return this.managerLevels;
    },
    getAllManagers: function(){
        console.log('getAllManagers', Ext.Object.getValues(this.usersByID).length)

        return Ext.Object.getValues(this.usersByID);
    },
    getAllManagersEmployeeIDs: function(empID){
        var managers = [empID].concat(this.getAllReportsEmployeeIDs(empID));

        var allManagers = _.keys(this.usersByManager);
        managers = Ext.Array.filter(managers, function(m){
            if (Ext.Array.contains(allManagers, m)){
                return true;
            }
            return false;
        }, this);

        return managers;
    },
    getAllReportsEmployeeIDs: function(empID){
        var reports = this.getDirectReportEmployeeIDs(empID);

        Ext.Array.each(reports, function(u){
            reports = reports.concat(this.getAllReportsEmployeeIDs(u));
        }, this);
        reports.push(empID);
        return reports;
    },
    getDirectReportEmployeeIDs: function(empID){
        var reports = this.usersByManager[empID] || [],
            employeeIDField = this.employeeIDField;

        if (reports.length > 0){
            return _.map(reports, function(u){ return u.get(employeeIDField); });
        }
        return reports;
    },
    getRoot: function(managerID){
        var root = Ext.create('CArABU.technicalservices.UserTaskSummaryModel');
        root.set("Owner",this.usersByID[managerID].get('_refObjectName'));
        root.set("children", this.getDirectReportEmployeeIDs())



    }
});
