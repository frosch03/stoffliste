'use strict';

var add = angular.module('stoffListeApp');

add.controller('AddCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
    $scope.cloth = {
        id: '',
        metrage: [],
        meta: {
            color: '',
            ingredients: ''
        }
    };

    $scope.submit = function () {
        $rootScope.$emit('addCloth', $scope.cloth);
    };

    $scope.temp = false;
    $scope.addMetrage = function () {
        $scope.temp = false;
        $scope.additionalMetrage = {
            length: 0,
            width: 0
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
}]);
