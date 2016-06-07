var mainController = angular.module('mainController', ['ngCookies', 'ngFileUpload'])
	.filter('isEmpty', function () {
        var bar;
        return function (obj) {
            for (bar in obj) {
                if (obj.hasOwnProperty(bar)) {
                    return false;
                }
            }
            return true;
        };
    }).filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});

mainController.controller('htmlController', ['$scope', '$rootScope', '$http', '$cookies', '$location', function($scope, $rootScope, $http, $cookies, $location){
	$rootScope.clearMessage = function() {
		$rootScope.infos = [];
		$rootScope.errors = [];
	};

	$scope.logOut = function() {
		$http.get('/logout')
			.success(function(data) {
				$rootScope.loggedUser = {};
				$rootScope.isLoggedIn = false;
				$cookies.remove('FCCurrentUser');
				$cookies.remove('FCCurrentTask');
				$location.path('/');
			})
			.error(function(data) {
				$rootScope.loggedUser = {};
				$rootScope.isLoggedIn = false;
			});
	};

	$scope.popupWindow = function(url, title, w, h) {
		var left = (screen.width/2)-(w/2);
		var top = (screen.height/2)-(h/2);
		window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
	};

	if (typeof $rootScope.isLoggedIn !== "undefined") {
		checkCurrentUser();
	} else {
		if ($cookies.getObject('FCCurrentUser')) {
			$rootScope.loggedUser = $cookies.getObject('FCCurrentUser');
			$rootScope.isLoggedIn = true;
		} else {
			$scope.logOut();
		};
	};

	$rootScope.infos = [];
	$rootScope.errors = [];

	//Clear dialogs on location change
	$scope.$on('$locationChangeStart', function(event) {
	    $rootScope.infos = [];
		$rootScope.errors = [];
	});

	function checkCurrentUser() {
		$http.get('/isAuth')
			.success(function(data) {
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
	};

	
	
}]);

mainController.controller('homeController', ['$scope', '$rootScope', '$http', '$cookies', function($scope, $rootScope, $http, $cookies) {
	$('.output-select').prop("selectedIndex", 0);

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

mainController.controller('authenticationController', ['$scope', '$rootScope', '$http', '$cookies', '$location', '$controller', function($scope, $rootScope, $http, $cookies, $location, $controller) {
	$scope.createUser = function() {
		$rootScope.clearMessage();
		if (typeof $scope.user == "undefined" || typeof $scope.user.email == "undefined" || typeof $scope.user.password == "undefined" ) {
			$rootScope.errors.push("Please fill all the required field");
			return false;
		};

		if ($scope.user.password !== $scope.user.passwordConfirm) {
			$rootScope.errors.push("Passwords does not match.");
			return false;
		};

		$http.post('/register', $scope.user)
			.success(function(data) {
				console.log(data);
				$rootScope.infos.push("Registration successful !");
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;

				var today = new Date();
				var expired = new Date(today);
				expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
				$cookies.putObject('FCCurrentUser', data, {expire : expired });

				if ($cookies.getObject('FCGuestTask')) {
					$rootScope.createTask($cookies.getObject('FCGuestTask'));
					$cookies.remove('FCGuestTask');
				};

				$(".register-box").slideUp(200, function() {
					$(".register-success").slideDown(200);
				});
				
			})
			.error(function(data) {
				if (typeof $scope.user !== 'undefined') {
					$scope.user.password = $scope.user.passwordConfirm = "";
				};
					
				$rootScope.errors.push(data);
			});
	}

	$scope.logIn = function() {
		$rootScope.clearMessage();
		
		//Second check input
		if (typeof $scope.user == "undefined" || typeof $scope.user.email == "undefined" || typeof $scope.user.password == "undefined" ) {
			$rootScope.errors.push("Please fill all the required field");
			return false;
		};

		$http.post('/login', $scope.user)
			.success(function(data) {
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;

				var today = new Date();
				var expired = new Date(today);
				expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
				$cookies.putObject('FCCurrentUser', data, {expire : expired });

				$location.path('/');
			})
			.error(function(data) {
				if (typeof $scope.user !== 'undefined')
					$scope.user.password = "";
				$rootScope.errors.push(data);
			});
	}

	$scope.logFacebook = function() {
		newwindow=window.open('auth/facebook','name','height=800,width=500');
	}

	window.isAuth = function() {
		$http.get('/isAuth')
			.success(function(data) {
				$rootScope.loggedUser = data;
				$rootScope.isLoggedIn = true;

				var today = new Date();
				var expired = new Date(today);
				expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
				$cookies.putObject('FCCurrentUser', data, {expire : expired });

				$location.path('/');
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});
	}

}]);

mainController.controller('taskController', ['$scope', '$rootScope', '$http', 'Upload', '$location', '$cookies', function($scope, $rootScope, $http, Upload, $location, $cookies) {

	if ($rootScope.isLoggedIn) {
		$http.get('/task/get')
			.success(function(data) {
				$scope.tasks = limit10G(data);
			})
			.error(function(data) {
				console.log('Errors: ' + data);
			});

		$scope.videoPreview = $('.file-preview video');
		$scope.audioPreview = $('.file-preview audio');
	};

	$('.start').click(function() {
		$(this).parent().slideUp(200, function() {
			$('.uploadForm').slideDown(200);
		});

		$('.url-link input').val("");
		$('.filename').empty();
		$('.file-preview').slideUp(200);

		$('.btn-upload').attr('disabled', 'disabled');
		$('.output-select').attr('disabled', 'disabled');
	});

	$('.file-btn').click(function() {
		$('.url-link').slideUp(200);
		$('.url-link input').val("");
	});

	$('.url-btn').click(function() {
		$('.url-link').slideDown(200);
		$('.filename').empty();
		$('.file-preview').slideUp(200);
	});

	$('.btn-cancel').click(function() {
		$(this).parent().slideUp(200, function() {
			$('.introduction').slideDown(200);
		});
	});

	$(".tasks-list").on("click", ".task", function() {
		$(this).next().slideToggle(200);
	});

	$(".info-tasks").on("click", function() {
	    $('html,body').animate({scrollTop: $('.latest-tasks').offset().top - 50}, 200);
	});

	function limit10G(tasks) {
	    var total = 0;
	    var limitTasks = [];
	    for(var i = 0; i < tasks.length; i++){
	    	total += tasks[i].size;
	    	if (total >= 10000000000) {
	    		$scope.deleteTask(tasks[i]._id);
	    	} else {
	    		limitTasks.push(tasks[i]);
	    	};
	    }
	    return limitTasks;
	}

	$scope.checkFile = function() {
		$rootScope.clearMessage();

		//Reset select options
		$('.output-select').prop("selectedIndex", 0);
		$('.btn-upload').attr('disabled', 'disabled');
		$('.output-select').attr('disabled', 'disabled');
		$('.filename').empty();
		$('.file-preview').slideUp(200);
/*		$('.file-preview').animate({ 'overflow': "hidden", 'height': 0, 'margin-bottom': 0 }, { duration: 300 }).empty().hide();
*/
		//Show every output
		$('.output-select option').show();

		//Check Size and Pattern for errors
		if ($scope.upload_form.file.$error.maxSize) {
			$rootScope.errors.push("Maximum file size is 700MB");
		};
		if ($scope.upload_form.file.$error.pattern) {
			$rootScope.errors.push("Your file is not an audio nor a video");
		};

		if ($scope.file) {
			var previewHeight = 250;

			//Check if the file type is a video
			if ($scope.file.type.split('/')[0] == "video") {
				$scope.isVideo = true;
				$('.file-preview').html($scope.videoPreview);
			} else {
				$scope.isVideo = false;
				$('.file-preview').html($scope.audioPreview);
				previewHeight = 30;
			};

			//Check type and size requirements
			if ((!$scope.upload_form.file.$error.maxSize && !$scope.upload_form.file.$error.pattern)) {
				$('.btn-upload').removeAttr('disabled');
				$('.output-select').removeAttr('disabled');
			};
			//Remove current input in output
			$('.output-select option:contains(' + ($scope.file.name.split('.')[$scope.file.name.split('.').length -1]).toUpperCase() + ')').hide();

			//Show preview
			$('.filename').html($scope.file.name);
			$('.file-preview').slideDown(200);
/*			$('.file-preview').show().delay(1000).animate({ 'overflow': "visible", 'height': previewHeight, 'margin-bottom': 15 }, { duration: 300 });
*/		};

		if ($scope.url !== "undefined") {
			var videoFormats = ["AVI", "MP4", "MKV", "3GP", "FLV", "MOV", "M2TS", "TS", "MPG", "OGG", "WEBM", "WMV"];
			var audioFormats = ["MP3", "AAC", "AIFF", "FLAC", "M4A", "OGG", "WAV", "WMA"];

			var input = ($scope.url.split('.')[$scope.url.split('.').length -1]).toUpperCase();
			if (jQuery.inArray(input, videoFormats)) {
				$scope.isVideo = true;
			} else if (jQuery.inArray(input, audioFormats)) {
				$scope.isVideo = false;
			} else {
				$rootScope.errors.push("The link provided is not an audio nor a video");
			};


			
			$('.btn-upload').removeAttr('disabled');
			$('.output-select').removeAttr('disabled');
		};

	};

	$scope.uploadCreate = function() {
		
		$rootScope.clearMessage();

		console.log($scope.file);
		console.log($scope.url);

		//Check File or Link not empty
		if ($scope.url == "undefined" && $scope.file == "undefined") {
			$rootScope.errors.push("Please provide a file OR a link");
			return false;
		};

		//Second field check
		if (typeof $scope.task == "undefined" || typeof $scope.task.output == "undefined") {
			$rootScope.errors.push("Please provide a file and an output");
			return false;
		};

		
		//Set correct value of input, output, filename and type
		if ($scope.file) {
			$scope.file.input = $scope.task.input = ($scope.file.name.split('.')[$scope.file.name.split('.').length -1]).toUpperCase();
			$scope.file.output = $scope.task.output;

			//Check different input output
			if ($scope.file.input == $scope.file.output) {
				$rootScope.errors.push("The file is already in " + $scope.file.output);
				return false;
			};

			$scope.file.filename = $scope.task.filename = "ENC_" + $scope.file.output + "_" + $scope.file.name;
			$scope.task.type = $scope.file.type.split('/')[0];
			$scope.task.size = $('.inputFile').get(0).files[0].size;
			Upload.mediaDuration($scope.file).then(function(durationInSeconds) {
				$scope.task.duration = durationInSeconds;
				if($scope.upload_form.file.$valid) {
					$('.uploadForm').slideUp(200, function() {
						$('.upload-info').slideDown(200);
					});
					$scope.upload($scope.file);
				};
			});
		} else if ($scope.url !== "undefined") {
			$scope.task.input = ($scope.url.split('.')[$scope.url.split('.').length -1]).toUpperCase();
			

			console.log($scope.task.input);

			//Check different input output
			if ($scope.task.input == $scope.task.output) {
				$rootScope.errors.push("The file is already in " + $scope.task.output);
				return false;
			};

			$scope.task.filename = "ENC_" + $scope.task.output + "_" + ($scope.url.split('/')[$scope.url.split('/').length -1]);
			//$scope.createTask($scope.task);

			var username = "guest";
			if ($rootScope.isLoggedIn) {
				username = $rootScope.loggedUser.email;
			};
			console.log(username);
			console.log($scope.task.filename);
			
			var downloadData = {
				url: $scope.url,
				username: username,
				filename: $scope.task.filename
			};

			$http.post("/download/url", downloadData)
				.success(function(data) {
					console.log('done');
					return false;
					if ($rootScope.isLoggedIn) {
						$scope.createTask($scope.task);
					} else {
						var today = new Date();
						var expired = new Date(today);
						expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
						$cookies.putObject('FCGuestTask', $scope.task, {expire : expired });
					};
				})
				.error(function(data) {
					$rootScope.errors.push("Download of url link failed");
				});

			$('.uploadForm').slideUp(200, function() {
				$('.download-info').slideDown(200);	
			});
		};	
				
	};

	$scope.upload = function(file) {
		var username = "guest";
		if ($rootScope.isLoggedIn) {
			username = $rootScope.loggedUser.email;
		};
		Upload.upload({
			url: '/upload',
			method: 'POST',
			data: {username: username, file: file, input: $scope.file.input, output: $scope.file.output, filename: $scope.file.filename }
		}).then(function (resp) {
			if (resp.data.error_code === 0) {
				$rootScope.infos.push(resp.config.data.file.name + " uploaded");
				$scope.task.filename = resp.data.filename;
				if ($rootScope.isLoggedIn) {
					$scope.createTask($scope.task);
				} else {
					var today = new Date();
					var expired = new Date(today);
					expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
					$cookies.putObject('FCGuestTask', $scope.task, {expire : expired });
				};
				$scope.file = {};
				$scope.task = {};
			} else {
				$rootScope.errors.push(resp.data.err_desc);
			};
		}, function(resp){
			$rootScope.errors.push("Error status: " + resp.status);
		}, function(evt) {
			var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
			$scope.progress = progressPercentage + "%";
		});
	};

	$rootScope.createTask = function(task) {
		$http.post('/task/create', task)
			.success(function(data) {
				$rootScope.infos.push("Task created");
				$scope.tasks = data;
			})
			.error(function(data) {
				$rootScope.errors.push("Task not created");
			});
	};

	$scope.deleteTask = function(taskId) {
		$rootScope.clearMessage();
		$http.delete('/task/delete/' + taskId)
			.success(function(data) {
				$scope.tasks = data;
				$rootScope.infos.push("Task deleted");
			})
			.error(function(data) {
				$rootScope.errors.push("Task not deleted");
			});
	};

	$scope.convert = function(taskId, taskStatus) {
		if (taskId == -123) {
			$http.get('/task/get/')
			.success(function(data) {
				taskId = data[0]._id;
				checkStatus(taskId, taskStatus);
			})
			.error(function(data) {
			})
		} else {
			checkStatus(taskId, taskStatus);
		};

		function checkStatus(taskId, taskStatus) {
			$rootScope.currentTask = taskId;
			/*if (taskStatus == "Paid") {
				$location.path('/convert');
			} else {
				$location.path('/pay');
			};*/
			$location.path('/convert');
		}
	};

}]);

mainController.controller('payController', ['$scope', '$rootScope', '$http', '$location', '$cookies', function($scope, $rootScope, $http, $location, $cookies) {
	
	if ($rootScope.currentTask) {
		var today = new Date();
		var expired = new Date(today);
		expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
		$cookies.putObject('FCCurrentTask', $rootScope.currentTask, {expire : expired });
	} else if ($cookies.getObject('FCCurrentTask')) {
		$rootScope.currentTask = $cookies.getObject('FCCurrentTask');
	};

	$http.get('/task/get/' + $rootScope.currentTask)
		.success(function(data) {
			$scope.task = data;
			$scope.task.price = getPrice(data);
		})
		.error(function(data) {
		})

	$scope.pay = function(price) {
		$scope.popupWindow('paypal/create/' + price, 'Paypal Payment', 800, 800);
	};

	window.paid = function() {
		$http.get('/task/update/' + $rootScope.currentTask)
			.success(function(data) {
				$location.path('/convert');
			})
			.error(function(data) {
				$rootScope.errors.push("Can't update the task, but it has been paid");
			});
	};

	function getPrice(task) {

		var hours = Math.floor(task.duration / (60 * 60));

		var divisor_for_minutes = task.duration % (60 * 60);
		var minutes = Math.floor(divisor_for_minutes / 60);

		var divisor_for_seconds = divisor_for_minutes % 60;
		var seconds = Math.ceil(divisor_for_seconds);
		if (hours > 0) {
			$scope.task.formatDuration = hours + " hour " + minutes + " minutes and " + seconds + " seconds";
		} else if (minutes > 0) {
			$scope.task.formatDuration = minutes + " minutes and " + seconds + " seconds";
		} else {
			$scope.task.formatDuration = seconds + " seconds"
		};

		if (hours == 0) {
			return 1;
		};

		return hours;

	};

}]);

mainController.controller('convertController', ['$scope', '$rootScope', '$http', '$location', '$cookies', function($scope, $rootScope, $http, $location, $cookies) {
		
	if ($rootScope.currentTask) {
		var today = new Date();
		var expired = new Date(today);
		expired.setDate(today.getDate() + 1); //Set expired date to tomorrow
		$cookies.putObject('FCCurrentTask', $rootScope.currentTask, {expire : expired });
	} else if ($cookies.getObject('FCCurrentTask')) {
		$rootScope.currentTask = $cookies.getObject('FCCurrentTask');
	};

	$http.get('/task/get/' + $rootScope.currentTask)
		.success(function(data) {
			$scope.task = data;

			$http.post('/converting', $scope.task)
				.success(function(data) {
					$scope.status = "Converted";
					console.log("Convert success");
				})
				.error(function(data) {
					console.log("Convert error");
				});
		})
		.error(function(data) {
			//$rootScope.errors.push("No task found");
		});



}]);