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
        putAttachment: function(filename, file, cloth) {
            var deferred = $q.defer();
            
            myPouch.get(cloth._id, function(err, otherDoc) {
                myPouch.putAttachment(otherDoc._id, filename, otherDoc._rev, file, 'image/png', function(err, res) {
                    $rootScope.$apply(function() {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
            });
            // myPouch.put(rid, name, rev, doc, type, );
            return deferred.promise;
        },
        remove: function(cloth) {
            var query_fn = function(doc, emit) {
                if(doc._id === cloth._id) { 
                    emit(doc._id, doc._rev);
                }
            };

            var deferred = $q.defer();
            myPouch.query(query_fn, function (err, doc) {
                if (doc) {
                    myPouch.remove(doc.rows[0].key, doc.rows[0].value, function(err, res) {
                        $rootScope.$apply(function() {
                            if (err) {
                                deferred.reject(err);
                            } else {
                                $rootScope.$broadcat('delCloth', cloth);
                                deferred.resolve(res);
                            }
                        });
                    }); 
                }
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
                console.log('change.id: '+change.id);
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
    $scope.edit=true;
    $scope.predicate = 'id';

    $scope.submit = function () {
        $scope.$emit('addCloth', $scope.cloth);
    };

    $scope.temp = false;
    $scope.addMetrage = function () {
        $scope.temp = false;
        $scope.additionalMetrage = {
            uselength: '',
            width: ''
        };
    };

    $scope.delMetrage = function (metrage) {
        $scope.cloth.metrage.splice($scope.cloth.metrage.indexOf(metrage),1);
    };

    $scope.addTemp = function() {
        if($scope.temp) { $scope.cloth.metrage.pop(); }
        else { if($scope.additionalMetrage) { $scope.temp = true; }}
        
        if($scope.additionalMetrage) {$scope.cloth.metrage.push($scope.additionalMetrage);}
        else {$scope.temp = false;}
    };

    $scope.isTemp = function(i){
        return i===$scope.cloth.metrage.length-1 && $scope.temp;
    };









    $scope.remove = function (cloth) {
        console.log('remove cloth.id: '+cloth.id);
        pouchWrapper.remove(cloth).then(function(res) {
            console.log('res: '+res);
            $scope.getNextId();
        }, function(reason) {
            console.log('reason: '+reason);
        });
    };

    $scope.update = function () {
        $scope.$emit('updateCloth', $scope.cloth);
    };

    $scope.getCloth = function () {
        pouchWrapper.getCloth($routeParams.docId).then(function(res, value) {
            $scope.cloth = res.value;
        });
    };

    $scope.allCloths = function () {
        $scope.cloths = [];
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
        var isin = false;
        for(var i=0;i<$scope.cloths.length;i++) {
            if (cloth.id === $scope.cloths[i].id) {isin = true;}
        }
        if (!isin) { 
            $scope.cloths.push(cloth); 
        }
        $scope.getNextId();
        console.log('new: '+cloth.id);
    });

    $scope.$on('addCloth', function(event, cloth) {
        event.preventDefault();
        $scope.getNextId();
        cloth.id = $scope.nextId;
        console.log('adding: '+cloth.id);
        pouchWrapper.add(cloth).then(function (err, res) {
            if (err) { console.log(err); }
            else { console.log(res); }
        });
        console.log('add: '+cloth);
    });

    $scope.$on('updateCloth', function(event, cloth) {
        event.preventDefault();
        $scope.getNextId();
        pouchWrapper.update(cloth);
        console.log('updated: '+cloth);
    });

    $scope.$on('delCloth', function(event, clothid) {
        for (var i = 0; i<$scope.cloths.length; i++) {
            if ($scope.cloths[i]._id === clothid) {
                $scope.cloths.splice(i,1);
            }
        }
        $scope.getNextId();
        console.log('del: '+clothid);
    });

    $scope.getNextId = function () {
        var size = 4;
        var max = 0;
        for(var i = 0; i < $scope.cloths.length; i++) {
            var id = $scope.cloths[i].id;
            max = Math.max(parseInt(id.substring(id.length-4)), max); 
        } 
        var s = (max+1)+'';
        while (s.length < size) {s = '0' + s;}

        $scope.nextId = s;
    };

    $scope.toggleSOpen = function () { 
        if ($scope.newSopen) { $scope.newSopen = false; }
        else { $scope.newSopen = true; }
    };

    $scope.toggleOpen = function () { 
        console.log('toggle');
        if ($scope.isopen) { $scope.isopen = false; }
        else { $scope.isopen = true; }
    };

    $scope.toggleEdit = function () { 
        console.log('toggle edit: '+$scope.edit);
        if ($scope.edit) { $scope.edit = false; }
        else { $scope.edit = true; }
    };
}]);
