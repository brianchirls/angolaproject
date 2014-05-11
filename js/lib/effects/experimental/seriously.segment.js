(function (window, undefined) {
	"use strict";

	var Seriously = window.Seriously = window.Seriously ||
		{ plugin: function (name, opt) { this[name] = opt; } };

	Seriously.plugin('segment', (function () {
		var me = this,

			//shaders
			baseShader,
			accShader,
			diffShader,

			//frame buffers
			avgFrameBuffer,
			diffFrameBuffer,
			prevFrameBuffer,

			uniformAcc,
			uniformDiff,

			//state
			learning = false,
			frameCount = 0,
			opts = {
				blend: false
			};

		function setUpFrameBuffers() {
			var gl = me.gl;

			//todo: destroy old frame buffers

			//set up frame buffers (float)
			avgFrameBuffer = [
				new Seriously.util.FrameBuffer(gl, me.width, me.height, true),
				new Seriously.util.FrameBuffer(gl, me.width, me.height, true)
			];
			diffFrameBuffer = [
				new Seriously.util.FrameBuffer(gl, me.width, me.height, true),
				new Seriously.util.FrameBuffer(gl, me.width, me.height, true)
			];
			prevFrameBuffer = new Seriously.util.FrameBuffer(gl, me.width, me.height, true);
		}

		return {
			initialize: function (parent) {
				me = this;
				setUpFrameBuffers();
				parent();
			},
			shader: function (inputs, shaderSource, utilities) {
				var yuvFn = [
					'const mat4 yuv = mat4(',
					'	0.299, -0.14713, 0.615, 0,',
					'	0.587, -0.28886, -0.51499, 0,',
					'	0.114, 0.436, -0.10001, 0,',
					'	0, 0, 0, 1.0',
					');',
					'vec4 rgbToYuv(vec4 color) {',
					'	return yuv * color;',
					'}'
				].join('\n');

				baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',
					'varying vec2 vTexCoord;',
					'uniform sampler2D source;',
					yuvFn +
					'void main(void) {',
					/*
					'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThan(vTexCoord, vec2(1.0)))) {',
					'		gl_FragColor = vec4(0.0);',
					'	} else {',
					*/
					'		gl_FragColor = rgbToYuv(texture2D(source, vTexCoord));',
					//'	}',
					'}'
				].join('\n'));

				accShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform sampler2D avg;\n' +
					'\n' +
					yuvFn +
					'void main(void) {\n' +
					'	vec4 pixelYuv = rgbToYuv(texture2D(source, vTexCoord));\n' +
					'	gl_FragColor = pixelYuv + texture2D(avg, vTexCoord);\n' +
					'	gl_FragColor.a = 1.0;\n' +
					'}\n'
				);

				diffShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform sampler2D prev;\n' +
					'uniform sampler2D diff;\n' +
					'\n' +
					yuvFn +
					'void main(void) {\n' +
					'	vec4 sourcePixel = rgbToYuv(texture2D(source, vTexCoord));\n' +
					'	vec4 prevPixel = rgbToYuv(texture2D(prev, vTexCoord));\n' +
					'	gl_FragColor = abs(sourcePixel - prevPixel) + rgbToYuv(texture2D(diff, vTexCoord));\n' +
					'	gl_FragColor.a = 1.0;\n' +
	/*
					'	if (vTexCoord.x < 0.5) {\n' +
					'		gl_FragColor = sourcePixel;\n' +
					'	} else {\n' +
					'		gl_FragColor = prevPixel;\n' +
					'	}\n' +
	*/				'}\n'
				);

				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform sampler2D avg;\n' +
					'uniform sampler2D diff;\n' +
					'uniform float frameCount;\n' +
					'uniform float hiScale;\n' +
					'uniform float loScale;\n' +
					'const vec3 one3 = vec3(1.0);\n' +
					'\n' +
					yuvFn +
					'void main(void) {\n' +
					'	vec3 a = texture2D(avg, vTexCoord).rgb / frameCount;\n' +
					'	vec3 d = texture2D(diff, vTexCoord).rgb / frameCount;// + 1.0 / 255.0;\n' +
					'	vec3 hi = a + d * hiScale;\n' +
					'	vec3 lo = a - d * loScale;\n' +
					'	vec4 pixel = texture2D(source, vTexCoord);\n' +
					'	vec4 pixelYuv = rgbToYuv(pixel);\n' +
					'	vec3 mask = step(hi, pixelYuv.rgb);\n;' +
					'	mask = max(mask, step(pixelYuv.rgb, vec3(lo)));\n' +
					'	gl_FragColor = vec4(pixel.rgb, min(pixel.a, step(3.0, dot(mask, one3))));\n' +
					'}\n';

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				if (this.inputs.learning && !learning) {
					frameCount = 0;
					learning = true;
					setUpFrameBuffers();
				}
				uniforms.prev = prevFrameBuffer.texture;
				uniforms.avg = avgFrameBuffer[frameCount % 2].texture;
				uniforms.diff = diffFrameBuffer[frameCount % 2].texture;
				uniforms.frameCount = frameCount;

				if (this.inputs.learning) {
					parent(accShader, model, uniforms, avgFrameBuffer[(frameCount + 1) % 2].frameBuffer, opts);
					if (frameCount) {
						parent(diffShader, model, uniforms, diffFrameBuffer[(frameCount + 1) % 2].frameBuffer, opts);
					}

					//copy source to prev
					parent(baseShader, model, uniforms, prevFrameBuffer.frameBuffer, opts);
					frameCount++;

					//just display original
					parent(baseShader, model, uniforms, frameBuffer, opts);
					return;
				} else {
					learning = false;
				}

				parent(shader, model, uniforms, frameBuffer, opts);
			},
			inPlace: false,
			compatible: function () {
				//check for float texture extension
				var canvas,
					gl,
					fb;

				canvas = document.createElement('canvas');
				gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

				if (!gl.getExtension("OES_texture_float")) {
					return false;
				}

				try {
					fb = new Seriously.util.FrameBuffer(gl, 2, 2, true);
				} catch (e) {
					return false;
				}
				fb.destroy();
				return true;
			},
			destroy: function () {
				var gl = this.gl;
				if (gl) {
					gl.deleteShader(baseShader);
					gl.deleteShader(accShader);
					gl.deleteShader(diffShader);
				}

				//delete frame buffers
				if (avgFrameBuffer[0]) {
					avgFrameBuffer[0].destroy();
				}
				if (avgFrameBuffer[1]) {
					avgFrameBuffer[1].destroy();
				}
				if (diffFrameBuffer) {
					diffFrameBuffer.destroy();
				}
				if (prevFrameBuffer) {
					prevFrameBuffer.destroy();
				}
			},
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					shaderDirty: false
				},
				learning: {
					type: 'boolean',
					defaultValue: false
				},
				lo: {
					type: 'number',
					uniform: 'loScale',
					defaultValue: 6,
					min: 0,
					max: 20
				},
				hi: {
					type: 'number',
					uniform: 'hiScale',
					defaultValue: 7,
					min: 0,
					max: 20
				}
			},
			description: 'Background Segmentation',
			title: 'Segment'
		};
	}()));
}(this));
