# jQuery.Feyn

For complete documentation and examples, please visit the project page:
<http://photino.github.io/jquery-feyn/>.

## Overview

jQuery.Feyn is a jQuery plugin to facilitate your drawing Feynman diagrams with
Scalable Vector Graphics (SVG). The following list gives a quick overview of
the most prominent features:

- Automatic generation of clean SVG source code
- Easy to use, easy to make fine adjustments
- Predefined propagator styles, vertex types, and symbols
- Support for typesetting labels and including external graphics
- Lightweight, cross-browser, and fully documented

jQuery.Feyn is released under the MIT license.

## Supported Browsers

- Firefox 4+
- Chrome 7+
- Opera 11.6+
- Safari 5.1+
- IE 9+

A more detailed compatibility table for support of inline SVG in HTML5 can be
found at [caniuse.com/svg-html5](http://caniuse.com/svg-html5).

## Basic Usage

To use jQuery.Feyn, the first thing you should do is to load the scripts.
Then you can configure your desired Feynman diagram such as

    <script>
      $(document).ready(function() {
        $('#container').feyn({
          incoming: {i1: '20,180', i2: '180,180'},
          outgoing: {o1: '20,20', o2: '180,20'},
          vertex: {v1: '100,140', v2: '100,60'},
          fermion: {line: 'i1-v1-i2,o2-v2-o1'},
          photon: {line: 'v1-v2'}
        });
      });
    </script>

The jQuery ID selector `$('#container')` can also be replaced by any other
CSS selector that applies to a unique block-level element in your document,
which serves as the container of jQuery.Feyn's SVG output.

