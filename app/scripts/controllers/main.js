'use strict';

var main = angular.module('stoffListeApp');

main.factory('myPouch', [function() {

  var mydb = new PouchDB('stoffliste');
  PouchDB.replicate('stoffliste', 'http://192.168.0.11:5984/stoffliste', {continuous: true});
  PouchDB.replicate('http://192.168.0.11:5984/stoffliste', 'stoffliste', {continuous: true});
  return mydb;

}]);

main.factory('pouchWrapper', ['$q', '$rootScope', '$routeParams', 'myPouch', function($q, $rootScope, $routeParams, myPouch) {

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
        getCloth: function() {
            var deferred = $q.defer();
            myPouch.query(function(doc, emit) {
                if(doc._id === $routeParams.docId) { 
                    emit(doc._id, doc);
                }
            }, function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(doc.rows[0]);
                }
            });
            return deferred.promise;
        },
        allCloths: function() {
            var map = function(doc, emit) {
                if(doc._id) { 
                    emit(doc._id, doc);
                }
            };
            var deferred = $q.defer();
            myPouch.query(map, function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(doc.rows);
                }
            });
            return deferred.promise;
        },
        nextId: function() {
            var map = function(doc, emit) {
                if(doc._id && !doc._deleted_conflicts && !doc._conflicts) {
                    var reg = new RegExp(/[A-Z]*([0-9]*)/);
                    var res = reg.exec(doc._id);
                    emit(doc._id, parseInt(res[1]));
                }
            };
            var reduce = function (key, values, rereduce) {
                var size=4;
                var max = 0;
                for(var i = 0; i < values.length; i++) {
                    if(typeof values[i] === 'number') {
                        max = Math.max(values[i], max); } }

                var s = (max+1)+'';
                while (s.length < size) {s = '0' + s;}

                return('OS'+s);
            };
            var deferred = $q.defer();
            myPouch.query({map: map, reduce: reduce}, function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(doc.rows[0].value);
                }
            });
            return deferred.promise;
        },
        putAttachment: function(rid, name, rev, doc, type) {
            var deferred = $q.defer();
            
            myPouch.get(rid, function(err, otherDoc) {
                myPouch.putAttachment(rid, name, otherDoc._rev, otherDoc.doc + doc, type, function(err, res) {
                    $rootScope.$apply(function() {
                        if (err) {
                            console.log('error: ' +err);
                            deferred.reject(err);
                        } else {
                            console.log('res: ' +res);
                            deferred.resolve(res);
                        }
                    });
                });
            });
            // myPouch.put(rid, name, rev, doc, type, );
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



main.controller('MainCtrl', ['$scope', 'listener', 'pouchWrapper', '$routeParams', function ($scope, listener, pouchWrapper, $routeParams) {

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
                // if (res && res.ok) {
                //     if (metaForm.attachment.files.length) {
                //         var reader = new FileReader();
                //         reader.onload = (function(file) {
                //             return function(e) {
                //                 console.log('e.target.result: '+e.target.result);
                //                 pouchWrapper.putAttachment(res.id, 'attachment', res.rev, e.target.result, file.type);
                //             };
                //         })(metaForm.attachment.files.item(0));
                //         reader.readAsDataURL(metaForm.attachment.files.item(0));
                //     }
                // }
            }, function(reason) {
                console.log(reason);
            });
    };

    $scope.remove = function (id) {
        pouchWrapper.remove(id).then(function(res) {
            console.log(res);
            $scope.cloths.filter(function (doc) {
                return doc._id !== id;
            })
            $scope.getNextId();
        }, function(reason) {
            console.log(reason);
        });
    };

    $scope.getCloth = function () {
        pouchWrapper.getCloth($routeParams.docId).then(function(res, value) {
            $scope.cloth = res.value;
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
    if ($routeParams.docId) { $scope.getCloth(); }
    if (!$routeParams.docId && !$scope.cloths) { $scope.allCloths(); }

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
        pouchWrapper.nextId().then(function(nextid, value) {
            $scope.nextId = nextid;
        });
    };

    $scope.getNextId();

    $scope.toggleSOpen = function () { 
        if ($parent.newSopen) { $parent.newSopen = false; }
        else { $parent.newSopen = true; }
    };

    $scope.toggleOpen = function () { 
        if ($parent.isopen) { $parent.isopen = false; }
        else { $parent.isopen = true; }
    };

}]);
