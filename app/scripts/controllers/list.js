'use strict';

var lst = angular.module('stoffListeApp');

lst.factory('sdb', function($http, pouchdb) {
        var service = {};
        var db = pouchdb.create('stofflistendb');
        db.replicate.from('http://127.0.0.1:5984/stofflistendb', {live: true});
        db.replicate.to('stofflistendb', {live: true});
      
        var allDocs = db.allDocs({include_docs: true}, 
                   function(err, data) {
                       if (err) { 
                           console.error(err); 
                           console.log('>>error<<'); 
                       } else { 
                           console.log(data); 
                           console.log('>>success<<'); 
                           return data.rows;
                       }
                   });

        service.getCloths = function () {
            return allDocs;
        };

        return service;
    });

lst.controller('ListCtrl', function ($scope, $http, sdb) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];


      $scope.blub = "hello";
      $scope.cloths = sdb.getCloths;
      $scope.blub = "hello";



      // db.info(function(err, info) {
      //     db.changes({
      //         since: info.update_seq,
      //         live: true
      //     }).on('change', showTodos);
      // });

  });
