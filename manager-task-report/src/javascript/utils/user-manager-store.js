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

        this._loadUserModel().then({
            success: function(model){
                if (this._validateFields(model)){

                    this._loadManagers().then({
                        success: function(managers){
                            this.fireEvent('ready', managers);
                        },
                        failure: function(msg){
                            this.fireEvent('loaderror', msg);
                        },
                        scope: this
                    });
                }
            },
            scope: this
        });
    },
    _loadManagers: function(){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
            model: 'User',
            fetch: ['ObjectID','UserName','Email','First Name','Last Name','DisplayName'].concat([this.employeeIDField, this.managerIDField, this.isManagerField]),
            filters: this._getAllManagerFilters(),
            limit: Infinity
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                }  else {
                    deferred.reject("Error loading managers: " + operation.error.errors.join(','));
                }
            }
        });
        return deferred;
    },
    _getAllManagerFilters: function(){
        return [{
            property: this.employeeIDField,
            operator: "!=",
            value: ""
        },{
            property: this.isManagerField,
            value: 'Y'
        }];
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

    buildManagerTree: function(managerId, records){
        this.logger.log('buildManagerTree', this.managerEmployeeIDField, this.employeeIDField);
        var managerTree = Ext.create('CArABU.technicalservices.UserTree',{
            root: managerId,
            users: records,
            managerIDField: this.managerEmployeeIDField,
            employeeIDField: this.employeeIDField
        });
        this.logger.log('buildManagerTree managerTree', managerTree);
        return managerTree;
    }
});
