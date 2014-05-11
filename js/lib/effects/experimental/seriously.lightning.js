(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('lightning', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +

			'uniform float time;\n' +
			'uniform float speed;\n' +
			'uniform float noise;\n' +
			'uniform float sampledist;\n' +
			'uniform float height;\n' +
			'uniform float glowfalloff;\n' +
			'uniform float glowstrength;\n' +
			'uniform float ambientglow;\n' +
			'uniform float ambientglowheightscale;\n' +
			'uniform vec4 color;\n' +
			'uniform sampler2D noisesampler;\n' +

			utilities.shader.noiseHelpers +
			utilities.shader.snoise2d +
			utilities.shader.random +

			'void main() {\n' +
//			'	vec4 color = vec4(0.965, 0.624, 1.0, 1.0);\n' +
			'	vec2 t = vec2(speed * time * .5871 - noise * abs(vTexCoord.y), speed * time);\n' +
			'	float xs0 = vTexCoord.x - sampledist;\n' +
			'	float xs1 = vTexCoord.x;\n' +
			'	float xs2 = vTexCoord.x + sampledist;\n' +
			'	float noise0 = snoise(vec2(xs0 , t.y + (t.x * .3)) );	// Change t.y + (t.x * .3) to t.y - etc. to see a sucking electricity\n' +
			'	float noise1 = snoise(vec2(xs1 , t.y + (t.x * .3)) );\n' +
			'	float noise2 = snoise(vec2(xs2 , t.y + (t.x * .3)) );\n' +
			'	float mid0 = height * (noise0 * 2.0 - 1.0) * (1.0 - xs0 * xs0);\n' +
			'	float mid1 = height * (noise1 * 2.0 - 1.0) * (1.0 - xs1 * xs1);\n' +
			'	float mid2 = height * (noise2 * 2.0 - 1.0) * (1.0 - xs2 * xs2);\n' +
			'	float dist0 = abs(vTexCoord.y - mid0);\n' +
			'	float dist1 = abs(vTexCoord.y - mid1);\n' +
			'	float dist2 = abs(vTexCoord.y - mid2);\n' +
			' \n' +
			'	float glow = 1.0 - pow(0.25 * (dist0 + 2.0 * dist1 + dist2), glowfalloff);\n' +
			' \n' +
			'	float amb = ambientglow * (1.0 - xs1 * xs1) * (1.0 - abs(ambientglowheightscale * vTexCoord.y) );\n' +
			'	//float amb = 0.0;\n' +
			' \n' +
			'	vec4 final = (glowstrength * glow * glow + amb) * color;\n' +
			'	//final *= .75;\n' +
			'	gl_FragColor = final;\n' +
			'}\n';
		return shaderSource;
	},
	inPlace: true,
	inputs: {
		color: {
			type: 'color',
			uniform: 'color',
			defaultValue: [0.965, 0.624, 1.0, 1.0]
		},
		time: {
			type: 'number',
			uniform: 'time',
			defaultValue: 0
		},
		speed: {
			type: 'number',
			uniform: 'speed',
			defaultValue: 0.25
		},
		noise: {
			type: 'number',
			uniform: 'noise',
			defaultValue: 0.78
		},
		sampledist: {
			type: 'number',
			uniform: 'sampledist',
			defaultValue: 0.0076
		},
		amplitude: {
			type: 'number',
			uniform: 'height',
			defaultValue: 0.44
		},
		glowfalloff: {
			type: 'number',
			uniform: 'glowfalloff',
			defaultValue: 0.024
		},
		glowstrength: {
			type: 'number',
			uniform: 'glowstrength',
			defaultValue: 144
		},
		ambientglow: {
			type: 'number',
			uniform: 'ambientglow',
			defaultValue: 144
		},
		glowheight: {
			type: 'number',
			uniform: 'ambientglowheightscale',
			defaultValue: 1.68
		}
	},
	title: 'Lightning',
	description: 'Lightning'
});

}(window));
