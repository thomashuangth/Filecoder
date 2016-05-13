var mainController = angular.module('mainController', ['ngCookies']);

mainController.controller('htmlController', ['$scope', '$rootScope', '$http', '$cookies', '$location', function($scope, $rootScope, $http, $cookies, $location){
	var user = $cookies.getObject('TCCurrentUser');
	if (user) {
		console.log('User found');
		$rootScope.loggedUser = user;
		$rootScope.isLoggedIn = true;
	};

	$scope.logOut = function() {
		$http.get('/logout')
			.success(function(data) {
				$rootScope.loggedUser = {};
				$rootScope.isLoggedIn = false;
				$cookies.remove('TCCurrentUser');
				console.log("Cookie deleted");
				$location.path('/');
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
	}
}]);

mainController.controller('homeController', ['$scope', '$rootScope', '$http', '$cookies', function($scope, $rootScope, $http, $cookies) {

	if ($rootScope.isLoggedIn) {
		$scope.user = $rootScope.loggedUser;
	};
	
	/*$http.get('/get')
		.success(function(data) {
			$scope.customers = data;
			console.log(data);
		})
		.error(function(data) {
			console.log('Errors: ' + data);
		});

	$scope.createCustomer = function() {
		$http.post('/add', $scope.customer)
			.success(function(data) {
				$scope.customer = {};
				$scope.customers = data;
				console.log(data);
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
	}

	$scope.deleteCustomer = function(id) {
		$http.delete('/delete/' + id)
			.success(function(data) {
				$scope.customers = data;
				console.log(data);
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			})
	}*/

}]);

mainController.controller('detailsController', ['$scope', '$http', '$routeParams', function($scope, $http, $routeParams) {
	$http.get('/get/' + $routeParams.name)
		.success(function(data) {
			$scope.customer = data;
		})
		.error(function(data) {
			console.log('Errors: ' + data);
		});
}]);

mainController.controller('authenticationController', ['$scope', '$rootScope', '$http', '$cookies', '$location', '$window', function($scope, $rootScope, $http, $cookies, $location, $window) {
	$scope.createUser = function() {
		$http.post('/register', $scope.user)
			.success(function(data) {
				$location.path('/');
			})
			.error(function(data) {
				if (typeof $scope.user !== 'undefined')
					$scope.user.password = "";
				console.log('Errors: ' + data);
			});
	}

	$scope.logIn = function() {
		$http.post('/login', $scope.user)
			.success(function(data) {
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;

				var today = new Date();
				var expired = new Date(today);
				expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
				$cookies.putObject('TCCurrentUser', data, {expire : expired });
				console.log("Cookie created : " + $cookies);
				console.log(data);

				$location.path('/');
			})
			.error(function(data) {
				if (typeof $scope.user !== 'undefined')
					$scope.user.password = "";
				console.log('Errors: ' + data);
			});
	}

	$scope.logFacebook = function() {
		newwindow=window.open('auth/facebook','name','height=800,width=500');
	}

	/* Methods */

	window.isAuth = function() {
		$http.get('/isAuth')
			.success(function(data) {
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;

				var today = new Date();
				var expired = new Date(today);
				expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
				$cookies.putObject('TCCurrentUser', data, {expire : expired });
				console.log("Cookie created : " + $cookies);
				console.log(data);

				$location.path('/');
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
	}

	$scope.popupWindow = function(url, title, w, h) {
		var left = (screen.width/2)-(w/2);
		var top = (screen.height/2)-(h/2);
		window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
	} 
}]);