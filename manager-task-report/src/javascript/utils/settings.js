Ext.define('CArABU.technicalservices.ManagerTaskReport.Settings',{
    singleton: true,
    getFields: function(){
        var width = 400,
            labelWidth = 200;

        var isNotHidden = function(field){
            return field.custom && field.attributeDefinition && field.attributeDefinition.AttributeType === "STRING";
        };

        return [{
                xtype: 'rallyfieldcombobox',
                fieldLabel: 'Is Manager Field',
                labelAlign: 'right',
                name: 'isManagerField',
                model: 'User',
                width: width,
                labelWidth: labelWidth,
            _isNotHidden: isNotHidden
            },{
                xtype: 'rallyfieldcombobox',
                fieldLabel: 'Manager Employee ID Field',
                labelAlign: 'right',
                name: 'managerEmployeeIDField',
                model: 'User',
                width: width,
                labelWidth: labelWidth,
            _isNotHidden: isNotHidden
            },{
                xtype: 'rallyfieldcombobox',
                fieldLabel: 'Employee ID Field',
                labelAlign: 'right',
                name: 'employeeIDField',
                model: 'User',
                width: width,
                labelWidth: labelWidth,
                _isNotHidden: isNotHidden
        },{
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Show Historical Data',
            labelAlign: 'right',
            labelWidth: labelWidth,
            name: 'showHistoricalData'
        }];
    }
});
