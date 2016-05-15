var mainController = angular.module('mainController', ['ngCookies', 'ngFileUpload']);

mainController.controller('htmlController', ['$scope', '$rootScope', '$http', '$cookies', '$location', function($scope, $rootScope, $http, $cookies, $location){
	var user = $cookies.getObject('TCCurrentUser');
	if (user) {
		$rootScope.loggedUser = user;
		$rootScope.isLoggedIn = true;
	};
	
	$rootScope.infos = [];
	$rootScope.errors = [];

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

mainController.controller('authenticationController', ['$scope', '$rootScope', '$http', '$cookies', '$location', function($scope, $rootScope, $http, $cookies, $location) {
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

mainController.controller('taskController', ['$scope', '$rootScope', '$http', 'Upload', function($scope, $rootScope, $http, Upload) {
	
	$scope.checkFile = function() {

		if ($scope.file) {
			if ($scope.file.type.split('/')[0] == "video") {
				$scope.isVideo = true;
			} else {
				$scope.isVideo = false;
			};
			if ($scope.upload_form.file.$error.maxSize || $scope.upload_form.file.$error.pattern) {
				$('.btn-upload').attr('disabled', 'disabled');
				$('.output-select').attr('disabled', 'disabled');
			} else {
				$('.btn-upload').removeAttr('disabled');
				$('.output-select').removeAttr('disabled');
			};
		} else {
			$('.btn-upload').attr('disabled', 'disabled');
			$('.output-select').attr('disabled', 'disabled');
		};

	};

	$scope.uploadCreate = function() {
		$rootScope.infos = [];
		$rootScope.errors = [];

		//2nd field check
		if (typeof $scope.task == "undefined" || typeof $scope.task.name == "undefined" || typeof $scope.task.output == "undefined") {
			return false;
		};
		
		if ($scope.file) {
			$scope.file.input = $scope.task.input = $scope.file.name.split('.')[$scope.file.name.split('.').length -1];
			$scope.file.output = $scope.task.output;
			$scope.file.filename = $scope.task.filename = "ENC_" + $scope.file.output + "_" + $scope.file.name;
			$scope.task.type = $scope.file.type.split('/')[0];
		};
			
		if($scope.upload_form.file.$valid && $scope.file) {
			$scope.upload($scope.file);
		};
				
	};

	$scope.upload = function(file) {
		Upload.upload({
			url: '/upload',
			method: 'POST',
			data: {file: file, input: $scope.file.input, output: $scope.file.output, filename: $scope.file.filename, name: $scope.task.name }
		}).then(function (resp) {
			if (resp.data.error_code === 0) {
				$rootScope.infos.push("Success " + resp.config.data.file.name + " uploaded.");
				$scope.createTask($scope.task);
				$scope.file = {};
				$scope.task = {};
				console.log($rootScope);
			} else {
				$rootScope.errors.push(resp.data.err_desc);
			};
		}, function(resp){
			$rootScope.errors.push("Error status: " + resp.status);
		}, function(evt) {
			var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			$scope.progress = "progress: " + progressPercentage + "% ";
		});
	};

	$scope.createTask = function(task) {
		$http.post('/task/create', task)
			.success(function(data) {
				$rootScope.infos.push("Task " + task.name + " created");
				$scope.tasks = data;
			})
			.error(function(data) {
				$rootScope.errors.push("Task " + task.name + " not created");
			});
	};

}]);
