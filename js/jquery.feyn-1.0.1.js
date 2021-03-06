/* jQuery.Feyn.js, version 1.0.1, MIT License
 * plugin for drawing Feynman diagrams with SVG
 *
 * https://github.com/photino/jquery-feyn
 *
 * author: Zan Pan <panzan89@gmail.com>
 * date: 2014-2-28
 *
 * usage: $(container).feyn(options);
*/

;(function($) {
'use strict';

// add method to jQuery prototype
$.fn.feyn = function(options) {

  // iterate over the current set of matched elements
  return this.each(function() {

    // return early if this element already has an instance
    if($(this).data('feyn')) {
      return;
    }

    // create an Feyn instance
    try {
      $(this).html(new Feyn(this, options).output());
      $(this).data('feyn', true);
    } catch(error) {
      $(this).html('JavaScript ' + error.name + ': ' + error.message);
    }

  });

};

// create Feyn object as a constructor
var Feyn = function(container, options) {

  // count instances
  Feyn.counter = (Feyn.counter || 0) + 1;
  Feyn.prefix = 'feyn' + (Feyn.counter > 1 ? Feyn.counter : '');

  // merge options with defaults
  var opts = $.extend(true, {
      xmlns: 'http://www.w3.org/2000/svg', // the "xmlns" attribute of <svg>
      xlink: 'http://www.w3.org/1999/xlink', // the "xlink:href" attribute of <svg>
      version: '1.1', // the "version" attribute of <svg>
      x: 0, // the "x" attribute of <svg>
      y: 0, // the "y" attribute of <svg>
      width: 200, // the "width" attribute of <svg>
      height: 200, // the "height" attribute of <svg>
      title: '', // the "title" attribute of <svg>
      description: 'Feynman diagram generated by jQuery.Feyn', // the "desc" attribute of <svg>
      standalone: false, // disable the SVG code editor
      selector: false, // don't set the "id" and "class" attributes for SVG elements
      grid: {
        show: false, // don't display a grid system
        unit: 20 // length of subdivision for the grid system
      },
      color: 'black', // global "stroke" attribute for SVG elements
      thickness: 1.6, // global "stroke-width" attribute for SVG elements
      tension: 1, // global parameter of arc radius and zigzag amplitude
      ratio: 1, // global parameter of elliptical arc, i.e. the ratio of y-radius to x-radius
      clockwise: false, // global clockwise parameter for propagators
      incoming: {}, // graph nodes for incoming particles
      outgoing: {}, // graph nodes for outgoing particles 
      vertex: {}, // graph nodes for vertices
      auxiliary: {}, // graph nodes for miscellaneous symbols
      fermion: {
        arrow: true // show arrows for fermion propagators
      },
      photon: {
        period: 5, // the period parameter for photon propagators, i.e. 1/4 of the period of sine curve
        amplitude: 5 // the amplitude parameter for photon propagators, i.e. the amplitude of sine curve
      },
      scalar: {
        arrow: false, // don't show arrows for scalar propagators
        dash: '5 5', // the "stroke-dasharray" attribute for <g> into which scalar propagators are grouped
        offset: 2 // the "stroke-offset" attribute for <g> into which scalar propagators are grouped
      },
      ghost: {
        arrow: true, // show arrows for ghost propagators
        thickness: 3, // direction of arrows for arc and loop ghost propagators
        dotsep: 8, // the "stroke-dasharray" attribute for <g> into which ghost propagators are grouped
        offset: 5 // the "stroke-offset" attribute for <g> into which ghost propagators are grouped
      },
      gluon: {
        width: 15, // the coil width of gluon propagators
        height: 15, // the coil height of gluon propagators
        factor: 0.75, // the factor parameter for gluon propagators
        percent: 0.6, // the percent parameter for gluon propagators
        scale: 1.15 // the scale parameter for gluon arcs and loops
      },
      symbol: {}, // elements for symbols
      node: {
        show: false, // don't show nodes
        thickness: 1, // the "stroke-width" attribute for <g> into which nodes are grouped
        type: 'dot', // the node type
        radius: 3, // the radius parameter of nodes
        fill: 'white' // the "fill" attribute for <g> into which nodes are grouped
      },
      label: {
        family: 'Georgia', // the "font-family" attribute for <g> into which labels are grouped
        size: 15, // the "font-size" attribute for <g> into which labels are grouped
        face: 'italic' // the "font-style" attribute for <g> into which labels are grouped
      },
      image: {}, // include external image
      mathjax: false, // don't use MathJax to typeset mathematics in labels
      ajax: false // don't merge the code of external SVG image directly
    }, options);

  // constants
  var PI = Math.PI;

  // style of propagator for different particles
  var all = {
      fill: 'none', // the "fill" attribute for all SVG elements
      color: opts.color, // the "stroke" attribute for all SVG elements
      thickness: opts.thickness // the "stroke-width" attribute for all SVG elements
    },
    sty = {
      fermion: {}, // the style for fermion propagators
      photon: {}, // the style for photon propagators
      gluon: {}, // the styles for gluon propagators
      scalar: {
        dash: opts.scalar.dash, // the "stroke-dasharray" attribute for scalar propagators
        offset: opts.scalar.offset // the "stroke-offset" attribute for scalar propagators
      },
      ghost: {
        dash: '0.1 ' + opts.ghost.dotsep, // the "stroke-offset" attribute for ghost propagators
        offset: opts.ghost.offset // the "stroke-offset" attribute for ghost propagators
      }
    };
  // set global attributes for propagators
  for(var key in sty) {
    sty[key] = $.extend(true, {}, all, {
      color: opts[key].color,
      thickness: opts[key].thickness,
      linecap: 'round'
    }, sty[key]);
  }

  // graph nodes for Feynman diagram
  var nd = $.extend({},
      opts.incoming,
      opts.outgoing,
      opts.vertex,
      opts.auxiliary
    );
  for(key in nd) {
    // remove extra space characters in node coordinates
    nd[key] = nd[key].replace(/\s/g, ',').split(/,+/, 2);
  }

  // graph edges for Feynman diagram
  var fd = {
    fermion: {},
    photon: {},
    scalar: {},
    ghost: {},
    gluon: {}
  };
  for(var par in fd) {
    fd[par] = $.extend({}, opts[par]);
    for(key in fd[par]) {
      if(!key.match(/line|arc|loop/)) {
        // ensure that graph edges don't have attributes for style
        delete fd[par][key];
      } else {
        // remove extra space characters in edge connections
        fd[par][key] = fd[par][key].replace(/\s/g, '').split(',');
        for(var ind in fd[par][key]) {
          // remove extra dash marks in edge connections
          fd[par][key][ind] = fd[par][key][ind].replace(/-+/g, '-').split('-');
        }
      }
    }
  }

  // attributes for labels
  var lb = {
      sty: {
        fill: opts.label.fill || opts.label.color || all.color,
        color: opts.label.color || all.color,
        thickness: opts.label.thickness || 0,
        family: opts.label.family,
        size: opts.label.size,
        weight: opts.label.weight,
        face: opts.label.face,
        align: opts.label.align || 'middle'
      },
      pos: opts.label
    };
  for(key in lb.pos) {
    if(lb.sty[key]) {
      delete lb.pos[key];
    }
  }

  // collector for SVG elements
  var svg = {
      defs: [], // collector for <defs>
      body: [], // collector for graphics elements
      tags: [ // self-closing tags
        'path',
        'line',
        'rect',
        'circle',
        'ellipse',
        'polygon',
        'polyline',
        'image',
        'use'
      ],
      attr: { // map JavaScript object attributes into SVG attributes
        xlink: 'xmlns:xlink',
        href: 'xlink:href',
        color: 'stroke',
        thickness: 'stroke-width',
        dash: 'stroke-dasharray',
        linecap: 'stroke-linecap',
        linejoin: 'stroke-linejoin',
        offset: 'stroke-dashoffset',
        family: 'font-family',
        size: 'font-size',
        face: 'font-style',
        weight: 'font-weight',
        align: 'text-anchor'
      }
    };

  // create SVG element
  var create = function(elem, attr, sty, child) {
    var str = '';
    attr = $.extend({}, attr, sty);
    for(var key in attr) {
      str += ' ' + (svg.attr[key] || key) + '="' + attr[key] + '"';
    }
    return '<' + elem + str + (svg.tags.indexOf(elem) >= 0 ? '/>' :
      '>' + (elem.match(/title|desc|tspan|body/) ? '': '\n') + (child ?
      child.replace(/</g, '  <').replace(/\s+<\/(title|desc|tspan|body)/g,
      '</$1') : '') + '</' + elem + '>') + '\n';
  };

  // convert float number to string
  var normalize = function() {
    var str = '';
    for(var i = 0, l = arguments.length, item; i < l; i++) {
      item = arguments[i];
      str += ' ' + (typeof item !== 'number' ? item :
        item.toFixed(3).replace(/(.\d*?)0+$/, '$1').replace(/\.$/, ''));
    }
    return $.trim(str).replace(/ ?, ?/g, ',');
  };

  // transform coordinate system
  var system = function(sx, sy, ex, ey) {
    var dx = ex - sx,
      dy = ey - sy;
    return {angle: Math.atan2(dy, dx), distance: Math.sqrt(dx * dx + dy * dy)};
  };

  // set transformation
  var transform = function(x, y, angle) {
    return 'translate(' + normalize(x, ',', y) + ')' +
      (angle ? ' rotate(' + normalize(angle * 180 / PI) + ')' : '');
  };

  // get coordinate pairs
  var point = function(sx, sy, ex, ey, x, y) {
    var ang = Math.atan2(ey - sy, ex - sx);
    return normalize(x * Math.cos(ang) - y * Math.sin(ang) + sx, ',',
      x * Math.sin(ang) + y * Math.cos(ang) + sy);
  };

  // parse position string
  var position = function(pos) {
    return nd[pos] || pos.replace(/\s/g, ',').split(/,+/, 2);
  };

  // set the "id" attribute for SVG elements
  var setId = function(name) {
    return opts.selector ? {id: Feyn.prefix + '_' + name} : {};
  };

  // set the "class" attribute for <g>
  var setClass = function(name) {
    return opts.selector ? {'class': name} : {};
  };

  // set arrows for fermion, scalar, and ghost propagators
  var setArrow = function(par, x, y, angle, name) {
    var t = 2 * (par == 'ghost' ? sty.fermion.thickness : sty[par].thickness);
    return opts[par].arrow ? create('polygon', $.extend({points:
      normalize('0,0', -t, ',', 1.25 * t, 1.5 * t, ',0', -t, ',', -1.25 * t)},
      {transform: transform(x, y, angle)}), setId(name)) : '';
  };

  // get path for photon and gluon line
  var linePath = function(tile, period, distance) {
    var bezier = ['M'],
      num = Math.floor(distance / period),
      extra = distance - period * num + 0.1;
    for(var n = 0; n <= num; n++) {
      for(var i = 0, l = tile.length, item; i < l; i++) {
        item = tile[i];
        if($.isArray(item)) {
          // ensure that the number of tiles is an integer
          if(n < num || item[0] < extra) {
            bezier.push(normalize(item[0] + period * n, ',', item[1]));
          } else {
            break;
          }
        } else {
          bezier.push(item);
        }
      }
    }
    return bezier.join(' ').replace(/\s[A-Z][^A-Z]*$/, '');
  };

  // get path for photon and gluon arc
  var arcPath = function(par, tile, period, distance) {
    var t = 0.25 * Math.max(opts[par].tension || opts.tension, 2),
      phi = Math.acos(-0.5 / t),
      theta = -2 * Math.asin(period / (t * distance)),
      segment = [],
      bezier = ['M', '0,0'];
    // get coordinate pairs for the endpoint of segment
    for(var n = 0; n <= (PI - 2 * phi) / theta; n++) {
      segment.push([distance * (t * Math.cos(theta * n + phi) + 0.5),
        distance * (t * Math.sin(theta * n + phi) - Math.sqrt(t * t - 0.25))]);
    }
    for(var i = 0, l = segment.length - 1, model; i < l; i++) {
      // two photon tiles form a period whereas one gluon tile is a period
      model = (par == 'photon' ? tile[i % 2] : tile);
      // get bezier path for photon and gluon arc
      for(var j = 0, m = model.length, item; j < m; j++) {
        item = model[j];
        bezier.push($.isArray(item) ? point(segment[i][0], segment[i][1],
          segment[i+1][0], segment[i+1][1], item[0], item[1]) : item);
      }
    }
    return bezier.join(' ').replace(/\s[A-Z]$/, '');
  };

  // get path for photon and gluon loop
  var loopPath = function(par, tile, period, distance) {
    var theta = 2 * Math.asin(2 * period / distance),
      num = 2 * PI / theta,
      segment = [],
      lift = (opts[par].clockwise ? -0.5 : 0.5),
      bezier = ['M', (par == 'gluon' ? lift + ',0' : '0,' + lift)];
    // find the modified distance such that the number of tiles is an integer
    for(var x = -0.1, dis = distance; Math.floor(num) % 4 ||
      num - Math.floor(num) > 0.1; x += 0.001) {
      distance = (1 + x) * dis;
      theta = 2 * Math.asin(2 * period / distance);
      num = 2 * PI / theta;
    }
    // get coordinate pairs for the endpoint of segment
    for(var n = 0; n <= num; n++) {
      segment.push([0.5 * distance * (1 - Math.cos(theta * n)),
        0.5 * distance * Math.sin(theta * n)]);
    }
    for(var i = 0, l = segment.length - 1, model; i < l; i++) {
      // two photon tiles form a period whereas one gluon tile is a period
      model = (par == 'photon' ? tile[i % 2] : tile);
      // get bezier path for photon and gluon arc
      for(var j = 0, m = model.length, item; j < m; j++) {
        item = model[j];
        bezier.push($.isArray(item) ? point(segment[i][0], segment[i][1],
          segment[i+1][0], segment[i+1][1], item[0], item[1]) : item);
      }
    }
    return bezier.join(' ').replace(/\s[A-Z]$/, '') + ' Z';
  };

  // get path for photon propagator
  var photonPath = function(distance, shape) {
    var lambda = 0.51128733,
      a = opts.photon.amplitude || 5,
      b = 0.5 * lambda * a,
      p = opts.photon.period || 5,
      q = 2 * p / PI,
      t = lambda * p / PI,
      dir = opts.photon.clockwise || opts.clockwise,
      /*
       * reference: http://mathb.in/1447
       *
       * the approximation of the first quarter of one period of sine curve
       * is a cubic Bezier curve with the following control points:
       *
       * (0, 0) (lambda * p / PI, lambda * a / 2) (2 * p / PI, a) (p, a)
      */
      pts = (dir ? [[0, 0], 'C', [t, -b], [q, -a], [p, -a],
          'S', [2 * p - t, -b], [2 * p, 0], 'S', [2 * p + q, a], [3 * p, a],
          'S', [4 * p - t, b]] :
        [[0, 0], 'C', [t, b], [q, a], [p, a],
          'S', [2 * p - t, b], [2 * p, 0], 'S', [2 * p + q, -a], [3 * p, -a],
          'S', [4 * p - t, -b]]),
      tile = (dir ? [['C', [t, -b], [q, -a], [p, -a],
          'S', [2 * p - t, -b], [2 * p + 0.5, 0]],
         ['C', [t, b], [q, a], [p, a],
          'S', [2 * p - t, -b], [2 * p - 0.5, 0]]] :
        [['C', [t, b], [q, a], [p, a],
          'S', [2 * p - t, b], [2 * p - 0.5, 0]],
         ['C', [t, -b], [q, -a], [p, -a],
          'S', [2 * p - t, -b], [2 * p + 0.5, 0]]]);
    return {
        line: linePath(pts, 4 * p, distance),
        arc: arcPath('photon', tile, p, distance),
        loop: loopPath('photon', tile, p, distance)
      }[shape];
  };

  // get path for gluon propagator
  var gluonPath = function(distance, shape) {
    var kappa = 0.55191502,
      // a and b are one-half of the ellipse's major and minor axes
      a = opts.gluon.height * opts.gluon.factor,
      b = opts.gluon.width * opts.gluon.percent,
      // c and d are one-half of major and minor axes of the other ellipse
      c = opts.gluon.height * (opts.gluon.factor - 0.5),
      d = opts.gluon.width * (1 - opts.gluon.percent),
      dir = opts.gluon.clockwise || opts.clockwise,
    pts = (dir ? [[0, 0], 'A ' + a + ' ' + b, 0, 0, 1, [a, b], 'A ' +
          c + ' ' + d, 0, 1, 1, [a - 2 * c, b], 'A ' + a + ' ' + b, 0, 0, 1] :
        [[0, 0], 'A ' + a + ' ' + b, 0, 0, 0, [a, -b], 'A ' + c + ' ' + d,
          0, 1, 0, [a - 2 * c, -b], 'A ' + a + ' ' + b, 0, 0, 0]);
    a = (dir ? a : opts.gluon.scale * a);
    var lift = a / Math.pow(distance, 0.6),
      /*
       * reference: http://spencermortensen.com/articles/bezier-circle/
       *
       * the approximation of the first quarter of the ellipse
       * is a cubic Bezier curve with the following control points:
       *
       * (0, b) (kappa * a, b) (a, kappa * b) (a, 0)
       * 
       * a lift is used to remove mitered join of two tiles
      */
      tile = (dir ? ['C', [kappa * a, lift], [a, b - kappa * b], [a, b],
         'C', [a, b + kappa * d], [a - c + kappa * c, b + d], [a - c, b + d],
         'S', [a - 2 * c, b + kappa * d], [a - 2 * c, b], 'C', [a - 2 * c,
          b - kappa * b], [2 * (a - c) - kappa * a, 0], [2 * (a - c), -lift]] :
        ['C', [kappa * a, lift], [a, -b + kappa * b], [a, -b], 
         'C', [a, -b - kappa * d], [a - c + kappa * c, -b - d], [a - c, -b - d],
         'S', [a - 2 * c, -b - kappa * d], [a - 2 * c, -b], 'C', [a - 2 * c,
          -b + kappa * b], [2 * (a - c) - kappa * a, 0], [2 * (a - c), -lift]]);
    return {
        line: linePath(pts, opts.gluon.height, distance),
        arc: arcPath('gluon', tile, a - c, distance),
        loop: loopPath('gluon', tile, a - c, distance)
      }[shape];
  };

  // plot propagator line
  var plotLine = function(sx, sy, ex, ey, par, name) {
    var path = {
        photon: photonPath,
        gluon: gluonPath
      },
      axis = system(sx, sy, ex, ey),
      id = setId(name + '_line');
    /*
     * for photon and gluon line, we use the method photonPath and gluonPath;
     * for fermion, scalar, and ghost line, we create <line> directly
     */
    return par.match(/photon|gluon/) ?
      [create('path', {d: path[par](axis.distance, 'line'),
        transform: transform(sx, sy, axis.angle)}, id), ''] :
      [create('line', {x1: sx, y1: sy, x2: ex, y2: ey}, id),
        setArrow(par, 0.5 * (sx + ex), 0.5 * (sy + ey), axis.angle,
          name + '_line_arrow')];
  };

  // plot propagator arc
  var plotArc = function(sx, sy, ex, ey, par, name) {
    var path = {
        photon: photonPath,
        gluon: gluonPath
      },
      axis = system(sx, sy, ex, ey),
      id = setId(name + '_arc'),
      t = 0.5 * Math.max(opts[par].tension || opts.tension, 1),
      f = t - Math.sqrt(Math.abs(t * t - 0.25)),
      w = axis.distance,
      ang = axis.angle,
      hx = f * w * Math.sin(ang),
      hy = f * w * Math.cos(ang),
      dir = opts[par].clockwise || opts.clockwise;
    /*
     * for photon and gluon arc, we use the method photonPath and gluonPath;
     * for fermion, scalar, and ghost arc, we create elliptical arc directly
     */
    return par.match(/photon|gluon/) ? [create('path', {d: path[par]
        (w, 'arc'), transform: transform(sx, sy, ang)}, id), ''] :
      [create('path', {d: normalize('M 0,0 A', t * w, t * w,
        '0 0 1', w, ',0'), transform: transform(sx, sy, ang)}, id),
        setArrow(par, 0.5 * (sx + ex) + hx, 0.5 * (sy + ey) - hy,
          ang + (dir ? PI : 0), name + '_arc_arrow')];
  };

  // plot propagator loop
  var plotLoop = function(sx, sy, ex, ey, par, name) {
    var path = {
        photon: photonPath,
        gluon: gluonPath
      },
      axis = system(sx, sy, ex, ey),
      id = setId(name + '_loop'),
      arrow = name + '_loop_arrow_',
      ratio = opts[par].ratio || opts.ratio,
      w = 0.5 * axis.distance,
      ang = axis.angle,
      hx = ratio * w * Math.sin(ang),
      hy = ratio * w * Math.cos(ang),
      dir = opts[par].clockwise || opts.clockwise;
    /*
     * for photon and gluon loop, we use the method photonPath and gluonPath;
     * for fermion, scalar, and ghost loop, we create <ellipse> directly
     */
    return par.match(/photon|gluon/) ? [create('path', {d: path[par]
        (2 * w, 'loop'), transform: transform(sx, sy, ang)}, id), ''] :
      [create('ellipse', {cx: normalize(w), cy: 0, rx: normalize(w),
        ry: normalize(ratio * w), transform: transform(sx, sy, ang)}, id),
        setArrow(par, 0.5 * (sx + ex) + hx, 0.5 * (sy + ey) - hy, ang +
          (dir ? PI : 0), arrow + '1') + setArrow(par, 0.5 * (sx + ex) - hx,
          0.5 * (sy + ey) + hy, ang + (dir ? 0 : PI), arrow + '2')];
  };

  // set graph edges
  var setEdge = function() {
    var elems = [],
      edge = [],
      pts = [],
      funcs = {
        line: plotLine,
        arc: plotArc,
        loop: plotLoop
      };
    for(var par in fd) {
      var group = [],
        shape = '',
        arrow = '';
      for(var key in fd[par]) {
        for(var ind in fd[par][key]) {
          edge = fd[par][key][ind];
          pts[0] = nd[edge[0]];
          for(var i = 1, l = edge.length; i < l; i++) {
            pts[i] = nd[edge[i]];
            group = funcs[key](+pts[i-1][0], +pts[i-1][1], +pts[i][0],
              +pts[i][1], par, edge[i-1] + '_' + edge[i]);
            shape += group[0];
            arrow += group[1];
          }
        }
      }
      // group the propagators with the same type
      elems.push(shape ? create('g', setClass(par), sty[par], shape +
        (opts[par].arrow ? create('g', setClass(par + '_' + 'arrow'),
        {fill: sty[par].color, thickness: 0}, arrow) : '')) : '');
    }
    return elems.join('');
  };

  // set symbols
  var setSymbol = function() {
    var style = $.extend({}, all, {
        color: opts.symbol.color,
        thickness: opts.symbol.thickness
      }),
      t = style.thickness,
      h = 0,
      group = '';
    delete opts.symbol.color;
    delete opts.symbol.thickness;
    for(var key in opts.symbol) {
      var item = opts.symbol[key],
        coord = position(item[0]),
        trans = {transform: transform(coord[0], coord[1], item[1] * PI / 180)},
        type = item[2],
        s = item[3] || 20,
        p = item[4] || 4,
        variant = item[5],
        id = setId(key + '_' + type),
        pts = '0,0';
      if(type == 'arrow') {
        h = (2 * p > s ? Math.sqrt(p * p - s * s / 4) : (2 * p == s ? 1 : 0));
      } else if(type == 'zigzag') {
        for(var i = 0; i <= 0.5 * s / p; i++) {
          pts += ' ' + normalize(p * (2 * i + 1), ',', (opts.tension + 0.2) *
            p * (1 - 2 * (i % 2)), 2 * p * (i + 1), ',0');
        }
      }
      group += {
        /*
         * for straight-line arrow symbol, it only depends on the distance parameter;
         * for the arc variant, two parameters are needed: one is for the distance,
         * the other is for the radius
         */
        arrow: create('g', trans, id,
          create('path', {d: (h ? normalize('M 0,0 A', p, p, '0 0 1', s, ',0') :
            normalize('M 0,0 L', s, ',0'))}) +
          create('polygon', {points: (h ? (variant ? '0,0 ' +
            point(0, 0, -2 * h * h / s, h, -2 * t, 2.5 * t) + ' ' +
            point(0, 0, -2 * h * h / s, h, 3 * t, 0) + ' ' +
            point(0, 0, -2 * h * h / s, h, -2 * t, -2.5 * t) :
            normalize(s, ',0') + ' ' +
            point(s, 0, s + 2 * h * h / s, h, -2 * t, 2.5 * t) + ' ' +
            point(s, 0, s + 2 * h * h / s, h, 3 * t, 0) + ' ' +
            point(s, 0, s + 2 * h * h / s, h, -2 * t, -2.5 * t)) :
            normalize(s, ',0', s - 2 * t, ',', 2.5 * t, s + 3 * t, ',0',
            s - 2 * t, ',', -2.5 * t))}, {fill: style.color, thickness: 0})),
        // the blob symbol needs the distance parameter and the height parameter
        blob: (variant ? create('path', $.extend({d: normalize('M', p, ',',
            -p, 'A', p, p, '0 1 0', p, ',', p, 'L', 2 * s, ',', p, 'A', p,
            p, '0 1 0', 2 * s, ',', -p, 'L', p, ',', -p, 'Z')}, trans),
            $.extend({fill: 'silver'}, id)) :
          create('ellipse', $.extend({cx: s, cy: 0, rx: s, ry: p}, trans),
            $.extend({fill: 'silver'}, id))),
        // the bubble symbol needs the distance parameter and the height parameter
        bubble: create('path', $.extend({d: normalize('M 0,0 C', p, ',',
          p, s, ',', p, s, ',0 S', p, ',', -p, '0,0 Z')}, trans), id),
        // the condensate symbol needs the distance parameter and the height parameter
        condensate: create('g', trans, $.extend({fill: 'black'}, id),
          create('rect', {x: -0.5 * s, y: -p, width: s, height: 2 * p},
            {fill: 'white', thickness: 0}) +
          create('circle', {cx: -0.5 * s, cy: 0, r: p}) +
          create('circle', {cx: 0.5 * s, cy: 0, r: p})),
        // the hadron symbol needs the distance parameter and the height parameter
        hadron: create('g', trans, id, create('path', {d: normalize('M 0,0 L',
            s, ',0', 'M 0,', p, 'L', s, ',', p, 'M 0,', -p, 'L', s, ',', -p)}) +
          create('polygon', {points: (variant ? normalize(s, ',', 2 * p,
            s + 3.6 * p, ',0', s, ',', -2 * p) : normalize(0.5 * s - 1.6 * p,
            ',', 2 * p, 0.5 * s + 2 * p, ',0', 0.5 * s - 1.6 * p, ',', -2 * p))},
            {fill: 'white'})),
        // the zigzag symbol needs the distance parameter and the height parameter
        zigzag: create('polyline', $.extend({points: pts}, trans), id)
      }[type];
    }
    return group ? create('g', setClass('symbol'), style, group) : '';
  };

  // set graph nodes
  var setNode = function() {
    var show = (opts.node.show === true ? 'iova' : opts.node.show),
      type = opts.node.type,
      style = $.extend({}, all, {
        fill: opts.node.fill,
        color: opts.node.color,
        thickness: opts.node.thickness
      }),
      nr = opts.node.radius + style.thickness,
      a = nr / Math.SQRT2 - (type == 'cross' ? 0 : style.thickness),
      group = '';
    for(var key in nd) {
      if(show.indexOf(key.charAt(0)) >= 0) {
        var id = setId(key + '_' + type),
          x = +nd[key][0],
          y = +nd[key][1],
          square = {x: x - nr, y: y - nr, width: 2 * nr, height: 2 * nr},
          circle = {cx: x, cy: y, r: nr},
          path = {d: normalize('M', -a, ',', -a, 'L', a, ',', a, 'M', -a,
            ',', a, 'L', a, ',', -a) , transform: transform(x, y, 0)};
        // support three node types: cross, dot, and otimes
        group += {
          box: create('rect', square, id),
          boxtimes: create('g', {}, id,
            create('rect', square) + create('path', path)),
          cross: create('path', path, id),
          dot: create('circle', circle, id),
          otimes: create('g', {}, id,
            create('circle', circle) + create('path', path))
        }[type];
      }
    }
    return group ? create('g', setClass('node'), style, group) : '';
  };

  // format label string
  var formatStr = function(str) {
    str = str.replace(/[\s\{\}]+/g, '').replace(/(_[^_]+)(\^[^\^]+)/g, '$2$1');
    var font = lb.sty.size,
      small = {size: Math.round(0.8 * font)},
      head = str.charAt(0),
      sup = str.indexOf('^') + 1,
      sub = str.indexOf('_') + 1,
      ind = (sup ? sup : sub),
      hx = -0.15 * font,
      vy = 0.4 * font;
    // support subscript, superscript, bar and tilde accents
    return (head.match(/-|~/) ? create('tspan', {dx: normalize('0', 4 * hx),
        dy: normalize(-vy, vy)}, {}, (head == '-' ? '&#8211;' : head) +
        (ind ? str.slice(1, ind - 1) : str.slice(1))) : create('tspan',
        {}, {}, (ind ? str.slice(0, ind - 1) : str.slice(0)))) +
      (sup ? create('tspan', {dx: normalize(hx), dy: normalize(-vy)}, small,
        (sub ? str.slice(sup, sub - 1) : str.slice(sup))) : '') +
      (sub ? create('tspan', {dx: normalize((sup ? 5 : 1) * hx),
        dy: normalize((sup ? 2 : 1) * vy)}, small, str.slice(sub)) : '');
  };

  // set annotation labels
  var setLabel = function() {
    var group = '',
      size = lb.sty.size * 2;
    for(var key in lb.pos) {
      var item = lb.pos[key],
        coord = position(item[0]),
        attr = {
          x: normalize(coord[0]),
          y: normalize(coord[1])
        },
        id = setId(key);
      // put label texts in <foreignObject> to provide mathjax support
      group += (opts.mathjax ? create('foreignObject', $.extend({}, attr,
        {'width': item[2] || size * 0.6, 'height': item[3] || size}), id,
        create('body', {'xmlns': 'http://www.w3.org/1999/xhtml'}, {}, item[1])) :
        create('text', attr, id, formatStr(item[1])));
    }
    return group ? create('g', setClass('label'), lb.sty, group) : '';
  };

  // set annotation images
  var setImage = function() {
    var group = '';
    for(var key in opts.image) {
      var item = opts.image[key],
        coord = position(item[0]),
        x = normalize(coord[0]),
        y = normalize(coord[1]),
        id = setId(key);
      if(opts.ajax) {
        // use ajax to load external SVG file
        id = (opts.selector ? id.id + '_' : '');
        $.ajax({url: item[1], dataType: 'text', async: false,
          success: function(data) { 
            data = data.replace(/<\?.*\?>\n*/, '');
            // set the "x" and "y" attributes of <svg>
            data = data.slice(0, data.search('>')).replace(/ x=.\d+./, '')
              .replace(/ y=.\d+./, '') + data.slice(data.search('>'));
            group += data.replace(/>/, ' x="' + x + '" y="' + y + '">')
              .replace(/(id=.)/g, '$1' + id).replace(/(href=.#)/g, '$1' + id);
          }, error: function() {
            throw new Error('fail to load ' + item[1]);
          }
        });
      } else {
        group += create('image', {href: item[1], x: x, y: y},
          $.extend({width: item[2] || 32, height: item[3] || 32},
          (item[3] ? {} : {preserveAspectRatio: 'xMinYMin meet'}), id));
      }
    }
    return group ? create('g', setClass('image'), {}, group) : '';
  };

  // generate SVG output
  this.output = function() {

    // detect SVG support
    if(!(document.createElementNS &&
      document.createElementNS(opts.xmlns, 'svg').createSVGRect)) {
      return 'Your browser does not support SVG.';
    }

    // show SVG grids
    if(opts.grid.show) {
      var u = normalize(opts.grid.unit);
      svg.defs.push(create('pattern', {x: 0, y: 0, width: u, height: u,
        viewBox: normalize(0, 0, u, u)}, {patternUnits: 'userSpaceOnUse',
        id: Feyn.prefix + '_grid'}, create('polyline', {points:
        u + ',0 0,0 0,' + u}, {fill: 'none', color: 'silver'})));
      svg.body.push(create('rect', {x: 0, y: 0, width: '100%', height: '100%'},
        {fill: 'url(#' + Feyn.prefix + '_grid)', color: 'silver'}));
    }

    // show graph edges and symbols
    svg.body.push(setEdge() + setSymbol());

    // show graph nodes
    if(opts.node.show) {
      svg.body.push(setNode());
    }

    // show labels and images
    svg.body.push(setLabel() + setImage());

    // generate SVG source code
    var src = create('svg', {xmlns: opts.xmlns, xlink: opts.xlink,
      version: opts.version, x: opts.x, y: opts.y,
      width: opts.width, height: opts.height,
      viewBox: normalize(opts.x, opts.y, opts.width, opts.height)},
      (opts.selector ? {id: Feyn.prefix} : {}),
      (opts.title ? create('title', {}, {}, opts.title) : '') +
      (opts.description ? create('desc', {}, {}, opts.description) : '') +
      (svg.defs.length ? create('defs', {}, {}, svg.defs.join('')) : '') +
      (svg.body.length ? svg.body.join('') : ''));

    // get standalone SVG
    if(opts.standalone) {
      var code = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"' +
        ' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + src;
      src = '<div class="feyn" style="display:inline-block;">' + src +
        '</div><textarea cols="80" style="margin-left:5px;padding:3px;' +
        'height:' + (opts.height - 8) + 'px;" spellcheck="false">' +
        code.replace(/&/g, '&#38;').replace(/"(.+?)"/g, "&#34;$1&#34;")
        .replace(/</g, '&#60;').replace(/>/g, '&#62;') + '</textarea>';
      // update the SVG rendering when the code has changed
      $(container).change(function() {
        src = $(this).children('textarea').val();
        $(this).children('.feyn').html(src.slice(src.search('<svg')));
      });
    }

    return src;
  };

};

})(jQuery);
