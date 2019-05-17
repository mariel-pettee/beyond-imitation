(function() {
  // generate a scene object
  var scene = new THREE.Scene();

  // generate a camera
  var container = getContainer();
  var aspectRatio = container.w / container.h;
  var camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

  // generate a renderer
  var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true,});
  renderer.setPixelRatio(window.devicePixelRatio); // <3 retina
  renderer.setSize(container.w, container.h); // canvas size
  container.elem.appendChild(renderer.domElement);

  /**
  * Helpers
  **/

  function getContainer() {
    var elem = document.querySelector('#dance-grid');
    return {
      elem: elem,
      w: elem.clientWidth,
      h: elem.clientHeight,
    }
  }

  function get(url, onSuccess, onErr) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE) {
        if (xmlhttp.status === 200) {
          if (onSuccess) onSuccess(JSON.parse(xmlhttp.responseText))
        } else {
          if (onErr) onErr(xmlhttp)
        }
      };
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  };

  // globals
  var frameDuration = 0.1, // decrease to increase dance speed
      danceDirection = 1.0, // +1 or -1
      dancer,
      data,
      nVerts,
      nTime,
      nDims,
      edges = [[0, 10], [0, 8], [0, 4], [0, 2], [10, 8], [10, 4], [10, 2], [8, 4], [8, 2], [4, 2], [0, 1], [1, 9], [9, 11], [1, 3], [3, 5], [1, 14], [14, 12], [12, 13], [14, 6], [6, 7]];

  // grid
  var nRows = 10,
      nCols = 30;

  // parse data nVerts, nTime, nDims
  get('assets/json/data.selected.X.json', function(json) {
    data = json;
    nVerts = json.length;
    nTime = json[0].length;
    nDims = json[0][0].length;

    /**
    * Create the dancer
    **/

    var raw = new THREE.RawShaderMaterial({
      vertexShader: document.querySelector('#vertex-shader').textContent,
      fragmentShader: document.querySelector('#fragment-shader').textContent,
      uniforms: {
        transitionPercent: { type: 'f', value: 0, },
      }
    });

    var geometry = new THREE.BufferGeometry(),
        positions = getPosition(0),
        targets = getPosition(1);
    geometry.addAttribute('position',
      new THREE.BufferAttribute(positions, 3, true, 1));
    geometry.addAttribute('target',
      new THREE.BufferAttribute(targets, 3));
    dancer = new THREE.LineSegments(geometry, raw);
    dancer.rotation.x = Math.PI*1.5;
    scene.add(dancer);
    dance(1);
  })

  function getPosition(t) {
    var versPerDancer = (edges.length-1)*2*3,
        nDancers = nRows * nCols,
        verts = new Float32Array(versPerDancer * nDancers),
        iter = 0,
        time = 0;
    for (var x=0; x<nCols; x++) {
      for (var y=0; y<nRows; y++) {
        for (var i=0; i<edges.length; i++) {
          verts[iter++] = data[edges[i][0]][(x+y)+t][0] + (2*x);
          verts[iter++] = data[edges[i][0]][(x+y)+t][1];
          verts[iter++] = data[edges[i][0]][(x+y)+t][2] + (2*y);
          verts[iter++] = data[edges[i][1]][(x+y)+t][0] + (2*x);
          verts[iter++] = data[edges[i][1]][(x+y)+t][1];
          verts[iter++] = data[edges[i][1]][(x+y)+t][2] + (2*y);
        }
      }
    }
    return verts;
  }

  function dance(t) {
    TweenLite.to(dancer.material.uniforms.transitionPercent, frameDuration, {
      value: 1.0,
      onComplete: function() {
        dancer.geometry.attributes.position.array = getPosition(t);
        dancer.geometry.attributes.target.array = getPosition(t+1);
        dancer.geometry.attributes.position.needsUpdate = true;
        dancer.geometry.attributes.target.needsUpdate = true;
        dancer.material.uniforms.transitionPercent = {type: 'f', value: 0};
        // either dance forwards or dance backwards
        if ((t + (nRows * nCols) + 1) >= nTime) {
          danceDirection *= -1;
        };
        dance(t+danceDirection);
      },
      ease:Linear.easeNone,
    });
  }

  // render loop
  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    camera.position.x = nCols;
    camera.position.y = nRows;
    camera.position.z = -12;
    camera.lookAt(nCols, nRows, 0);
  };

  window.addEventListener('resize', function() {
    var container = getContainer();
    camera.aspect = container.w / container.h;
    camera.updateProjectionMatrix();
    renderer.setSize(container.w, container.h);
  })

  render();
})();
