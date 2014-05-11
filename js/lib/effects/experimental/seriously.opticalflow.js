/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	// https://github.com/v002/v002-Optical-Flow/blob/master/v002.GPUHSFlow.frag
	// https://github.com/v002/v002-Optical-Flow

	Seriously.plugin('opticalflow', function () {
		var previousFrameBuffer,
			baseShader,
			lastHeight,
			lastWidth;

		return {
			initialize: function (parent) {
				lastHeight = this.height;
				lastWidth = this.width;

				previousFrameBuffer = new Seriously.util.FrameBuffer(this.gl, this.width, this.height);
				parent();
			},
			shader: function (inputs, shaderSource) {
				baseShader = this.baseShader;

				shaderSource.fragment = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'varying vec2 vTexCoord;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'uniform sampler2D previous;\n' +
					'\n' +
					'uniform vec3 srsSize;\n' +
					'uniform vec2 scale;\n' +
					'uniform float offsetX;\n' +
					'uniform float lambda;\n' +
					'const vec4 lumcoeff = vec4(0.299, 0.587, 0.114, 0.0);\n' +
					'\n' +
					'void main() {\n' +
					'	vec4 a = texture2D(previous, vTexCoord);\n' +
					'	vec4 b = texture2D(source, vTexCoord);\n' +
					'	vec2 offset = offsetX / srsSize.xy;\n' +
					'	vec2 x1 = vec2(offset.x, 0.0);\n' +
					'	vec2 y1 = vec2(0.0, offset.y);\n' +

					//get the difference
					'	vec4 curdif = b-a;\n' +

					//calculate the gradient
					'	vec4 gradx = texture2D(source, vTexCoord + x1) - texture2D(source, vTexCoord-x1);\n' +
					'	gradx += texture2D(previous, vTexCoord + x1) - texture2D(previous, vTexCoord-x1);\n' +

					'	vec4 grady = texture2D(source, vTexCoord + y1) - texture2D(source, vTexCoord-y1);\n' +
					'	grady += texture2D(previous, vTexCoord + y1) - texture2D(previous, vTexCoord-y1);\n' +

					'	vec4 gradmag = sqrt((gradx * gradx) + (grady * grady) + vec4(lambda));\n' +

					'	vec4 vx = curdif * (gradx / gradmag);\n' +
					'	float vxd = vx.r;//assumes greyscale\n' +

					//format output for flowrepos, out(-x,+x,-y,+y)
					'	vec2 xout = vec2(max(vxd, 0.0), abs(min(vxd, 0.0))) * scale.x;\n' +

					'	vec4 vy = curdif * (grady / gradmag);\n' +
					'	float vyd = vy.r;//assumes greyscale\n' +

					//format output for flowrepos, out(-x,+x,-y,+y)
					'	vec2 yout = vec2(max(vyd, 0.0), abs(min(vyd, 0.0))) * scale.y;\n' +

					'	gl_FragColor = clamp(vec4(xout.xy, yout.xy), 0.0, 1.0);\n' +
					'	gl_FragColor.a = 1.0;\n' +
					'}\n';

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				uniforms.previous = previousFrameBuffer.texture;

				parent(shader, model, uniforms, frameBuffer);

				if (lastHeight !== this.height || lastWidth !== this.width) {
					lastHeight = this.height;
					lastWidth = this.width;
					previousFrameBuffer.resize(this.width, this.height);
				}

				//just swap buffers rather than copy?
				parent(baseShader, model, uniforms, previousFrameBuffer.frameBuffer);
			},
			destroy: function () {
				if (previousFrameBuffer) {
					previousFrameBuffer.destroy();
					previousFrameBuffer = null;
				}
				if (baseShader) {
					baseShader.destroy();
					baseShader = null;
				}
			}
		};
	},
	{
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			lambda: {
				type: 'number',
				uniform: 'lambda',
				min: 0,
				defaultValue: 0,
				description: 'noise limiting'
			},
			scaleResult: {
				type: 'vector',
				dimensions: 2,
				uniform: 'scale',
				defaultValue: [1, 1]
			},
			offset: {
				type: 'number',
				uniform: 'offsetX',
				defaultValue: 1,
				min: 1,
				max: 100,
				description: 'distance between texel samples for gradient calculation'
			}
		},
		description: '',
		title: 'Optical Flow'
	});
}));
