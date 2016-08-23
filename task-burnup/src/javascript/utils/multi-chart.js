/**
 * A class for displaying toggle or multiple charts that use the same data.
 */
Ext.define('CArABU.technicalservices.MultiChartContainer', {
    extend: 'Rally.ui.chart.Chart',
    alias: 'widget.multichartcontainer',
    mixins: ['Rally.app.Scopeable'],

    items: [
        {
            xtype: 'container',
            itemId: 'header',
            cls: 'header'
        },
        {
            xtype: 'container',
            itemId: 'chart',
            cls: 'chart',
            layout: 'fit',
            flex: 1
        }
    ]
});