'use strict';

angular
  .module('stoffListeApp', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'pouchdb'
  ]).config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
