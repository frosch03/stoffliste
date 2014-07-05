'use strict';

var shw = angular.module('stoffListeApp');

shw.factory('showSDB', function($q, $http, pouchdb) {
    var db = pouchdb.create('stofflistendb');
    db.replicate.from('http://127.0.0.1:5984/stofflistendb', {live: true});
    db.replicate.to('stofflistendb', {live: true});
    
    var getCloth = function(id) {
        var deferred = $q.defer();

        db.get(id,
               function(err, data) {
                   if (err) { console.error(err); }
                   else     { deferred.resolve(data); }
               });

        return deferred.promise;
    };
    
    return {
        getCloth: getCloth
    };
});



shw.controller('ShowCtrl', function ($scope, $routeParams, showSDB) {
    $scope.awesomeThings = [
        'HTML5 Boilerplate',
        'AngularJS',
        'Karma'
    ];
    
    // $scope.actualId = $scope.cloth.id;
    var actualId = $routeParams.id;
    if ($routeParams.id) { actualId = $routeParams.id; }
    else { actualId = $scope.cloth.id; }


    showSDB.getCloth(actualId).then(function (cloth) {
        $scope.acloth = cloth;
    });


});
