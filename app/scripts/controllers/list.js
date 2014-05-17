'use strict';

var lst = angular.module('stoffListeApp');

lst.factory('sdb', function($q, $http, pouchdb) {
    var db = pouchdb.create('stofflistendb');
    db.replicate.from('http://127.0.0.1:5984/stofflistendb', {live: true});
    db.replicate.to('stofflistendb', {live: true});
    
    var getCloths = function() {
        var deferred = $q.defer();

        db.allDocs(
            {include_docs: true},
            function(err, data) {
                if (err) { console.error(err); }
                else     { deferred.resolve(data.rows); }
            });

        return deferred.promise;
    };
    
    return {
        getCloths: getCloths
    };
});

lst.controller('ListCtrl', function ($scope, $http, sdb) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    
    $scope.blub = 'hello';
    sdb.getCloths().then(function (cloths) {
        $scope.cloths = cloths;
    });
    $scope.blub = 'hello';

});
