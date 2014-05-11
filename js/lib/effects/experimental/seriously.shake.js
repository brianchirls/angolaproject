(function (window, undefined) {
"use strict";

//todo: credit NVIDIA for algorithm and noise table

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } },

	noise_table = [
		[-0.569811,0.432591],
		[0.78118,0.163006],
		[0.436394,-0.297978],
		[0.843762,-0.185742],
		[0.663712,-0.68443],
		[0.616757,0.768825],
		[0.457153,-0.884439],
		[-0.956955,0.110962],
		[0.115821,0.77523],
		[-0.716028,-0.477247],
		[0.819593,-0.123834],
		[-0.522782,-0.586534],
		[-0.792328,-0.577495],
		[-0.674422,0.0572986],
		[-0.224769,-0.764775],
		[0.492662,-0.71614],
		[0.470993,-0.645816],
		[-0.19049,0.321113],
		[0.0122118,0.946426],
		[0.577419,0.408182],
		[-0.0945428,0.341843],
		[0.788332,-0.60845],
		[-0.346889,0.894997],
		[-0.165907,-0.649857],
		[0.791885,0.124138],
		[-0.625952,0.73148],
		[-0.556306,0.580363],
		[0.673523,0.719805],
		[-0.420334,0.894265],
		[-0.141622,-0.279389],
		[-0.803343,0.458278],
		[0.49355,-0.402088],
		[-0.569811,0.432591],
		[0.78118,0.163006],
		[0.436394,-0.297978],
		[0.843762,-0.185742],
		[0.663712,-0.68443],
		[0.616757,0.768825],
		[0.457153,-0.884439],
		[-0.956955,0.110962],
		[0.115821,0.77523],
		[-0.716028,-0.477247],
		[0.819593,-0.123834],
		[-0.522782,-0.586534],
		[-0.792328,-0.577495],
		[-0.674422,0.0572986],
		[-0.224769,-0.764775],
		[0.492662,-0.71614],
		[0.470993,-0.645816],
		[-0.19049,0.321113],
		[0.0122118,0.946426],
		[0.577419,0.408182],
		[-0.0945428,0.341843],
		[0.788332,-0.60845],
		[-0.346889,0.894997],
		[-0.165907,-0.649857],
		[0.791885,0.124138],
		[-0.625952,0.73148],
		[-0.556306,0.580363],
		[0.673523,0.719805],
		[-0.420334,0.894265],
		[-0.141622,-0.279389],
		[-0.803343,0.458278],
		[0.49355,-0.402088],
		[-0.569811,0.432591],
		[0.78118,0.163006]
	];

Seriously.plugin('shake', (function () {
	var baseShader;
	return {
		initialize: function(parent) {
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);
			
			shaderSource.vertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'#define BSIZE 32\n' +
				'#define FULLSIZE 66\n' +
				'#define NOISEFRAC 0.03125\n' +
				'\n' +
				'attribute vec4 position;\n' +
				'attribute vec2 texCoord;\n' +
				'\n' +
				'uniform vec3 srsSize;\n' +
				'uniform mat4 projection;\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform float time;\n' +
				'uniform float speed;\n' +
				'uniform float timeScale;\n' +
				'\n' +
				'float vertex_noise(float2 v) {\n' +
				'	v += vec2(NO_NEG_HACK);\n' +
				'	vec2 i = fract(v * NOISEFRAC) * BSIZE;\n' +
				'	vec2 f = fract(v);\n' +
				'	vec2 p = vec2( noise_table[ i.x ].w, noise_table[ i.x + 1 ].w);, \n' +
				'	p += vec2(i.y);\n' +
				'\n' +
				'\n' +
				'\n' +
				'\n' +
				'\n' +
				'void main(void) {\n' +
				'   c = cos(angle);\n' +
				'   s = sin(angle);\n' +
				'	t = abs(c + s);\n' +
				'\n' +
				'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
				'	gl_Position = transform * pos;\n' +
				'	gl_Position.z -= srsSize.z;\n' +
				'	gl_Position = projection * gl_Position;\n' +
				'	gl_Position.z = 0.0;\n' + //prevent near clipping
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'varying float c;\n' +
				'varying float s;\n' +
				'varying float t;\n' +
				'\n' +
				'uniform sampler2D sourceA;\n' +
				'uniform sampler2D sourceB;\n' +
				'uniform float split;\n' +
				'uniform float angle;\n' +
				'uniform float fuzzy;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 pixel1 = texture2D(sourceA, vTexCoord);\n' +
				'	vec4 pixel2 = texture2D(sourceB, vTexCoord);\n' +
				'	gl_FragColor = mix(pixel2, pixel1, smoothstep((split - fuzzy * (1.0 - split)) * t, (split + fuzzy * split) * t, c * vTexCoord.x + s * vTexCoord.y));\n' +
				'}\n';
			
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {

			uniforms['noise_table'] = sobelMatrixConstants;

			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
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
			timeScale: {
				type: 'number',
				uniform: 'timeScale',
				defaultValue: 1
			},
			shake: {
				type: 'number',
				uniform: 'shake',
				defaultValue: 0.25,
				min: 0,
				max: 1
			},
			sharpness: {
				type: 'number',
				uniform: 'sharpness',
				defaultValue: 2.2,
				min: 0
			}
		},
		description: 'Split screen or wipe',
		title: 'Split'
	};
}()) );

}(window));
