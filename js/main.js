(function () {
	require.config({
		baseUrl: 'js/',
		paths: {
			seriously: 'lib/seriously',
			three: 'lib/three'
		},
		shim: {
			'lib/scenario': {
				deps: ['seriously'],
				exports: 'Scenario'
			},
			'three': {
				exports: 'THREE'
			},
			'lib/FirstPersonControls': {
				deps: ['three']
			}
		}
	});

	require([
		'seriously',
		'lib/scenario',
		'three',
		'chatbot',

		'lib/FirstPersonControls',
		'lib/effects/seriously.blend',
		'lib/effects/seriously.select',
		'lib/effects/seriously.simplex',
		'lib/effects/seriously.accumulator',
		'lib/effects/seriously.hue-saturation',
		'lib/effects/seriously.color',
		'lib/effects/seriously.channels'
	], function (Seriously, Scenario, THREE, ChatBot) {
		var trainVideo = document.getElementById('train'),

			seriously,
			target,
			select,

			outputWidth,
			outputHeight,

			scenarioList = [],
			scenarios = {},

			activeScenario,
			activeIndex,
			mouseX = 0,
			mouseY = 0,

			pixelRatio = window.devicePixelRatio || 1;

		function resize() {
			var key,
				scenario;

			if (outputHeight !== window.innerHeight || outputWidth !== window.innerWidth) {
				outputHeight = window.innerHeight;
				outputWidth = window.innerWidth;

				target.width = outputWidth;
				target.height = outputHeight;

				for (key in scenarios) {
					if (scenarios.hasOwnProperty(key)) {
						scenario = scenarios[key];
						if ('width' in scenario) {
							scenario.width = outputWidth;
						}
						if ('height' in scenario) {
							scenario.height = outputHeight;
						}
					}
				}
			}
		}

		function initScenarios() {
			// resources shared across multiple scenarios
			var boxGeometry,

				// local
				plane,
				planeTransforms,

				// constants
				VIDEO_ASPECT = 16 / 9,
				BOX_HEIGHT = 1,
				BOX_WIDTH = BOX_HEIGHT * VIDEO_ASPECT,
				BOX_SPACING = 1 / 16;

			plane = new THREE.PlaneGeometry(BOX_WIDTH, BOX_HEIGHT);
			planeTransforms = [
				(new THREE.Matrix4()).setPosition(new THREE.Vector3(0, 0, BOX_SPACING + BOX_WIDTH / 2)),
				(new THREE.Matrix4()).makeRotationY(-Math.PI / 2).setPosition(new THREE.Vector3(-BOX_SPACING - BOX_WIDTH / 2, 0, 0)),
				(new THREE.Matrix4()).setPosition(new THREE.Vector3(0, 0, -BOX_SPACING - BOX_WIDTH / 2)),
				(new THREE.Matrix4()).makeRotationY(Math.PI / 2).setPosition(new THREE.Vector3(BOX_SPACING + BOX_WIDTH / 2, 0, 0))
			];

			boxGeometry = new THREE.Geometry();
			for (i = 0; i < planeTransforms.length; i++) {
				boxGeometry.merge(plane, planeTransforms[i], i);
			}

			scenarios.trainIntro = new Scenario(function () {
				// config constants
				var FADE_RATE = 1 / 5000,
					FADE_DELAY = 8000,
					SATURATION_DECLINE_RATE = 2 / 3000,
					SATURATION_INCREASE_RATE = 1 / 400,

					hueSat,
					reformat,

					play = document.getElementById('play'),

					saturation = 0,
					lastMouseX,
					lastMouseY,
					lastTimerTime,
					lastMouseTime,

					running = false;

				function mouseMove(e) {
					var x, y,
						now, diff,
						delta;

					if (!isNaN(e.pageX)) {
						x = e.pageX;
						y = e.pageY;
					} else {
						x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
						y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
					}

					now = Date.now();
					if (lastMouseTime) {
						diff = now - lastMouseTime;
						delta = Math.sqrt(Math.pow(x - lastMouseX, 2) + Math.pow(y - lastMouseY, 2));
						saturation = Math.min(0, saturation + delta * SATURATION_INCREASE_RATE);
						hueSat.saturation = saturation;
					}

					mouseX = x;
					mouseY = y;

					lastMouseTime = now;
					lastMouseX = x;
					lastMouseY = y;
				}

				hueSat = seriously.effect('hue-saturation');
				hueSat.hue = 0;
				hueSat.saturation = 0;
				hueSat.source = trainVideo;

				reformat = seriously.transform('reformat');
				reformat.source = hueSat;
				reformat.mode = 'cover';

				return {
					aliases: {
						width: {
							node: reformat,
							input: 'width'
						},
						height: {
							node: reformat,
							input: 'height'
						}
					},
					output: reformat,
					start: function () {
						running = true;
						lastTimerTime = 0;
						trainVideo.play();
						window.addEventListener('mousemove', mouseMove, false);
						play.style.display = 'block';
						play.addEventListener('click', nextScenario, false);
					},
					stop: function () {
						running = false;
						window.removeEventListener('mousemove', mouseMove, false);
						trainVideo.pause();
						play.style.display = '';
						play.removeEventListener('click', nextScenario, false);
					},
					render: function () {
						var diff, now;

						if (running) {
							now = Date.now();

							if (lastTimerTime) {
								diff = now - lastTimerTime;
								saturation = Math.max(-1, saturation - diff * SATURATION_DECLINE_RATE);
								hueSat.saturation = saturation;
							}

							lastTimerTime = now;
						}
					}
				}
			});
			scenarioList.push(scenarios.trainIntro);

			scenarios.chat = new Scenario(function () {
				var train = seriously.source(trainVideo),
					white = seriously.effect('color'),
					jeremy = seriously.source('#jxwaiting'),
					//noise = seriously.effect('simplex'),
					reformatTrain = seriously.transform('reformat'),
					reformatJeremy = seriously.transform('reformat'),
					//reformatNoise = seriously.transform('reformat'),
					accumulator = seriously.effect('accumulator'),
					trainMasked = seriously.effect('channels'),
					blend = seriously.effect('blend'),
					reformatBrush = seriously.transform('reformat'),
					brush = seriously.transform('2d'),

					//noiseInitialized = false,
					accumulatorInitialized = true,

					chat = document.getElementById('chat-type'),

					chatBot,
					rejected = false;

				function mouseMove(e) {
					var x, y;

					if (!isNaN(e.pageX)) {
						x = e.pageX;
						y = e.pageY;
					} else {
						x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
						y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
					}

					mouseX = x;
					mouseY = y;
				}

				function type() {
					blend.opacity *= 0.98;
				}

				reformatTrain.source = train;
				reformatTrain.mode = 'cover';

				reformatJeremy.source = jeremy;
				reformatJeremy.mode = 'cover';

				white.color = 'white';
				accumulator.source = white;

				trainMasked.source = reformatTrain;
				trainMasked.alphaSource = accumulator;
				trainMasked.alpha = 'r';

				reformatBrush.source = '#brush';
				reformatBrush.mode = 'none';
				brush.source = reformatBrush;

				blend.bottom = reformatJeremy;
				blend.top = trainMasked;

				accumulator.on('render', function startDrawing() {
					accumulator.off('render', startDrawing);
					accumulator.mode = 'darken';
					accumulator.source = brush;
				});

				return {
					aliases: {
						width: function (width) {
							reformatTrain.width = width;
							reformatJeremy.width = width;
							white.width = width;
							reformatBrush.width = width;

							/*
							if (noise.width <= 1) {
								noise.width = width;
							}
							*/
						},
						height: function (height) {
							reformatTrain.height = height;
							reformatJeremy.height = height;
							white.height = height;
							reformatBrush.height = height;

							/*
							if (noise.height <= 1) {
								noise.height = height;
							}
							*/
						}
					},
					start: function () {
						train.original.play();
						jeremy.original.play();
						window.addEventListener('mousemove', mouseMove, false);
						document.getElementById('chat').style.display = 'block';

						accumulator.source = white;
						accumulator.render();
						accumulator.source = brush;

						chatBot = new ChatBot({
							messages: document.getElementById('chat-content'),
							textarea: document.getElementById('chat-type'),
							name: 'Jeremy',
							dialog: [
								{
									prompt: 'Hi'
								},
								{
									prompt: 'I\'m Jeremy. What\'s your name?',
									delay: 800,
									responses: [
										{
											regex: /[a-z]+/i,
											id: 'name'
										}
									],
									otherwise: [
										'I didn\'t catch that',
										'No, really, what is your name?',
										'Huh?'
									]
								},
								{
									prompt: 'Nice to meet you, $name'
								},
								{
									prompt: 'If you don\'t mind, can I ask where you\'re from? I grew up in Detroit.',
									responses: [
										{
											regex: /\w+/,
											id: 'home'
										}
									],
									otherwise: [
										'Huh?'
									]
								},
								{
									prompt: 'hmmm...what\'s the most surprising place you\'ve ever visited?',
									responses: [
										{
											regex: /\w+/,
											id: 'visited'
										}
									],
									otherwise: [
										'Huh?'
									]
								},
								{
									prompt: '$visited? Interesting. Can I tell you about something?',
									responses: [
										{
											regex: /yup|yeah|sure|yes|why not|okay|ok/i,
											event: 'accept'
										},
										{
											regex: /no\b|fuck off|nah|nope/i,
											event: 'reject'
										}
									],
									otherwise: [
										'Huh?',
										'umm',
										'okay...'
									]
								},
								{
									prompt: 'Okay, no problem. If you change your mind, I\'ll be right here.'
								},
								{
									prompt: 'Bye',
									delay: 5000
								}
							]
						});

						chatBot.on('keypress', type);
						chatBot.start();
						chatBot.on('accept', function () {
							nextScenario();
						});
						chatBot.on('reject', function () {
							rejected = true;
						});
						chatBot.on('ended', function () {
							if (rejected) {
								nextScenario(0);
							}
						});
					},
					stop: function () {
						train.original.pause();
						jeremy.original.pause();
						window.removeEventListener('mousemove', mouseMove, false);
						document.getElementById('chat').style.display = 'none';

						chatBot.off('keypress', type);
						chatBot.destroy();
					},
					output: blend,
					render: function () {
						//translate paintbrush
						brush.translateX = -outputWidth / 2 + mouseX;
						brush.translateY = outputHeight / 2 - mouseY;
					}
				}
			});
			scenarioList.push(scenarios.chat);

			scenarios.jxintro = new Scenario(function () {
				var me = this,
					reformat;

				reformat = seriously.transform('reformat')
				reformat.source = '#jxintro';
				reformat.mode = 'cover';

				function ended() {
					//me.stop();
					nextScenario();
				}

				return {
					aliases: {
						width: reformat,
						height: reformat
					},
					output: reformat,
					start: function () {
						if (reformat.source.original.readyState) {
							reformat.source.original.currentTime = 0;
						}
						reformat.source.original.play();
						reformat.source.original.addEventListener('ended', ended, false);
					},
					stop: function () {
						reformat.source.original.pause();
						reformat.source.original.removeEventListener('ended', ended, false);
					}/*,
					render: function () {
					}*/
				}
			});
			scenarioList.push(scenarios.jxintro);

			scenarios.train = new Scenario(function () {
				var renderer,
					scene,
					camera,
					renderTarget,

					trainVideos = [
						document.getElementById('trainride'),
						document.getElementById('germans'),
						document.getElementById('mines'),
						document.getElementById('dancing')
					],
					trainTextures = [],
					trainMaterials = [],

					audio = document.getElementById('angolavo'),

					leftArrow = document.getElementById('leftarrow'),
					rightArrow = document.getElementById('rightarrow'),

					i,
					tex,
					mat,

					box,
					boxMaterial,

					outputHeight,
					outputWidth,

					visibleFace = 0,
					currentAngle = 0,
					targetAngle = 0,
					lastRotationTime,
					rotating = 0,

					FOV = 25,
					FOV_RADIANS = FOV * Math.PI / 180,
					ROTATE_DURATION = 2;

				function updateAllTrainTextures() {
					var i;

					/*
					todo: figure out which one(s) are visible and only update those
					*/
					for (i = 0; i < trainVideos.length; i++) {
						if(trainVideos[i].readyState >= trainVideo.HAVE_ENOUGH_DATA){
							trainTextures[i].needsUpdate = true;
						}
					}
				}

				function mod(x, y) {
					return x - y * Math.floor(x / y);
				}

				function rotateCube(diff) {
					var i,
						currentTime;

					// only one at a time
					if (rotating) {
						return;
					}

					rotating = diff;
					visibleFace = mod(visibleFace + diff, 4);
					targetAngle = targetAngle + diff * Math.PI / 2;
					currentTime = trainVideos[visibleFace].currentTime;
					lastRotationTime = Date.now();

					for (i = 0; i < trainVideos.length; i++) {
						trainVideos[i].currentTime = currentTime;
						trainVideos[i].play();
					}
				}

				function left() {
					rotateCube(-1);
				}

				function right() {
					rotateCube(1);
				}

				function keyPress(evt) {
					if (evt.which === 37) {
						left();
					} else if (evt.which === 39) {
						right();
					}
				}

				function resize() {
					var cameraWidth,
						cameraHeight,
						outputAspect;

					if (outputWidth && outputHeight) {
						outputAspect = outputWidth / outputHeight;

						if (outputAspect < VIDEO_ASPECT) {
							cameraHeight = BOX_HEIGHT;
							cameraWidth = cameraHeight * outputAspect;
						} else {
							cameraWidth = BOX_WIDTH;
							cameraHeight = cameraWidth / outputAspect;
						}

						renderer.setSize(outputWidth / pixelRatio, outputHeight / pixelRatio);
						renderer.domElement.style.width = '';
						renderer.domElement.style.height = '';

						if (!camera) {
							camera = new THREE.PerspectiveCamera(FOV, outputAspect, 1, 2000);
						} else {
							camera.aspect = outputAspect;
						}

						camera.position.z = BOX_SPACING + BOX_WIDTH / 2 + cameraHeight / (2 * Math.tan(FOV_RADIANS / 2));
						camera.updateProjectionMatrix();
					}
				}

				for (i = 0; i < trainVideos.length; i++) {
					trainVideos[i].volume = 0.1;

					tex = new THREE.Texture(trainVideos[i]);
					tex.minFilter = THREE.LinearFilter;
					tex.magFilter = THREE.LinearFilter;
					tex.format = THREE.RGBFormat;
					tex.generateMipmaps = false;
					trainTextures.push(tex);

					mat = new THREE.MeshLambertMaterial({
						map: tex,
						color: 0xffffff,
						ambient: 0xffffff
					});
					mat.side = THREE.DoubleSide;
					trainMaterials.push(mat);
				}

				renderer = new THREE.WebGLRenderer();
				renderer.domElement.id = 'threejs';
				document.body.appendChild(renderer.domElement);
				renderer.domElement.style.display = 'none';

				scene = new THREE.Scene();
				scene.add(new THREE.AmbientLight('white'));

				boxMaterial = new THREE.MeshFaceMaterial([
					trainMaterials[0],
					trainMaterials[1],
					trainMaterials[2],
					trainMaterials[3]
				]);
				box = new THREE.Mesh(boxGeometry, boxMaterial);
				scene.add(box);

				return {
					aliases: {
						width: function (val) {
							outputWidth = val;
							resize();
						},
						height: function (val) {
							outputHeight = val;
							resize();
						}
					},
					output: trainVideo,
					start: function () {
						canvas.style.display = 'none';
						renderer.domElement.style.display = '';

						window.addEventListener('keydown', keyPress, true);
						leftArrow.addEventListener('click', left, false);
						rightArrow.addEventListener('click', right, false);
						leftArrow.style.display = 'block';
						rightArrow.style.display = 'block';

						for (i = 0; i < trainVideos.length; i++) {
							trainVideos[i].play();
						}

						audio.play();
						if (audio.readyState >= audio.HAVE_METADATA) {
							audio.currentTime = 0;
						}
					},
					stop: function () {
						canvas.style.display = '';
						renderer.domElement.style.display = 'none';

						window.removeEventListener('keydown', keyPress, true);
						leftArrow.removeEventListener('click', left, false);
						rightArrow.removeEventListener('click', right, false);
						leftArrow.style.display = '';
						rightArrow.style.display = '';

						for (i = 0; i < trainVideos.length; i++) {
							trainVideos[i].pause();
						}

						audio.pause();
					},
					render: function () {
						var now = Date.now(),
							theta,
							i;

						if (camera) {
							if (rotating) {
								theta = Math.PI * 2 * (now - lastRotationTime) / 1000 / ROTATE_DURATION;
								currentAngle = Math.min(Math.max(targetAngle, currentAngle - theta), currentAngle + theta);
								if (Math.abs(targetAngle - currentAngle) < 0.00001) {
									//done rotating
									rotating = false;
									targetAngle = mod(currentAngle, Math.PI * 2);
									currentAngle = targetAngle;
									for (i = 0; i < trainVideos.length; i++) {
										if (i !== visibleFace) {
											trainVideos[i].pause();
										}
									}
								}
								box.rotation.y = currentAngle;
								updateAllTrainTextures();
							} else if(trainVideos[visibleFace].readyState >= trainVideo.HAVE_ENOUGH_DATA){
								trainTextures[visibleFace].needsUpdate = true;
							}

							renderer.render(scene, camera, null, true);
						}
					}
				};
			});
			scenarioList.push(scenarios.train);

			scenarios.hallOfCubes = new Scenario(function () {
				var renderer,
					scene,
					camera,
					renderTarget,

					grideo = document.getElementById('grideo'),
					grideoTexture,

					i, j,
					tex,
					mat,

					chatBot,

					box,
					boxMaterial,
					boxesGeometry,
					boxes,

					controls,
					navigating = false,
					clock = new THREE.Clock(),

					outputHeight,
					outputWidth,

					FOV = 25,
					FOV_RADIANS = FOV * Math.PI / 180,
					ROTATE_DURATION = 2,
					BOX_SPREAD = 8;

				function resize() {
					var cameraWidth,
						cameraHeight,
						outputAspect;

					if (outputWidth && outputHeight) {
						outputAspect = outputWidth / outputHeight;

						if (outputAspect < VIDEO_ASPECT) {
							cameraHeight = BOX_HEIGHT;
							cameraWidth = cameraHeight * outputAspect;
						} else {
							cameraWidth = BOX_WIDTH;
							cameraHeight = cameraWidth / outputAspect;
						}

						renderer.setSize(outputWidth / pixelRatio, outputHeight / pixelRatio);
						renderer.domElement.style.width = '';
						renderer.domElement.style.height = '';

						if (!camera) {
							camera = new THREE.PerspectiveCamera(FOV, outputAspect, 1, 2000);
							controls = new THREE.FirstPersonControls( camera, renderer.domElement );
							controls.movementSpeed = 3;
							controls.lookSpeed = 1 / 20;
							controls.lookVertical = false;
						} else {
							camera.aspect = outputAspect;
						}

						//controls.handleResize();
						controls.viewHalfX = window.innerWidth / 2;
						controls.viewHalfY = window.innerHeight / 2;

						camera.updateProjectionMatrix();

						if (!navigating) {
							camera.position.z = BOX_SPACING + BOX_WIDTH / 2 + cameraHeight / (2 * Math.tan(FOV_RADIANS / 2));
						}

					}
				}

				function setUV(one, two) {
					var x = Math.floor(Math.random() * 3.99999),
						y = Math.floor(Math.random() * 3.99999);

					function setVertexUV(vertexUV) {
						// x or y will always be either 0 or 1
						vertexUV.x = x + vertexUV.x * 0.25;
						vertexUV.y = y + vertexUV.y * 0.25;
					}

					x /= 4;
					y /= 4;

					one.forEach(setVertexUV);
					two.forEach(setVertexUV);
				}

				grideoTexture = new THREE.Texture(grideo);
				grideoTexture.minFilter = THREE.LinearFilter;
				grideoTexture.magFilter = THREE.LinearFilter;
				grideoTexture.format = THREE.RGBFormat;
				grideoTexture.generateMipmaps = true;

				boxMaterial = new THREE.MeshLambertMaterial({
					map: grideoTexture,
					color: 0xffffff,
					ambient: 0xffffff
				});
				boxMaterial.side = THREE.DoubleSide;

				renderer = new THREE.WebGLRenderer();
				renderer.domElement.id = 'threejs2';
				document.body.appendChild(renderer.domElement);
				renderer.domElement.style.display = 'none';

				scene = new THREE.Scene();

				var light = new THREE.DirectionalLight(0xffffff);
				light.position.set(1, 1, -1);
				scene.add(light);

				scene.add(new THREE.AmbientLight('white'));

				boxesGeometry = new THREE.Geometry();
				var matrix = new THREE.Matrix4();

				for (i = 0; i < 4; i++) {
					for (j = 0; j < 4; j++) {
						matrix.setPosition(new THREE.Vector3(BOX_SPREAD * i, 0, BOX_SPREAD * j));
						boxesGeometry.merge(boxGeometry, matrix, i * 4 + j);
					}
				}

				boxesGeometry.applyMatrix( new THREE.Matrix4().makeTranslation((BOX_SPREAD - BOX_WIDTH) / 2 + BOX_SPACING, 0, (BOX_SPREAD - BOX_WIDTH) / 2 + BOX_SPACING) );

				var UVs = boxesGeometry.faceVertexUvs[0];
				for (i = 0; i < UVs.length; i+= 2) {
					setUV(UVs[i], UVs[i + 1]);
				}
				boxesGeometry.uvsNeedUpdate = true;

				for (i = -2; i < 2; i++) {
					for (j = -2; j < 2; j++) {
						boxes = new THREE.Mesh(boxesGeometry, boxMaterial);
						boxes.position.set(i * BOX_SPREAD * 4, 0, j * BOX_SPREAD * 4);
						scene.add(boxes);
					}
				}

				return {
					aliases: {
						width: function (val) {
							outputWidth = val;
							resize();
						},
						height: function (val) {
							outputHeight = val;
							resize();
						}
					},
					output: trainVideo,
					start: function () {
						canvas.style.display = 'none';
						renderer.domElement.style.display = '';

						grideo.play();

						document.getElementById('chat').style.display = 'block';

						chatBot = new ChatBot({
							messages: document.getElementById('chat-content'),
							textarea: document.getElementById('chat-type'),
							name: 'Jeremy',
							dialog: [
								{
									prompt: 'We have a lot more exploring to do.'
								}
							]
						});
						chatBot.start();
					},
					stop: function () {
						canvas.style.display = '';
						renderer.domElement.style.display = 'none';
						document.getElementById('chat').style.display = 'none';

						grideo.pause();
						chatBot.destroy();
					},
					render: function () {
						if (controls && camera) {
							controls.update(clock.getDelta());
							if(grideo.readyState >= grideo.HAVE_ENOUGH_DATA){
								grideoTexture.needsUpdate = true;
							}
							renderer.render(scene, camera, null, true);
						}
					}
				};
			});
			scenarioList.push(scenarios.hallOfCubes);
		}

		function nextScenario(index) {
			if (index === undefined || isNaN(index)) {
				index = Math.min(activeIndex + 1, scenarioList.length - 1);
			}

			if (index !== activeIndex && index < scenarioList.length && index >= 0) {
				if (activeScenario) {
					activeScenario.stop();
				}
				activeIndex = index;
				activeScenario = scenarioList[index];
				activeScenario.start();
				select.active = activeIndex;
			}
		}

		function init() {
			var i,
				allVideos;

			allVideos = document.getElementsByTagName('video');
			for (i = 0; i < allVideos.length; i++) {
				allVideos[i].load();
			}

			seriously = new Seriously();

			initScenarios();

			select = seriously.effect('select', {
				count: scenarioList.length
			});

			for (i = 0; i < scenarioList.length; i++) {
				select['source' + i] = scenarioList[i].output;
			}

			target = seriously.target('#canvas');
			target.source = select;

			window.addEventListener('resize', resize, false);
			resize();

			nextScenario(0);
			target.source = select;

			document.getElementById('nextbutton').addEventListener('click', nextScenario, false);
			document.getElementById('prevbutton').addEventListener('click', function () {
				nextScenario(Math.max(0, activeIndex - 1));
			}, false);

			seriously.go(function () {
				activeScenario.render();
			});
		}

		//init();
		window.onload = init;
	});
}());
