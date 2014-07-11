'use strict';

var shw = angular.module('stoffListeApp');

shw.factory('showSDB', function($q, $http, pouchdb) {
    var db = pouchdb.create('stofflistendb');
    // var db = db.destroy('stofflistendb');
    // db.create('stofflistendb');

    // db.replicate.from('http://127.0.0.1:5984/stofflistendb'); //, {live: true});
    db.replicate.from('http://192.168.0.11:5984/stofflistendb'); //, {live: true});
    // db.replicate.to('stofflistendb'); //, {live: true});
    
    var factory = {};

    factory.getCloth = function(id) {
        var deferred = $q.defer();

        db.get(id,
               function(err, data) {
                   if (err) { console.error(err); }
                   else     { deferred.resolve(data); }
               });

        return deferred.promise;
    };
    
    factory.deleteCloth = function (id) {
        var deferred = $q.defer();
        db.get(id, function(err, doc) {
            db.remove(doc, function(err, response) {
                if (err) { alert ('error: '+err); }
                else {
                    db.replicate.from('stofflistendb'); //, {live: true});
                    // db.replicate.to('http://192.168.0.11:5984/stofflistendb'); //, {live: true});
                    // db.replicate.to('http://127.0.0.1:5984/stofflistendb'); //, {live: true});
                    alert('Stoff ('+id+') removed');}
            });
            // or:
            // db.remove(doc._id, doc._rev, function(err, response) { });
        });
        return deferred.promise;
    };



    return { factory: factory };
    //     getCloth: getCloth
    // };
});



shw.controller('ShowCtrl', function ($scope, $routeParams, showSDB) {
    var actualId = $routeParams.id;
    
    if ($routeParams.id) { actualId = $routeParams.id; }
    else                 { actualId = $scope.cloth.id; }

    $scope.$parent.islocked = ($scope.$parent.default === $scope.cloth);

    $scope.$watch('islocked', function (newvalue, oldvalue, scope) {
        $scope.$parent.islocked = newvalue;
    });

    showSDB.factory.getCloth(actualId).then(function (cloth) {
        $scope.acloth = cloth;
        $scope.actualId = actualId;
    });

//    var isImage = (cloth._attachments ? true : false);
    
    $scope.deleteCloth = function () {
        showSDB.factory.deleteCloth(actualId);
    };
});
