Ext.define('CArABU.technicalservices.StandaloneFilter',{
    extend: 'Ext.container.Container',
    alias: 'widget.standalonefilter',
    mixins: [
        'Rally.ui.gridboard.plugin.GridBoardControlShowable'
    ],

    layout: {
        type: 'auto'
    },

    items: [
        {
            itemId: 'header',
            xtype: 'rallyleftright',
           // padding: '4 10',
            overflowX: 'hidden',
            items: [
                {
                    itemId: 'left',
                    cls: 'rly-left'
                },
                {
                    itemId: 'right',
                    cls: 'rly-left'
                },
                {
                    itemId: 'rightright',
                    cls: 'rly-left'
                }
            ],
            cls: 'rui-leftright'
        }
    ],


    initComponent: function(){

        this.plugins = [{
            ptype: 'rallygridboardinlinefiltercontrol',
            headerPosition: 'right',
            inlineFilterButtonConfig: {
                modelNames: ['PortfolioItem/Feature'],

                inlineFilterPanelConfig: {
                    collapsed: false,
                    quickFilterPanelConfig: {
                        fieldNames: ['Owner', 'Milestones']
                    }
                }
            }
        }];

        this.callParent(arguments);


    },
    getHeader: function(){
        return this.down('#header');
    },
    getLeft: function(){
        return this.down('#left');
    },
    getRight: function(){
        return this.down('#rightright'); //this.down('#right');
    },
    getToggleState: function(){
        return 'grid';
    },
    getContext: function(){
        return this.context;
    },
    getCustomFilter: function(){
        if (this.customFilter && this.customFilter.length > 0){
            return this.customFilter[0];
        }
        return null;
    },
    applyCustomFilter: function(filterObj){
        this.customFilter = filterObj && filterObj.filters;
    }
});