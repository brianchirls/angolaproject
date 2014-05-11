/*global define, require*/
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

	Seriously.plugin('tunnel', {
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform vec2 origin;\n' +
				'uniform vec2 dim;\n' +
				'uniform float radius;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec2 offset = vTexCoord - origin;\n' +
				'	offset.x *= dim.x / dim.y;\n' +
				'	float distance = length(offset);\n' +
				'	if (distance < radius) {\n' +
				'		gl_FragColor = texture2D(source, vTexCoord);\n' +
				'	} else {\n' +
				'		gl_FragColor = texture2D(source, origin + offset * radius / distance);\n' +
				'	}\n' +
				'	gl_FragColor = texture2D(source, vTexCoord);\n' +
				'}\n';
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			if (!uniforms.dim || uniforms.dim[0] !== this.width || uniforms.dim[1] !== this.height) {
				uniforms.dim = [this.width, this.height];
			}
			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			origin: {
				type: 'vector',
				dimensions: 2,
				uniform: 'origin',
				defaultValue: [0.5, 0.5],
				min: 0,
				max: 1
			},
			radius: {
				type: 'number',
				uniform: 'radius',
				defaultValue: 0.3,
				min: 0,
				max: 1
			}
		},
		title: 'Tunnel',
		description: ''
	});
}));