Ext.define('CArABU.technicalservices.Utility',{
    singleton: true,
    MAX_CHUNK_SIZE: 25,
    fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        config.limit = 'Infinity';

        Ext.create('Rally.data.wsapi.Store',config).load({
            callback: function(records, operation, success){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    var msg = Ext.String.format("Error fetching features: {0}", operation.error.errors.join(','));
                    deferred.reject(msg);
                }
            }
        });
        return deferred;
    },
    fetchChunkedWsapiRecords: function(config,objectIDs){
        var deferred = Ext.create('Deft.Deferred');
        var promises = [];
        for (var i=0; i < objectIDs.length; i = i + CArABU.technicalservices.Utility.MAX_CHUNK_SIZE){
            var chunk = Ext.Array.slice(objectIDs, i, i + CArABU.technicalservices.Utility.MAX_CHUNK_SIZE);
            promises.push(CArABU.technicalservices.Utility.fetchWsapiChunk(chunk, config));
        }
        Deft.Promise.all(promises).then({
            success: function(results){
                var records = _.flatten(results);
                deferred.resolve(records);
            },
            failure: function(msg){
                deferred.reject(msg);
            },
            scope: this
        });
        return deferred;
    },
    fetchWsapiChunk: function(chunk, config){
        var filters = _.map(chunk, function(c){ return {property: 'ObjectID', value: c}; });
        filters = Rally.data.wsapi.Filter.or(filters);

        config.filters = filters;

        return CArABU.technicalservices.Utility.fetchWsapiRecords(config);
    }

});
