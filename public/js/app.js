var myApp = angular.module('myApp', ['ngRoute', 'mainController']);

myApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});
	$routeProvider.
		when('/home', {
			templateUrl: '../partials/home.html',
			controller: 'homeController'
		}).
		when('/login', {
			templateUrl: '../partials/login.html',
			controller: 'authenticationController'
		}).
		when('/register', {
			templateUrl: '../partials/register.html',
			controller: 'authenticationController'
		}).
		when('/profil', {
			templateUrl: '../partials/profil.html'
		}).
		when('/tasks', {
			templateUrl: '../partials/tasks.html',
			controller: 'taskController'
		}).
		when('/after-auth', {
			templateUrl: '../partials/after-auth.html'
		}).
		otherwise({
			redirectTo: '/home'
		});
}]);