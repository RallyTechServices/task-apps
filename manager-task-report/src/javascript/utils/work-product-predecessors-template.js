/**
 * Copied the Rally PredecessorsAndSuccessorsStatusTemplate and adjusted for PredecessorsAndSuccessors property not populating as expected.
 * Also added some modifications to the template
 */
Ext.define('CArABU.technicalservices.PredecessorsAndSuccessorsStatusTemplate', {
    extend: 'Rally.ui.renderer.template.status.StatusTemplate',

    inheritableStatics: {
        onClick: function(event, ref) {
            Rally.ui.renderer.template.status.StatusTemplate.onClick(event, ref, {
                field: 'PredecessorsAndSuccessors'
            });
        }
    },

    constructor: function() {
        this.callParent([
            '<tpl if="this._getDependenciesCount(values) &gt; 0">',
            '<a onclick="{[this._getOnClick(values)]}">',
            '<div class="icon-predecessor"></div><span class="dependency-link predecessorsandsuccessors-cnt">{[this._getDependenciesCount(values)]}</span>',
            '</a>',
            '</tpl>'
        ]);
    },

    _getDependenciesCount: function (recordData) {
        return recordData.Predecessors.Count + recordData.Successors.Count;
    },

    _getOnClick: function(recordData) {
        return 'Rally.ui.renderer.template.status.PredecessorsAndSuccessorsStatusTemplate.onClick(event, \'' + recordData.Predecessors._ref + '\'); return false;';
    }
});
