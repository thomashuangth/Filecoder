var mainController = angular.module('mainController', ['ngCookies', 'ngFileUpload']);

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

		$http.get('/task/get')
			.success(function(data) {
				$scope.tasks = data;
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
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
		if (typeof $scope.user == "undefined" || typeof $scope.user.email == "undefined" || typeof $scope.user.password == "undefined") {
			return false;
		};
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
		if (typeof $scope.user == "undefined" || typeof $scope.user.email == "undefined" || typeof $scope.user.password == "undefined") {
			return false;
		};
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

mainController.controller('taskController', ['$scope', '$rootScope', '$http', 'Upload', '$window', function($scope, $rootScope, $http, Upload, $window) {
	var vm = this;
	$scope.createTask = function(){
		vm.file.input = vm.file.name.split('.')[vm.file.name.split('.').length -1];
		vm.file.output = $scope.task.output;
		vm.file.filename = "ENC_" + vm.file.output + "_" + vm.file.name;

		if (typeof $scope.task == "undefined" || typeof $scope.task.name == "undefined" || typeof $scope.task.output == "undefined") {
			return false;
		};
		$scope.task.owner = $rootScope.loggedUser.email;
		$http.post('/task/create', $scope.task)
			.success(function(data) {
				console.log("Task created");
				$scope.tasks = data;
			})
			.error(function(data) {
				console.log("Task not created");
			})

		if(vm.upload_form.file.$valid && vm.file) {
			vm.upload(vm.file);
		}
	};

	vm.upload = function(file) {
		console.log(file);
		Upload.upload({
			url: '/upload',
			method: 'POST',
			data: {file: file, input: vm.file.input, output: vm.file.output, filename: vm.file.filename }
		}).then(function (resp) {
			if (resp.data.error_code === 0) {
				$window.alert("Success " + resp.config.data.file.name + " uploaded. Response: ");
			} else {
				$window.alert('An error occured ');
			};
		}, function(resp){
			console.log("Error status: " + resp.status);
			$window.alert("Error status: " + resp.status);
		}, function(evt) {
			console.log(evt);
			var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
			vm.progress = "progress: " + progressPercentage + "% ";
		});
	};
}]);
