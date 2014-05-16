'use strict';

angular.module('stoffListeApp')
    // .factory('sdb', [function($http, pouchdb) {
    //     var db = pouchdb.create('http://frosch03:hallo123@127.0.0.1:5984/stofflistendb');
    //     // var sdb = pouchdb.create('stoffdb');
    //     // var sdb = pouchdb.create('http://frosch03:hallo123@127.0.0.1:5984/stofflistendb');
    //     // sdb.replicate('stoffdb', 'http://frosch03:hallo123@127.0.0.1:5984/stofflistendb', {continuous: true});
    //     // sdb.replicate('http://frosch03:hallo123@127.0.0.1:5984/stofflistendb', 'stoffdb', {continuous: true});
    //     return db;
    // }])
    .controller('MainCtrl', function ($scope, $http, pouchdb) {
        $scope.awesomeThings = [
            'HTML5 Boilerplate',
            'AngularJS',
            'Karma'
        ];
        
        $scope.cloth = {
                id : 'OS0001',
                width : '1,50',
                length : '2',
                color : 'grün',
                ingredients : 'baumwolle'
        };

        var db = pouchdb.create('stofflistendb');
        db.replicate.to('http://127.0.0.1:5984/stofflistendb', {live: true});//, 'stofflistendb');
        // var dbRemote = pouchdb.create('http://frosch03:hallo123@127.0.0.1:5984/stofflistendb');

        $scope.createCloth = function () {
            db.put({
                _id: $scope.cloth.id,
                width: $scope.cloth.width,
                length: $scope.cloth.length,
                color: $scope.cloth.color,
                ingredients: $scope.cloth.ingredients
            });
        };

        // dbRemote.replicate.to('stofflistendb');//, 'stofflistendb');


        $scope.showInfo = false;

        $scope.test = function () {
            $scope.showInfo = true;
        };
    });
