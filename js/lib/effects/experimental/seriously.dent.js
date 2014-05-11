(function (window, undefined) {
"use strict";

/*
Shader code:
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/?page_id=34
*/

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('dent', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'\n' +
			'uniform float width;\n' +
			'uniform float height;\n' +
			'uniform vec2 origin;\n' +
			'\n' +
			'\n' +
			'void main (void)  {\n' +
			'	vec2 normCoord = vec2(2.0) * vTexCoord - vec2(1.0);\n' +
			'	vec2 s = sign(normCoord);\n' +
			'	normCoord = abs(normCoord);\n' +
			'	normCoord = 0.5 * normCoord + 0.5 *smoothstep(width, height, normCoord + origin) * normCoord;\n' +
			'	normCoord *= s;\n' +
			'	vec2 texCoord = (normCoord / 2.0 + 0.5);\n' +
			'	gl_FragColor = texture2D(source, texCoord);\n' +
			'\n' +
			'} \n';
		return shaderSource;
	},
	inPlace: false,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		x: {
			type: 'number',
			uniform: 'width',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		y: {
			type: 'number',
			uniform: 'height',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		origin: {
			type: 'vector',
			dimensions: 2,
			uniform: 'origin',
			defaultValue: [0.5, 0.5],
			min: 0,
			max: 1
		}
	},
	title: 'Dent',
	categories: ['distort'],
	description: ''
});

}(window));
