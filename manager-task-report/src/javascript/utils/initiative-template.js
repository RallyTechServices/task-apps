Ext.define('CArABU.technicalservices.InitiativeTemplate',{
    extend: 'Ext.XTemplate',

    constructor: function(config) {
        var templateConfig = [
            '<tpl if="this.getParent(values)">{[this.createDetailUrl(values)]}</tpl>',
            {
                getParent:function (recordData) {
                    return recordData && recordData.Feature && recordData.Feature.Parent
                },
                createDetailUrl:function (recordData) {
                    var parent = this.getParent(recordData);
                    return Rally.util.DetailLink.getLink({
                            record: parent,
                            showHover: !!this.showHover,
                            text: parent.FormattedID
                        }) + ': ' + parent._refObjectName;
                }
            }
        ];

        return this.callParent(templateConfig);
    }
});