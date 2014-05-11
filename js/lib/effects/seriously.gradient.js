/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	Seriously.plugin('graident', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = [
				'precision mediump float;',

				'attribute vec4 position;',
				'attribute vec2 texCoord;',

				'uniform vec2 resolution;',
				'uniform mat4 transform;',

				'varying vec2 vTexCoord;',

				'uniform vec2 startPoint;',
				'uniform vec2 endPoint;',
				'uniform float circle;',
				'varying vec2 point;',
				'varying vec2 edge;',
				'varying float e;',
				'const float HALF_PI = ' + (Math.PI / 2) + ';',

				'void main(void) {',
				// first convert to screen space
				'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
				'	screenPosition = transform * screenPosition;',

				// convert back to OpenGL coords
				'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
				'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
				'	gl_Position.w = screenPosition.w;',
				'	vTexCoord = texCoord;',

				'	e = 1.0 / (circle);',
				'	vec2 offset = endPoint - startPoint;',
				'	point -= startPoint;',
				'	vec2 norm = normalize(offset);',
				'	mat2 rotate = mat2(norm.x, -norm.y, norm.y, norm.x);',
				'	point = rotate * point;',
				'}'
			].join('\n');


			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'void main(void) {',
				'	gl_FragColor = texture2D(source, vTexCoord);',
				'	gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			startPoint: {
				type: 'vector',
				uniform: 'startPoint',
				dimensions: 2,
				defaultValue: [0.5, 0.5]
			},
			endPoint: {
				type: 'vector',
				uniform: 'startPoint',
				dimensions: 2,
				defaultValue: [0.5, 0.5]
			},
			startColor: {
				type: 'color',
				uniform: 'startColor',
				defaultValue: [0, 0, 0, 1]
			},
			endColor: {
				type: 'color',
				uniform: 'endColor',
				defaultValue: [1, 1, 1, 1]
			},
			circle: {
				type: 'number',
				uniform: 'circle',
				defaultValue: 0,
				min: 0,
				max: 0
			}
		},
		title: 'Gradient',
		categories: ['generator']
	});
}));
