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

	//http://http.developer.nvidia.com/GPUGems/gpugems_ch22.html

	Seriously.plugin('levels', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec3 minimum;',
				'uniform vec3 maximum;',
				'uniform vec3 gamma;',
				'uniform vec3 minOutput;',
				'uniform vec3 maxOutput;',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',

				'	vec3 rgb = pow((pixel.rgb - minimum) / (maximum - minimum), gamma) * (maxOutput - minOutput) + minOutput;',
				'	gl_FragColor = vec4(rgb, pixel.a);',
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
			min: {
				type: 'vector',
				uniform: 'minimum',
				dimensions: 3,
				min: 0,
				max: 1,
				defaultValue: [0, 0, 0]
			},
			max: {
				type: 'vector',
				uniform: 'maximum',
				dimensions: 3,
				min: 0,
				max: 1,
				defaultValue: [1, 1, 1]
			},
			gamma: {
				type: 'vector',
				uniform: 'gamma',
				dimensions: 3,
				min: 0,
				defaultValue: [1, 1, 1]
			},
			minOutput: {
				type: 'vector',
				uniform: 'minOutput',
				dimensions: 3,
				min: 0,
				max: 1,
				defaultValue: [0, 0, 0]
			},
			maxOutput: {
				type: 'vector',
				uniform: 'maxOutput',
				dimensions: 3,
				min: 0,
				max: 1,
				defaultValue: [1, 1, 1]
			}
		},
		title: 'Levels'
	});
}));
