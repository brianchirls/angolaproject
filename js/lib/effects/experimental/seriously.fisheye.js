(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('fisheye', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform float theta;\n' +
			'\n' +
			'void main(void) {\n' +
			'	vec2 uv = vTexCoord - 0.5;\n' +
			'	float z = sqrt(1.0 - uv.x * uv.x - uv.y * uv.y);\n' +
//			'	float a = 1.0 / (z * tan(theta * 0.5));\n' +
			'	float a = (z * tan(theta * 0.5)) / 1.0;\n' +
			'	gl_FragColor = texture2D(source, (uv * a) + 0.5);\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		theta: {
			type: 'number',
			uniform: 'theta',
			defaultValue: 0.5,
			min: -10,
			max: 10
		}
	},
	title: 'Fish Eye',
	description: 'Fish Eye Lense'
});

}(window));
