'use strict';

var lst = angular.module('stoffListeApp');

lst.factory('listSDB', function($q, $http, pouchdb) {
    var db = pouchdb.create('stofflistendb');
    // db.replicate.from('http://127.0.0.1:5984/stofflistendb'); //, {live: true});
    db.replicate.from('http://192.168.0.11:5984/stofflistendb'); //, {live: true});
    // db.replicate.to('stofflistendb'); //, {live: true});
    


    var getCloths = function() {
        var deferred = $q.defer();

        db.query('view/conflicts',
                 function (err, data) {
                     console.log('starten to view conflicts');
                     if (data) {
                         if (data.rows.length > 0) {
                             for(var i=0;i<data.rows.length;i++) {
                                 var inner = data.rows[i];
                                 db.get(inner.id).then(
                                     function (confdata) {
                                         db.remove(inner.id,
                                                   confdata._rev).then(
                                                       function (resp) { console.log('conflicting data removed: '+resp); });
                                         db.put(confdata,
                                                inner.id,
                                                inner.key[0]
                                               );
                                     });
                             }
                             // db.replicate.from('stofflistendb');
                             // db.replicate.to('http://192.168.0.11:5984/stofflistendb');
                             console.log('replicated fixed conflicts');
                         }
                         console.log('no conflicts found');
                     }
                 });
        db.query('view/all',
            {include_docs: true},
            function(err, data) {
                if (err) { console.log('error: '+err); }
                else     { deferred.resolve(data.rows); }
            });
        return deferred.promise;
    };
    
    return {
        getCloths: getCloths
    };


});

lst.controller('ListCtrl', function ($scope, $http, listSDB) {
    listSDB.getCloths().then(function (cloths) {
        $scope.cloths = cloths;

    });

    $scope.$parent.isopen = ($scope.$parent.default === $scope.cloth);
    
    $scope.$watch('isopen', function (newvalue, oldvalue, scope) {
        $scope.$parent.isopen = newvalue;
    });

});
