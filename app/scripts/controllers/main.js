'use strict';

var main = angular.module('stoffListeApp');

main.factory('myPouch', [function() {

  var mydb = new PouchDB('stofflistendb');
  console.log('db created');
  PouchDB.replicate('stofflistendb', 'http://127.0.0.1:5984/stofflistendb', {continuous: true});
  PouchDB.replicate('http://127.0.0.1:5984/stofflistendb', 'stofflistendb', {continuous: true});
  return mydb;

}]);

main.factory('pouchWrapper', ['$q', '$rootScope', 'myPouch', function($q, $rootScope, myPouch) {

    return {
        add: function(id, width, length, color, ingredients) {
            var deferred = $q.defer();
            var doc = {
                _id:         id,
                width:       width,
                length:      length,
                color:       color,
                ingredients: ingredients
            };
            myPouch.post(doc, function(err, res) {
                $rootScope.$apply(function() {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(res);
                    }
                });
            });
            return deferred.promise;
        },
        allCloths: function() {
            var deferred = $q.defer();
            myPouch.query('view/all', function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(doc.rows);
                }
            });
            return deferred.promise;
        },
        nextId: function() {
            var deferred = $q.defer();
            myPouch.query('view/nextid', function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(doc.rows[0].value);
                }
            });
            return deferred.promise;
        },
        remove: function(id) {
            var deferred = $q.defer();
            myPouch.get(id, function(err, doc) {
                $rootScope.$apply(function() {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        myPouch.remove(doc, function(err, res) {
                            $rootScope.$apply(function() {
                                if (err) {
                                    deferred.reject(err);
                                } else {
                                    deferred.resolve(res);
                                }
                            });
                        });
                    }
                });
            });
            return deferred.promise;
        }
    };

}]);

main.factory('listener', ['$rootScope', 'myPouch', function($rootScope, myPouch) {

    myPouch.changes({
        continuous: true,
        onChange: function(change) {
            if (!change.deleted) {
                $rootScope.$apply(function() {
                    myPouch.get(change.id, function(err, doc) {
                        $rootScope.$apply(function() {
                            if (err) { console.log(err); }
                            $rootScope.$broadcast('newCloth', doc);
                        });
                    });
                });
            } else {
                $rootScope.$apply(function() {
                    $rootScope.$broadcast('delCloth', change.id);
                });
            }
        }
    });
}]);


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



main.controller('MainCtrl', ['$scope', 'listener', 'pouchWrapper', function ($scope, listener, pouchWrapper) {

    // if (!$scope.nextId) {
    //     mainSDB.factory.getNextId($scope).then(
    //         function (nextid) {
    //             $scope.nextId = nextid;
    //             console.log('nextId: '+nextid);
    //         });
    // }

    // var createCloth = function () {
    //     mainSDB.factory.createCloth($scope).then(
    //         function () {
    //             $scope.imgurl = URL.getObjectURL($scope.parent.cloth.blob);
    //         });
    //     $location.path('/list');
    // };

    $scope.submit = function () {
        pouchWrapper.add(
            $scope.cloth.id, 
            $scope.cloth.width, 
            $scope.cloth.length, 
            $scope.cloth.color, 
            $scope.cloth.ingredients).then(function(res) {
                $scope.cloth.id = '';
                $scope.cloth.width = '';
                $scope.cloth.length = '';
                $scope.cloth.color = '';
                $scope.cloth.ingredients = '';
                $scope.getNextId();
            }, function(reason) {
                console.log(reason);
            });
    };

    $scope.remove = function (id) {
        pouchWrapper.remove(id).then(function(res) {
            console.log(res);
        }, function(reason) {
            console.log(reason);
        });
    };

    $scope.allCloths = function () {
        pouchWrapper.allCloths().then(function(res, value) {
            for (var i=0;i<res.length;i++){
                $scope.cloths.push(res[i].value);
            }
        });
    };

    $scope.cloths = [];
    $scope.allCloths();

    $scope.$on('newCloth', function(event, cloth) {
        if (cloth._id.substr(0,2) === 'OS') {
            $scope.cloths.push(cloth);
        }
    });

    $scope.$on('delCloth', function(event, id) {
        for (var i = 0; i<$scope.cloths.length; i++) {
            if ($scope.cloths[i]._id === id) {
                $scope.cloths.splice(i,1);
            }
        }
    });

    $scope.getNextId = function () {
        console.log('getting nextId');
        pouchWrapper.nextId().then(function(nextid, value) {
            $scope.nextId = nextid;
        });
    };

    $scope.getNextId();

}]);
