'use strict';

var main = angular.module('stoffListeApp');

main.directive('blob', function(){
    return {
        scope: {
            blob: '='
        },
        link: function(scope, el, attrs){
            el.bind('change', function(event){
                var files = event.target.files;
                var file = files[0];
                if (file) {
                    var blob = new Blob([file], {type: 'image/png'});
                    scope.blob = blob;
                    scope.$apply();
                }
            });
        }
    };
});


main.factory('mainSDB', function($q, $http, pouchdb) {
    var db      = pouchdb.create('stofflistendb');
    db.replicate.from('stofflistendb', {continous: true});
    db.replicate.to('http://192.168.0.11:5984/stofflistendb', {continous: true});

    var factory = {};

    factory.push = function () {
        var deferred = $q.defer();
        // db.replicate.from('stofflistendb');
        // db.replicate.to('http://192.168.0.11:5984/stofflistendb');
        db.query('view/conflicts',
                function (err, data) {
                    if (data) {
                        if (data.rows.length > 0) {
                            for(var i=0;i<data.rows.length;i++) {
                                db.get(data.rows[i].id).then(
                                    function (confdata) {
                                        db.remove(data.rows[i].id,
                                                  confdata._rev).then(
                                                      function (resp) { console.log('conflicting data removed: '+resp); });
                                        db.put(confdata,
                                               data.rows[i].id,
                                               data.rows[i].key[0]
                                              );
                                    });
                            }
                            //db.replicate.from('stofflistendb');
                            // db.replicate.to('http://192.168.0.11:5984/stofflistendb');
                            console.log('replicated fixed conflicts');
                        }
                        console.log('no conflicts found');
                    }
                });
        return deferred.promise;
    };

    factory.pull = function () {
        var deferred = $q.defer();
        // db.replicate.from('http://192.168.0.11:5984/stofflistendb');// .on('complete', function () {
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
        //});
        return deferred.promise;
    };

    factory.del = function () {
        var deferred = $q.defer();
        db.destroy('stofflistendb');
        console.log('stofflistendb destroyed');
        return deferred.promise;
    };

    factory.getNextId = function($scope) {
        var deferred = $q.defer();
        db.query('view/nextid',
                 function(err, data) {
                     if (err) { 
                         console.log('error: '+err); 
                     } 
                     else {
                         if (data.rows.length > 0) {
                             //$scope.nextId = data.rows[0].value;
                             return deferred.resolve(data.rows[0].value); 
                         } else { 
                             //$scope.nextId = 'OS0001';
                             return deferred.resolve('OS0001'); 
                         }
                     }
                 });
        return deferred.promise;
    };
    
    factory.createCloth = function($scope) {
        var deferred = $q.defer();
        if ($scope.nextId === $scope.cloth.id) {
            db.get($scope.nextId, function (err, otherDoc) {
                db.put({
                    _id:    $scope.nextId, 
                    width:  $scope.cloth.width,
                    length: $scope.cloth.length,
                    color:  $scope.cloth.color,
                    ingredients: $scope.cloth.ingredients
                });
            }).then(function () {
                db.get($scope.nextId, function(err, otherDoc) {
                    db.putAttachment($scope.nextId, 
                                     'image',
                                     otherDoc._rev,
                                     $scope.cloth.blob,
                                     'image/png',
                                     function (err, resp) {
                                         if (err) { console.error('error: ' + err); }
                                         else { 
                                             if (resp) { console.log('resp: ' + resp); }
                                             else { console.log('hääää??'); }
                                         }
                                     });
                    });
            }).then(function ($scope) {
                factory.push();
            });
        } else { 
            alert('ID mismatch: ('+$scope.cloth.id + '!=' + $scope.nextId+')');
        }
        return deferred.promise;
    };
    
    return { factory : factory};
});

main.controller('MainCtrl', function ($scope, $http, $location, mainSDB) {

    if (!$scope.nextId) {
        mainSDB.factory.getNextId($scope).then(
            function (nextid) {
                $scope.nextId = nextid;
                console.log('nextId: '+nextid);
            });
    }

    var createCloth = function () {
        mainSDB.factory.createCloth($scope).then(
            function () {
                $scope.imgurl = URL.getObjectURL($scope.parent.cloth.blob);
            });
        $location.path('/list');
    };

    $scope.createCloth = createCloth;

    $scope.push = function () {
        mainSDB.factory.push();
    };

    $scope.pull = function () {
        mainSDB.factory.pull();
    };

    $scope.del = function () {
        mainSDB.factory.del();
    };
});
