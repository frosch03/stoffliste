'use strict';

var lst = angular.module('stoffListeApp');

lst.factory('listSDB', function($q, $http, pouchdb) {
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

lst.controller('ListCtrl', function ($scope, $http, listSDB) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    
    listSDB.getCloths().then(function (cloths) {
        $scope.cloths = cloths;

    });

    $scope.$parent.isopen = ($scope.$parent.default === $scope.cloth);
    
    $scope.$watch('isopen', function (newvalue, oldvalue, scope) {
        $scope.$parent.isopen = newvalue;
    });

});
