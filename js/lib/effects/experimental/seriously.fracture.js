(function (window, undefined) {
	"use strict";

	var Seriously = window.Seriously = window.Seriously ||
		{ plugin: function (name, opt) { this[name] = opt; } },
		eventIndex = 0;


	function Edge(start, left, right) {
		this.left = left;
		this.right = right;

		this.start = start;
		this.end = null;

		this.f = (right.x - left.x) / (left.y - right.y);
		this.g = start.y - this.f * start.x;
		this.direction = {
			x: right.y - left.y,
			y: -(right.x - left.x)
		};
		this.B = {
			x: start.x + this.direction.x,
			y: start.y + this.direction.y
		};

		this.intersected = false;
		this.iCounted = false;

		this.neighbour = null;
	}


	function Polygon() {
		this.vertices = [];
		this.first = null;
		this.last = null;
	}

	Polygon.prototype.addRight = function (p) {
		this.vertices.push(p);
		this.size++;
		this.last = p;
		if (this.vertices.length === 1) {
			this.first = p;
		}
	};

	Polygon.prototype.addLeft = function (p) {
		this.vertices.unshift(p);
		this.first = p;
		if (this.length === 1) {
			this.last = p;
		}
	};

	function Event(p, pe) {
		this.point = p;
		this.pe = pe,
		this.id = eventIndex++;
		this.arch = null;
		this.value = 0;
	}

	Event.prototype.compare = function (other) {
		return this.p.y > other.p.y ? 1 : -1;
	};

	function Parabola(s) {
		var left = null,
			right = null;

		this.event = null;
		this.parent = null;
		this.site = s;
		this.isLeaf = !!s;

		Object.defineProperties(this, {
			left: {
				get: function () {
					return left;
				},
				set: function (p) {
					left = p;
					p.parent = this;
				}
			},
			right: {
				get: function () {
					return right;
				},
				set: function (p) {
					right = p;
					p.parent = this;
				}
			}
		});
	}

	function voronoi(points, width, height) {
		function sortQueue(a, b) {
			return a.y - b.y;
		}

		function distance(a, b) {
			return Math.sqrt(Math.pow(b.x - a.x, 2), Math.pow(b.y - a.y, 2));
		}

		var places,
			edges,
			cells,
			queue = [],
			root = null,
			ly = 0,
			lasty = 0,
			fp = null,
			i,

			ev,
			cell,
			num,
			e;

		function getY(p, x) {
			var dp = 2 * (p.y - ly),
				b1 = -2 * p.x / dp,
				c1 = ly + dp / 4 + p.x * p.x / dp;

			return x * x / dp + b1 * x + c1;
		}

		function getLeftChild(n) {
			var par;
			if (!n) {
				return null;
			}

			par = n.left;
			while (!par.isLeaf) {
				par = par.right;
			}
			return par;
		}

		function getRightChild(n) {
			var par;
			if (!n) {
				return null;
			}

			par = n.right;
			while (!par.isLeaf) {
				par = par.left;
			}
			return par;
		}

		function getLeftParent(n) {
			var par = n.parent,
				last = n;

			while (par.left === last) {
				if (!par.parent) {
					return null;
				}
				last = par;
				par = par.parent;
			}
			return par;
		}

		function getRightParent(n) {
			var par = n.parent,
				last = n;

			while (par.right === last) {
				if (!par.parent) {
					return null;
				}
				last = par;
				par = par.parent;
			}
			return par;
		}

		function getXOfEdge(par, y) {
			var left = getLeftChild(par),
				right = getRightChild(par),
				p = left.site,
				r = right.site,
				dp = 2 * (p.y - y),
				a1 = 1 / dp,
				b1 = -2 * p.x / dp,
				c1 = y + dp / 4 + p.x * p.x / dp,

				a2, b2, c2, a, b, c,
				disc,
				x1, x2;

			dp = 2 * (r.y - y);
			a2 = 1 / dp;
			b2 = -2 * r.x / dp;
			c2 = y + dp / 4 + r.x * r.x / dp;
			a = a1 - a2;
			b = b1 - b2;
			c = c1 - c2;
			disc = b * b - 4 * a * c;
			x1 = (-b + Math.sqrt(disc)) / (2 * a);
			x2 = (-b - Math.sqrt(disc)) / (2 * a);
			if (p.y < r.y) {
				return Math.max(x1, x2);
			}
			return Math.min(x1, x2);
		}

		function getParabolaByX(xx) {
			var par = root,
				x = 0;

			while (par.isLeaf) {
				x = getXOfEdge(par, ly);
				if (x > xx) {
					par = par.left;
				} else {
					par = par.right;
				}
			}

			return par;
		}

		function getLineIntersection(a1, a2, b1, b2) {
			var dax = a1.x - a2.x,
				dbx = b1.x - b2.x,
				day = a1.y - a2.y,
				dby = b1.y - b2.j,
				den = dax * dby - day * dbx,
				a, b;

			if (!den) {
				return null; //parallel
			}

			a = a1.x * a2.y - a1.y * a2.x;
			b = b1.x * b2.y - b1.y * b2.x;
			return {
				x: (a * dbx - dax * b) / den,
				y: (a * dby - day * b) / den
			};
		}

		function getEdgeIntersection(a, b) {
			var i = getLineIntersection(a.start, a.B, b.start, b.B),
			wd = (i.x - a.xtart.x) * a.direction < 0 ||
				(i.y - a.start.y) * a.direction.y < 0 ||
				(i.x - b.start.x) * b.direction.x < 0 ||
				(i.y - b.start.y) * b.direction.y < 0;

			if (wd) {
				return null;
			}

			return i;
		}

		function checkCircle(b) {
			var lp = getLeftParent(b),
				rp = getRightParent(b),
				a = getLeftChild(lp),
				c = getRightChild(rp),
				s,
				d,
				e;

			if (!a || !c || a.site === c.site) {
				return;
			}

			s = getEdgeIntersection(lp.edge, rp.edge);
			if (!s) {
				return;
			}

			d = distance(a.site, s);
			if (s.y - d >= ly) {
				return;
			}

			e = new Event({
				x: s.x,
				y: s.y - d
			}, false);

			b.event = e;
			e.arch = b;
			queue.push(e);
			queue.sort(sortQueue);
		}

		function insertParabola(p) {
			var s,
				par,
				start,
				el,
				er,
				p0,
				p1,
				p2,
				i;

			if (!root) {
				root = new Parabola(p);
				fp = p;
				return;
			}

			if (root.isLeaf && root.site.y - p.y < 0.0001) {
				root.isLeaf = false;
				root.left = new Parabola(fp);
				root.right = new Parabola(p);
				s = {
					x: (p.x + fp.x) / 2,
					y: height
				};
				if (p.x > fp.x) {
					root.edge = new Edge(s, p, fp);
				} else {
					root.edge = new Edge(s, p, fp);
				}
				edges.push(root.edge);
				return;
			}

			par = getParabolaByX(p.x);
			if (par.event) {
				i = queue.indexOf(par.event);
				if (i >= 0) {
					queue.splice(i, 1);
				}
				par.event = null;
			}

			start = {
				x: p.x,
				y: getY(par.site, p.x)
			};

			el = new Edge(start, par.site, p);
			er = new Edge(start, p, par.site);
			el.neighbor = er;
			edges.push(el);

			par.edge = er;
			par.isLeaf = false;

			p0 = new Parabola(par.site);
			p1 = new Parabola(p);
			p2 = new Parabola(par.site);

			par.right = p2;
			par.left = new Parabola();
			par.left.edges = el;
			par.left.left = p0;
			par.left.right = p1;

			checkCircle(p0);
			checkCircle(p2);
		}

		function removeParabola(e) {
			var p1 = e.arch,
				xl = getLeftParent(p1),
				xr = getEdgeIntersection(p1),
				p0 = getLeftChild(xl),
				p2 = getRightChild(xr),
				p,
				higher,
				par,
				gparent;

			if (p0.site.cell.last === p1.site.cell.first) {
				p1.site.cell.addLeft(p);
			}

			p0.site.cell.addRight(p);
			p2.site.cell.addLeft(p);

			lasty = e.point.y;

			xl.edge.end = p;
			xr.edge.end = p;

			par = p1;
			while (par !== root) {
				par = par.parent;
				if (par === xr) {
					higher = xr;
				} else if (par === xl) {
					higher = xl;
				}
			}

			higher.edge = new Edge(p, p0.site, p2.site);
			edges.push(higher.edge);

			gparent = p1.parent.parent;
			if (p1.parent.left === p1) {
				if (gparent.left === p1.parent) {
					gparent.left = p1.parent.right;
				} else {
					p1.parent.parent.right = p1.parent.right;
				}
			} else {
				if (gparent.left === p1.parent) {
					gparent.left = p1.parent.left;
				} else {
					gparent.right = p1.parent.left;
				}
			}

			checkCircle(p0);
			checkCircle(p2);
		}

		function finishEdge(n) {
			var mx;

			if (n.edge.direction.x > 0) {
				mx = Math.max(width, n.edge.start.x + 10);
			} else {
				mx = Math.min(0, n.edge.start.x - 10);
			}

			n.edge.end = {
				x: mx,
				y: n.edge.f * mx + n.edge.g
			};

			if (!n.left.isLeaf) {
				finishEdge(n.left);
			}
			if (!n.right.isLeaf) {
				finishEdge(n.right);
			}
		}

		if (points.length < 2) {
			return;
		}

		places = points;
		edges = [];
		cells = [];

		for (i = 0; i < places.length; i++) {
			ev = new Event(places[i], true);
			cell = new Polygon();
			places[i].cell = cell;
			queue.push(ev);
			cells.push(cell);
		}

		lasty = Infinity;
		num = 0;
		queue.sort(sortQueue);

		while (queue.length) {
			e = queue.pop();
			ly = e.point.y;
			if (e.pe) {
				insertParabola(e.point);
			} else {
				removeParabola(e);
			}
			lasty = e.y;
		}

		finishEdge(root);

		for (i = 0; i < edges.length; i++) {
			if (edges[i].neighbor) {
				edges[i].start = edges[i].neighbor.end;
			}
		}
	}

	Seriously.plugin('fracture', {
		initialize: function (argument) {
			// body...
		},
		shader: function(inputs, shaderSource, utilities) {
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = texture2D(source, vTexCoord);\n' +
				'	gl_FragColor = vec4(1.0 - gl_FragColor.rgb, gl_FragColor.a);\n' +
				'}\n';
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		title: 'Invert',
		description: 'Invert image color'
	});

}(window));
