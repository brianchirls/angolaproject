(function (window, undefined) {
"use strict";
/*
inspired by: http://devmaster.net/posts/shader-effects-old-film
*/
window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('filmscratch', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n' +
			utilities.shader.noiseHelpers +
			utilities.shader.snoise2d +
			utilities.shader.random +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'uniform float amount;\n' +
			'uniform float timer;\n' +
			'\n' +
			'const float xPeriod = 8.0;\n' +
			'const float yPeriod = 1.0;\n' +
			'const float pi = 3.141592;\n' +
			'\n' +
			'void main(void) {\n' +
			'	vec4 pixel = texture2D(source, vTexCoord);\n' +
			'	float r1 = random(vec2(timer));\n' +
			'	float r2 = random(vec2(timer + 1024.0));\n' +
			'	if (r1 < amount && distance(vTexCoord, vec2(r2 * amount)) < 0.4) {\n' +
			'		float turbulence = snoise(vTexCoord * 2.5);\n' +
			'		float scratch = 0.5 + (sin(((vTexCoord.x * xPeriod + vTexCoord.y * yPeriod + turbulence)) * pi + timer) * 0.5);\n' +
			'		scratch = clamp((scratch * 10000.0) + 0.35, 0.0, 1.0);\n' +
			'		pixel.xyz *= scratch;\n' +
			'	}\n' +
			'	gl_FragColor = pixel;\n' +
//			'	gl_FragColor = vec4(r, r, r, 1.0);\n' +
//			'	gl_FragColor.rgb = vec3(distance(vTexCoord, vec2(r * amount)));\n' +
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
		amount: {
			type: 'number',
			uniform: 'amount',
			min: 0,
			max: 1,
			defaultValue: 0.2
		},
		timer: {
			type: 'number',
			uniform: 'timer',
			step: 1,
			defaultValue: 0
		}
	},
	title: 'Film Scratches',
	description: ''
});

}(window));
