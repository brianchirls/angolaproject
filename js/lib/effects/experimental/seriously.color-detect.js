(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

//todo: implement destroy

Seriously.plugin('color-detect', (function () {
	var pyramid = [],
		pyramidSize,
		width, height,
		prevWidth, prevHeight,
		baseShader,
		baseReduceShader,
		reduceShader;

	function destroyPyramid() {
		var i, level;

		//first clean out any old pyramid
		while (level = pyramid.shift()) {
			level.frameBuffer.destroy();
		}		
	}

	function buildPyramid(gl) {
		var levels, i,
			size,
			bigSize2;
		destroyPyramid();
		size = Math.max(width, height);
		levels = Math.ceil(Math.log(size) / Math.log(2));

		/*
		if (!levels) {
			pyramid.push({
				size: 1,
				frameBuffer: new Seriously.util.FrameBuffer(gl, 1, 1),
				data: new Uint8Array(4),
				cellArea: 1
			})
			return;
		}
		*/

		bigSize2 = Math.pow(2, levels * 2);
		for (i = levels; i >= 0; i--) {
			size = Math.pow(2, i);
			pyramid.push({
				size: size,
				frameBuffer: new Seriously.util.FrameBuffer(gl, size, size),
				data: new Uint8Array(size * size * 4),
				cellArea: bigSize2 / (size * size)
			});
			gl.bindTexture(gl.TEXTURE_2D, pyramid[pyramid.length - 1].frameBuffer.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		}

		//pyramidSize = pyramid[0].size;
	}

	return {
		initialize: function(parent) {
			var gl = this.gl,
				source = this.inputs.source;

			if (source) {
				width = source.width || source.original && (
					source.original.naturalWidth || source.original.videoWidth || source.original.width);
				height = source.height || source.original && (
					source.original.naturalHeight || source.original.videoHeight || source.original.height);
				if (width && height) {
					prevWidth = width;
					prevHeight = height;
					buildPyramid(gl);
				}
			}

			//this.particleFrameBuffer = new Seriously.util.FrameBuffer(gl, 1, this.height/2);
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			var round = '#ifndef PACK_INT_ROUND\n' +
				'float _packIntRound(float val) {\n' +
				//'	return val;\n' +
				'	return floor(val) + step(0.5, fract(val));\n' +
				'}\n' +
				'#define PACK_INT_ROUND\n' +
				'#endif\n',
				packInt = round +
				'vec4 packInt(const in float val) {\n' +
				'	const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);\n' +
				'	const float mask = 255.0;\n' +
				//'	return vec4(0.0, 0.0, 0.0, _packIntRound(val) / 255.0);\n' +
				'	return mod(floor(_packIntRound(val) / bit_shift), mask) / 255.0;\n' +
				'}\n',
				unpackInt = round + 'float unpackInt(const in vec4 rgba) {\n' +
				'	const vec4 bit_shift = vec4(256.0*256.0*255.0, 256.0*255.0, 255.0, 1.0);\n' +
				//'	return _packIntRound(rgba.a * 255.0);\n' +
				'	return _packIntRound(dot(rgba, bit_shift) * 255.0);\n' +
				'}\n';

			baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);
			
			baseReduceShader = new Seriously.util.ShaderProgram(this.gl, '#ifdef GL_ES\n' +
				'precision highp float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec3 position;\n' +
				'attribute vec2 texCoord;\n' +
				'\n' +
				'uniform vec2 scale;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_Position = vec4(scale * position.xy, position.z, 1.0);\n' +
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n',

				'#ifdef GL_ES\n\n' +
				'precision highp float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform vec3 color;\n' +
				'uniform float dist;\n' +
				'uniform vec2 delta;\n' +
				'\n' +
				packInt +
				'float match(vec2 coord) {\n' +
				'	vec3 pixel = texture2D(source, coord).rgb;\n' +
				'	return step(distance(color, pixel), dist);\n' +
				'}\n' +
				'\n' +
				'void main(void) {\n' +
/*				'	float total = match(vTexCoord - delta.xy) +\n' +
				'		match(vTexCoord + delta.xy) +\n' +
				'		match(vTexCoord + vec2(-delta.x, delta.y)) +\n' +
				'		match(vTexCoord + vec2(delta.x, -delta.y));\n' +
*/
				'	float total = match(vTexCoord);\n' +
				'	gl_FragColor = vec4(0.0, 0.0, 0.0, total/255.0);\n' + //don't need to pack 'cause total <= 4
				//'	gl_FragColor = vec4(total, total/4.0, total/8.0, 1.0);\n' + //don't need to pack 'cause total <= 4
				//'	gl_FragColor = packInt(total);\n' +
				//'	gl_FragColor = vec4(1.0, total, 0.5, 1.0);\n' +
				'}\n');

			reduceShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex,
				'#ifdef GL_ES\n\n' +
				'precision highp float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform vec3 color;\n' +
				'uniform float dist;\n' +
				'uniform vec2 delta;\n' +
				'\n' +
				packInt +
				unpackInt +
				'float getSample(vec2 coord) {\n' +
				'	return unpackInt(texture2D(source, coord));\n' +
				'}\n' +
				'\n' +
				'void main(void) {\n' +
				'	float total = getSample(vTexCoord + delta.xx) +\n' +
				'		getSample(vTexCoord + delta.yx) +\n' +
				'		getSample(vTexCoord + delta.xy) +\n' +
				'		getSample(vTexCoord + delta.yy);\n' +
				'	gl_FragColor = packInt(total);\n' +

				//'	gl_FragColor = vec4(gl_FragColor.a, 0.0, 0.0, total/255.0);\n' + //don't need to pack 'cause total <= 4
				//'	gl_FragColor = vec4(total/4.0, total/4.0, total/4.0, 1.0);\n' +
				'}\n');

			return baseShader;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			var i, level,
				gl = this.gl,
				source = this.inputs.source;

			function decode(arr, i)  {
				var a = arr.subarray(i, i + 4);
				var x = (a[0] << 24) + (a[1] << 16) + (a[2] << 8) + a[3];
				return x
			}

			if (!this.width || !this.height || !gl) {
				return;
			}

			width = source.width || source.original && (
				source.original.naturalWidth || source.original.videoWidth || source.original.width);
			height = source.height || source.original && (
				source.original.naturalHeight || source.original.videoHeight || source.original.height);
			if (width !== prevWidth || height !== prevHeight || !pyramid.length) {
				prevWidth = width;
				prevHeight = height;
				buildPyramid();
			}


			level = pyramid[0];
			uniforms.scale = [width / (level.size * 1), height /  (level.size * 1)]; //flipped
			//uniforms.delta = [0.5/width, 0.5/height]; //todo: fix this
			parent(baseReduceShader, model, uniforms, level.frameBuffer.frameBuffer, null, {
				blend: false,
				width: level.size,
				height: level.size
			});
gl.readPixels(0,0, level.size, level.size, gl.RGBA, gl.UNSIGNED_BYTE, level.data);
	

			for (i = 1; i < pyramid.length; i++) {
				uniforms.source = level.frameBuffer.texture;
				level = pyramid[i];
				uniforms.delta = [0.5/level.size, -0.5/level.size];
				parent(reduceShader, model, uniforms, level.frameBuffer.frameBuffer, null, {
					blend: false,
					width: level.size,
					height: level.size
				});
gl.readPixels(0,0, level.size, level.size, gl.RGBA, gl.UNSIGNED_BYTE, level.data);
			}

			//todo: put vars at top
			var coord, j, queue, regions = [], next, fract,
				x, y;
			i = pyramid.length - 1;
			queue = [{
				x: 0, y: 0, w: 1, h: 1, level: pyramid.length - 1
			}];
			while (coord = queue.shift()) {
				level = pyramid[coord.level];
				gl.bindFramebuffer(gl.FRAMEBUFFER, level.frameBuffer.frameBuffer);
				gl.readPixels(coord.x, coord.y, coord.w, coord.h, gl.RGBA, gl.UNSIGNED_BYTE, level.data);

				for (j = (coord.w * coord.h - 1) * 4; j >= 0; j -= 4) {

					fract = decode(level.data, j) / level.cellArea;
					if (fract > 0.95 || !coord.level && fract) {
						x = (j / 4) % coord.h;
						y = Math.floor(j / 4 / coord.h);
						console.log('win!', fract, coord, x, y);
					} else if (fract) {
						next = pyramid[coord.level - 1];
						x = (j / 4) % coord.h;
						y = Math.floor(j / 4 / coord.h);
						queue.push({
							x: (coord.x + x) * 2,
							y: (coord.y + y) * 2,
							w: 2,
							h: 2,
							level: coord.level - 1
						})
					}
				}
			}
//return;
			uniforms.source = pyramid[0].frameBuffer.texture;
			parent(baseShader, model, uniforms, frameBuffer, null, {
				blend: false
			});
		},
		destroy: function() {
			destroyPyramid();
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [1, 0, 0, 1] //red
			},
			distance: {
				type: 'number',
				uniform: 'dist',
				defaultValue: 0.1,
				min: 0,
				max: 1
			}
		},
		description: '',
		title: 'Color Detect'
	};
}()) );

}(window));
