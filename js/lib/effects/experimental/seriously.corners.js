/* global define, require */
/*
*/
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

	var identity = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);

	Seriously.plugin('corners', function (options) {
		var baseShader,
			derivativeShader,
			derivativeBuffer,
			blurShader,
			blurBuffer,
			transform,
			projection;

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				derivativeBuffer = new Seriously.util.FrameBuffer(gl, this.width, this.height);
				blurBuffer = new Seriously.util.FrameBuffer(gl, this.width, this.height);

				this.uniforms.blurSource = derivativeBuffer.texture;
				this.uniforms.derivativeSource = derivativeBuffer.texture;
				this.uniforms.direction = [0, 0];
			},
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					/*
					Some devices or browsers (e.g. IE11 preview) don't support enough
					varying vectors, so we need to fallback to a less efficient method
					*/
					maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS),
					defineVaryings = (maxVaryings >= 10 ? '#define USE_VARYINGS' : '');

				//baseShader = new Seriously.util.ShaderProgram(gl, shaderSource.vertex, shaderSource.fragment);

				derivativeShader = new Seriously.util.ShaderProgram(gl, [
					//defineVaryings,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 projection;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',
					'varying vec2 topLeft;',
					'varying vec2 top;',
					'varying vec2 topRight;',
					'varying vec2 left;',
					'varying vec2 right;',
					'varying vec2 bottomLeft;',
					'varying vec2 bottom;',
					'varying vec2 bottomRight;',

					'void main(void) {',
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	vTexCoord = texCoord;',

					'	vec2 offset = 1.0 / resolution;',
					'	vec2 negOffset = vec2(offset.x, -offset.y);',
					'	vec2 xOffset = vec2(offset.x, 0.0);',
					'	vec2 yOffset = vec2(0.0, offset.y);',

					'	topLeft = texCoord - offset;',
					'	top = texCoord - yOffset;',
					'	topRight = texCoord + negOffset;',

					'	bottomLeft = texCoord - negOffset;',
					'	bottom = texCoord + yOffset;',
					'	bottomRight = texCoord + offset;',

					'	left = texCoord - xOffset;',
					'	right = texCoord + xOffset;',

					'}'
				].join('\n'), [
					//defineVaryings,
					'precision mediump float;\n',

					'uniform sampler2D source;',
					'uniform float edgeStrength;',

					'varying vec2 vTexCoord;',
					'varying vec2 topLeft;',
					'varying vec2 top;',
					'varying vec2 topRight;',
					'varying vec2 left;',
					'varying vec2 right;',
					'varying vec2 bottomLeft;',
					'varying vec2 bottom;',
					'varying vec2 bottomRight;',

					'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);\n' +

					'void main(void) {',
					'	float topLeftVal = dot(texture2D(source, topLeft).rgb, lumcoeff);',
					'	float topVal = dot(texture2D(source, top).rgb, lumcoeff);',
					'	float topRightVal = dot(texture2D(source, topRight).rgb, lumcoeff);',

					'	float leftVal = dot(texture2D(source, left).rgb, lumcoeff);',
					'	float rightVal = dot(texture2D(source, right).rgb, lumcoeff);',

					'	float bottomLeftVal = dot(texture2D(source, bottomLeft).rgb, lumcoeff);',
					'	float bottomVal = dot(texture2D(source, bottom).rgb, lumcoeff);',
					'	float bottomRightVal = dot(texture2D(source, bottomRight).rgb, lumcoeff);',

					'	float verticalDeriv = -topLeftVal - topVal - topRightVal + bottomLeftVal + bottomVal + bottomRightVal;',
					'	float horizontalDeriv = -bottomLeftVal - leftVal - topLeftVal + bottomRightVal + rightVal + topRightVal;',
					'	verticalDeriv = verticalDeriv * edgeStrength;',
					'	horizontalDeriv = horizontalDeriv * edgeStrength;',
					'	gl_FragColor = vec4(' +
							'horizontalDeriv * horizontalDeriv, ' +
							'verticalDeriv * verticalDeriv, ' +
							'((verticalDeriv * horizontalDeriv) + 1.0) / 2.0, ' +
							'1.0);',
					'}'
				].join('\n'));

				//fast blur shader, fixed at sigma = 2
				//based on http://rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/
				blurShader = new Seriously.util.ShaderProgram(gl, [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 offset;',

					'varying vec2 vTexCoord[9];',
					'varying float weight[5];',

					'void main(void) {',
					'	gl_Position = position;',

					'	weight[0] = 0.2364010284;',
					'	weight[1] = 0.2086231754;',
					'	weight[2] = 0.1265363522;',
					'	weight[3] = 0.0410803389;',
					'	weight[4] = 0.0055596193;',
					'	vTexCoord[0] = texCoord;',
					'	for (int i = 1; i < 4; i += 1) {',
					'		vTexCoord[i * 2] = texCoord + float(i) * offset;',
					'		vTexCoord[i * 2 - 1] = texCoord - float(i) * offset;',
					'	}',
					'}'
				].join('\n'), [
					'precision mediump float;\n',

					'uniform sampler2D derivativeSource;',

					'varying vec2 vTexCoord[9];',
					'varying float weight[5];',

					'void main(void) {',
					'	gl_FragColor += texture2D(derivativeSource, vTexCoord[0]) * weight[0];',
					'	for (int i = 1; i < 5; i += 1) {',
					'		gl_FragColor += texture2D(derivativeSource, vTexCoord[i * 2]) * weight[i];',
					'		gl_FragColor += texture2D(derivativeSource, vTexCoord[i * 2 - 1]) * weight[i];',
					'	}',
					'}'
				].join('\n'));


				// todo: this is Harris. Support Shi-Tomasi too
				shaderSource.fragment = [
					'precision mediump float;\n',
					'uniform sampler2D blurSource;',
					'uniform float sensitivity;',

					'varying vec2 vTexCoord;',
					'const float harrisConstant = 0.04;',

					'void main(void) {',
					'	vec3 derivativeElements = texture2D(blurSource, vTexCoord).rgb;',
					'	float derivativeSum = derivativeElements.x + derivativeElements.y;', //harris
					//'	float derivativeDifference = derivativeElements.x - derivativeElements.y;', //shi-tomasi
					'	float zElement = (derivativeElements.z * 2.0) - 1.0;',
					///* harris
					'	float cornerness = derivativeElements.x * derivativeElements.y - ' +
							'(zElement * zElement) - ' +
							'harrisConstant * derivativeSum * derivativeSum;',
					//*/

					//'	float cornerness = derivativeElements.x + derivativeElements.y - sqrt(derivativeDifference * derivativeDifference + 4.0 * zElement * zElement);', //shi-tomasi
					//'	gl_FragColor = vTexCoord.x < 0.5 ? vec4(vec3(cornerness * sensitivity), 1.0) : vec4(derivativeElements, 1.0);',
					'	gl_FragColor = vec4(vec3(cornerness * sensitivity), 1.0);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				transform = uniforms.transform;
				projection = uniforms.projection;

				//todo: turn off blending?
				//todo: remove transforms and projection from this shader
				parent(derivativeShader, model, uniforms, derivativeBuffer.frameBuffer);
//parent(derivativeShader, model, uniforms, null);

				//blur horizontal
				uniforms.direction[0] = 1 / this.width;
				uniforms.direction[1] = 0;
				uniforms.derivativeSource = derivativeBuffer.texture;
				parent(blurShader, model, uniforms, blurBuffer.frameBuffer);
//parent(blurShader, model, uniforms, null);

				//blur vertical
				uniforms.direction[0] = 0;
				uniforms.direction[1] = 1 / this.height;
				uniforms.derivativeSource = blurBuffer.texture;
				parent(blurShader, model, uniforms, derivativeBuffer.frameBuffer);
//parent(blurShader, model, uniforms, null);

//parent(derivativeShader, model, uniforms, frameBuffer);
				uniforms.transform = identity;
				uniforms.projection = identity;

				parent(shader, model, uniforms, frameBuffer);
//parent(shader, model, uniforms, null);

/*
var data = new Uint8Array(this.width * this.height * 4);
var gl = this.gl;
gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
for (var i = 0; i < data.length; i+=4) {
	if (data[i]) {
		console.log('corner found at ' + (i % this.width) + ', ' + Math.floor(i / this.width), data[i]);
	}
}
*/

//parent(shader, model, uniforms, null);

				uniforms.transform = transform;
				uniforms.projection = projection;
			},
			resize: function () {
				if (derivativeBuffer) {
					derivativeBuffer.resize(this.width, this.height);
				}
				if (blurBuffer) {
					blurBuffer.resize(this.width, this.height);
				}
			},
			destroy: function () {
				if (derivativeBuffer) {
					derivativeBuffer.destroy();
					derivativeShader.destroy();
				}
				if (blurBuffer) {
					blurBuffer.destroy();
					blurShader.destroy();
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			edgeStrength: {
				type: 'number',
				uniform: 'edgeStrength',
				defaultValue: 1,
				min: 0,
				max: 10
			},
			sensitivity: {
				type: 'number',
				uniform: 'sensitivity',
				defaultValue: 5,
				min: 0
			}
		},
		title: 'Corner Detection'
	});
}));
