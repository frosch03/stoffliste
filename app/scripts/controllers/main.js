'use strict';

var main = angular.module('stoffListeApp');

main.factory('myPouch', [function() {

  var mydb = new PouchDB('stoffliste');
  PouchDB.replicate('stoffliste', 'http://192.168.0.14:5984/stoffliste', {continuous: true});
  PouchDB.replicate('http://192.168.0.14:5984/stoffliste', 'stoffliste', {continuous: true});
  return mydb;

}]);

main.factory('pouchWrapper', ['$q', '$rootScope', '$routeParams', 'myPouch', function($q, $rootScope, $routeParams, myPouch) {

    return {
        add: function(cloth) {
            var deferred = $q.defer();
            myPouch.post(cloth, function(err, res) {
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
        update: function(cloth) {
            var deferred = $q.defer();
            myPouch.query(function(doc, emit) {
                if(doc.id === cloth.id) { 
                    emit(doc.id, doc);
                }
            }, function(err, doc) {
                if (err) {
                    deferred.reject(err);
                } else {
                    myPouch.put(cloth, doc._id, doc._rev, function (err, res) {
                        if (err) {
                            deferred.reject(err);
                        } else { 
                            deferred.resolve(res);
                        }
                    });
                }
            });
            return deferred.promise;
        },
        getCloth: function() {
            var deferred = $q.defer();
            myPouch.query(function(doc, emit) {
                if(doc.id === $routeParams.docId) { 
                    emit(doc.id, doc);
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
                if(doc.id) { 
                    emit(doc.id, doc);
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
                if(doc.id && !doc._deleted_conflicts && !doc._conflicts) {
                    var reg = new RegExp(/[A-Z]*([0-9]*)/);
                    var res = reg.exec(doc.id);
                    emit(doc.id, parseInt(res[1]));
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
            myPouch.query(function(doc, emit) {
                if(doc.id === id) { 
                    emit(doc._id, doc._rev);
                }
            }, function (err, doc) {
                myPouch.remove(doc.rows[0].key, doc.rows[0].value, function(err, res) {
                    $rootScope.$apply(function() {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            $rootScope.$broadcast('delCloth', id);
                            deferred.resolve(res);
                        }
                    });
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
        pouchWrapper.add($scope.cloth).then(function(res) {
                $scope.cloth = {
                    id: '',
                    width: '',
                    length: '',
                    color: '',
                    ingredients: ''
                };
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
            $scope.getNextId();
        }, function(reason) {
            console.log(reason);
        });
    };

    $scope.update = function () {
        pouchWrapper.update($scope.cloth);// .then(function(res, value) {
        //     // $scope.cloth.filter(function (doc) {
        //     //     return doc.id !== res.value.id;
        //     // }).push(res.value);
        // });
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

    $scope.refresh = function () {
        $scope.cloths = [];
        $scope.allCloths(); 
    };

    $scope.newmetrage = function () {
        console.log($scope.inputForm);
        $scope.inputForm.metrages.push({});
    };

    $scope.cloths = [];
    if ($routeParams.docId) { $scope.getCloth(); }
    if (!$routeParams.docId && !$scope.cloths) { $scope.allCloths(); }

    $scope.$on('newCloth', function(event, cloth) {
        $scope.cloths.push(cloth);
    });

    $scope.$on('addCloth', function(event, cloth) {
        event.preventDefault();
        console.log('new Cloth received');
        pouchWrapper.add(cloth);
        $scope.cloths.push(cloth);
    });

    $scope.$on('delCloth', function(event, id) {
        for (var i = 0; i<$scope.cloths.length; i++) {
            if ($scope.cloths[i].id === id) {
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
        if ($scope.newSopen) { $scope.newSopen = false; }
        else { $scope.newSopen = true; }
    };

    $scope.toggleOpen = function () { 
        console.log('toggle');
        if ($scope.isopen) { $scope.isopen = false; }
        else { $scope.isopen = true; }
    };
}]);
