'use strict';

angular
  .module('stoffListeApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'pouchdb',
    'ui.bootstrap'
  ]).config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/list', {
        templateUrl: 'views/list.html',
        controller: 'ListCtrl'
      })
      .when('/show/:id', {
        templateUrl: 'views/show.html',
        controller: 'ShowCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
