/* global define, require */
/*
Lens Flare Effect
http://john-chapman-graphics.blogspot.com/2013/02/pseudo-lens-flare.html
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

	Seriously.plugin('poisson', function () {
		var edgeShader,
			edgeBuffer,
			fbs,
			gl;
var opts = {
	clear: false
};
		return {
			initialize: function (parent) {
				gl = this.gl;

				parent();

				edgeBuffer = new Seriously.util.FrameBuffer(gl, this.width, this.height);
				this.uniforms.edge = edgeBuffer.texture;
				fbs = [
					//new Seriously.util.FrameBuffer(gl, this.width, this.height),
					//new Seriously.util.FrameBuffer(gl, this.width, this.height)
					this.frameBuffer,
					this.frameBuffer //as long as an even number of iterations
				];

				//todo: gonna need a ping-pong texture
			},
			shader: function (inputs, shaderSource) {
				var vertex = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',

					'#define N 8',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'varying vec2 vTexCoord;',
					'varying vec2 neighbors[N];',

					'void main(void) {',
					//todo: scale and position mask and top to match source
					/*
					// first convert to screen space
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',

					// convert back to OpenGL coords
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',
					'	gl_Position.w = screenPosition.w;',
					*/
					'	gl_Position = position;',
					'	vTexCoord = texCoord;',

					'	neighbors[0] = vTexCoord + vec2(-1.0, 0.0) / resolution;',
					'	neighbors[1] = vTexCoord + vec2(1.0, 0.0) / resolution;',
					'	neighbors[2] = vTexCoord + vec2(1.0, 0.0) / resolution;',
					'	neighbors[3] = vTexCoord + vec2(-1.0, 0.0) / resolution;',
					'	neighbors[4] = vTexCoord + vec2(-1.0, 1.0) / resolution;',
					'	neighbors[5] = vTexCoord + vec2(1.0, 1.0) / resolution;',
					'	neighbors[6] = vTexCoord + vec2(1.0, -1.0) / resolution;',
					'	neighbors[7] = vTexCoord + vec2(-1.0, -1.0) / resolution;',
					'}\n'
				].join('\n');

				edgeShader = new Seriously.util.ShaderProgram(this.gl, vertex, [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',

					'#define N 8',
					'#define THRESHOLD 0.5',

					'uniform sampler2D mask;',

					'varying vec2 vTexCoord;',
					'varying vec2 neighbors[N];',

					'void main(void) {',
					/*
					todo: discard if current pixel is at the edge of the image
					'	if (any(lessThan(vTexCoord, vec2(0.0))) || any(greaterThanEqual(vTexCoord, vec2(1.0)))) {',
					'		discard;',
					'	}',
					*/
					'	float maskVal = texture2D(mask, vTexCoord).r;',
					'	if (maskVal <= THRESHOLD) {',
					'		discard;',
					'	}',

					'	if (texture2D(mask, neighbors[0]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[1]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[2]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[3]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[4]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[5]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[6]).r <= THRESHOLD ||',
					'		texture2D(mask, neighbors[7]).r <= THRESHOLD) {',

					'		gl_FragColor = vec4(vec3(1.0), maskVal);',
					'	} else {',
					'		gl_FragColor = vec4(vec3(0.0), maskVal);',
					'	}',
					'}'
				].join('\n'));

				shaderSource.vertex = vertex;
				shaderSource.fragment = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',

					'#define THRESHOLD 0.5',
					'#define N 8',
					'#define fN 8.0',

					'uniform sampler2D source;',
					'uniform sampler2D top;',
					'uniform sampler2D edge;',

					'varying vec2 vTexCoord;',
					'varying vec2 neighbors[N];',

					'void main(void) {',
					'	vec4 sourcePixel = texture2D(source, vTexCoord);',
					'	vec4 edgePixel = texture2D(edge, vTexCoord);',

					'	if (edgePixel.a <= THRESHOLD) {',
					'		gl_FragColor = sourcePixel;',
					'		return;',
					'	}',

					'	vec3 sumf = vec3(0.0);',
					'	vec3 sumfstar = vec3(0.0);',
					'	vec3 sumvq = vec3(0.0);',
					'	vec4 topPixel = texture2D(top, vTexCoord);',

					//todo: if topPixel.a < 1.0, blend it with bottom pixel first

					'	if (topPixel.a > 0.0) {',
					'		if (edgePixel.r <= THRESHOLD) {',

					//	not an edge
					'			for (int i = 0; i < N; i++) {',
					'				sumf += texture2D(source, neighbors[i]).rgb;',
					'				sumvq += topPixel.rgb - texture2D(top, neighbors[i]).rgb;',
					'			}',

					'		} else {',
					//	edge
					'			vec3 fp = sourcePixel.rgb;',
					'			vec3 gp = topPixel.rgb;',
					'			for (int i = 0; i < N; i++) {',
					'				vec3 fq = texture2D(source, neighbors[i]).rgb;',
					'				vec3 gq = texture2D(top, neighbors[i]).rgb;',
					'				sumfstar += fq;',
					'				vec3 subf = abs(fp - fq);',
					'				vec3 subg = abs(gp - gq);',
					'				sumvq += min(subf, subg);',
					'			}',

					'		}',
					//'		vec3 error = abs(fp - sourcePixel.rgb);',
					'		gl_FragColor = vec4((sumf + sumfstar + sumvq) / fN, sourcePixel.a);',
					'	} else {',
					'		gl_FragColor = sourcePixel;',
					'	}',

					'}'
				].join('\n');

				return shaderSource;
			},
			resize: function () {
				if (edgeBuffer) {
					edgeBuffer.resize(this.width, this.height);
				}
				if (fbs) {
					fbs[0].resize(this.width, this.height);
					fbs[1].resize(this.width, this.height);
				}
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var i;
				//var fb;
				//var start = performance.now();

				if (!this.inputs.mask || !this.inputs.top) {
					//todo: maybe just use source input texture? remember to save ours
					draw(this.baseShader, model, uniforms, frameBuffer);
					return;
				}

				draw(edgeShader, model, uniforms, edgeBuffer.frameBuffer);

				shader.use();
				gl.viewport(0, 0, this.width, this.height);
				gl.enableVertexAttribArray(shader.location.position);
				gl.enableVertexAttribArray(shader.location.texCoord);

				gl.bindBuffer(gl.ARRAY_BUFFER, model.texCoord);
				gl.vertexAttribPointer(shader.location.texCoord, model.texCoord.size, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, model.vertex);
				gl.vertexAttribPointer(shader.location.position, model.vertex.size, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.index);

				gl.disable(gl.DEPTH_TEST);
				gl.disable(gl.BLEND);

				//bind uniforms

				shader.uniforms.resolution.set(uniforms.resolution);

				//source
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, uniforms.source.texture);
				shader.uniforms.source.set(0);

				//top
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, uniforms.top.texture);
				shader.uniforms.top.set(1);

				//edge
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, edgeBuffer.texture);
				shader.uniforms.edge.set(2);

				gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

				//clear once
				gl.clearColor(0.0, 0.0, 0.0, 0.0);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

				gl.drawElements(model.mode, model.length, gl.UNSIGNED_SHORT, 0);

				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, this.texture);
				shader.uniforms.source.set(0);

				for (i = 1; i < this.inputs.iterations; i++) {
					gl.drawElements(model.mode, model.length, gl.UNSIGNED_SHORT, 0);
				}

				/*
				for (i = 0; i < 30; i++) {
					fb = fbs[i % 2];
					gl.bindFramebuffer(gl.FRAMEBUFFER, fb.frameBuffer);
					//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
					gl.drawElements(model.mode, model.length, gl.UNSIGNED_SHORT, 0);

					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, fb.texture);
					shader.uniforms.source.set(0);
				}
				*/

				/*
				uniforms.source = this.inputs.source;
				for (i = 0; i < 30; i++) {
					fb = fbs[i % 2];
					draw(shader, model, uniforms, fb.frameBuffer, null, opts);
					uniforms.source = fb.texture;
				}
				//*/

				//console.log(performance.now() - start);
			}
			//todo: delete textures, shaders
		};
	},
	{
		inPlace: false,
		commonShader: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			top: {
				type: 'image',
				uniform: 'top'
			},
			mask: {
				type: 'image',
				uniform: 'mask'
				//todo: cannot assume map, source and 
			},

			//todo: time limit mode
			iterations: {
				type: 'number',
				defaultValue: 30,
				min: 1,
				max: 100,
				step: 1
			}
		},
		title: 'Poisson Image Edit'
	});
}));
