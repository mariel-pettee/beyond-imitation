(function() {
  var host = 'http://52.35.20.252:7082'; // host = 52.35.20.252

  // generate a scene object
  var scene = new THREE.Scene();

  // generate a camera
  var container = getContainer();
  var aspectRatio = container.w / container.h;
  var camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

  // generate a renderer
  var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true,});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.w, container.h);
  container.elem.appendChild(renderer.domElement);

  // create a floor
  var size = 10,
      divisions = 20,
      c = 0xdeb315,
      gridHelper = new THREE.GridHelper(size, divisions, c, c);
  scene.add(gridHelper);

  /**
  * Helpers
  **/

  function getContainer() {
    var elem = document.querySelector('#try-it');
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
      halt = false,
      dataA,
      dataB,
      material,
      dancerA,
      dancerB,
      nVerts,
      nTime,
      nDims,
      spinner = document.querySelector('.spinner'),
      nRows = 1,
      nCols = 1,
      edges = [[0, 33], [0, 29], [0, 8], [0, 4], [33, 29], [33, 8], [33, 4], [29, 8], [29, 4], [8, 4], [0, 2], [2, 32], [32, 40], [2, 7], [7, 15], [2, 51], [51, 41], [41, 44], [51, 16], [16, 19]];

  material = new THREE.RawShaderMaterial({
    vertexShader: document.querySelector('#vertex-shader').textContent,
    fragmentShader: document.querySelector('#fragment-shader').textContent,
    uniforms: {
      transitionPercent: { type: 'f', value: 0, },
    }
  });

  /**
  * State
  **/

  function sampleVae() {
    halt = true;
    spinner.style.display = 'inline-block';
    // parse data nVerts, nTime, nDims
    var idx = parseInt(document.querySelector('#idx').value),
        sigma = parseFloat(document.querySelector('#sigma').value)/100,
        route = host + '/test_reconstruction?idx=' + idx + '&sigma=' + sigma;
    get(route, function(json) {
      dataA = json.prompt;
      dataB = json.response;
      nTime = dataA.length;
      nVerts = dataA[0].length;
      nDims = dataA[0][0].length;
      // if there aren't any dancers add them
      if (!dancerA && !dancerB) addDancers();
      // dance
      halt = false;
      spinner.style.display = 'none';
      dance(1);
    })
  }


  function addDancers() {
    addDancer(dataA, 'dancerA');
    addDancer(dataB, 'dancerB');
    dancerA = scene.getObjectByName('dancerA');
    dancerB = scene.getObjectByName('dancerB');
    dancerA.position.x = 1.25; // prompt
    dancerB.position.x = 0; // response
  }


  function addDancer(dat, name) {
    var geometry = new THREE.BufferGeometry(),
        positions = getPosition(0, dat),
        targets = getPosition(1, dat);
    geometry.addAttribute('position',
      new THREE.BufferAttribute(positions, 3, true, 1));
    geometry.addAttribute('target',
      new THREE.BufferAttribute(targets, 3));
    var dancer = new THREE.LineSegments(geometry, material);
    dancer.name = name;
    dancer.rotation.x = Math.PI*1.5;
    scene.add(dancer);
  }


  function getPosition(t, dat) {
    var versPerDancer = edges.length*2*3,
        nDancers = nRows * nCols,
        verts = new Float32Array(versPerDancer * nDancers),
        iter = 0,
        time = 0;
    for (var x=0; x<nCols; x++) {
      for (var y=0; y<nRows; y++) {
        for (var i=0; i<edges.length; i++) {
          verts[iter++] = dat[(x+y)+t][edges[i][0]][0];
          verts[iter++] = dat[(x+y)+t][edges[i][0]][1];
          verts[iter++] = dat[(x+y)+t][edges[i][0]][2];
          verts[iter++] = dat[(x+y)+t][edges[i][1]][0];
          verts[iter++] = dat[(x+y)+t][edges[i][1]][1];
          verts[iter++] = dat[(x+y)+t][edges[i][1]][2];
        }
      }
    }
    return verts;
  }


  function dance(t) {
    if (halt) return;
    TweenLite.to(material.uniforms.transitionPercent, frameDuration, {
      value: 1.0,
      onComplete: function() {
        // move dancer a
        dancerA.geometry.attributes.position.array = getPosition(t, dataA);
        dancerA.geometry.attributes.target.array = getPosition(t+1, dataA);
        dancerA.geometry.attributes.position.needsUpdate = true;
        dancerA.geometry.attributes.target.needsUpdate = true;
        // move dancer b
        dancerB.geometry.attributes.position.array = getPosition(t, dataB);
        dancerB.geometry.attributes.target.array = getPosition(t+1, dataB);
        dancerB.geometry.attributes.position.needsUpdate = true;
        dancerB.geometry.attributes.target.needsUpdate = true;
        // reset the material uniform
        material.uniforms.transitionPercent = {type: 'f', value: 0};
        if ((t + 10) > nTime) t = 0;
        dance(t+1);
      },
      ease:Linear.easeNone,
    });
  }


  // render loop
  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    camera.position.x = nCols/2;
    camera.position.y = nRows/2;
    camera.position.z = -2;
    camera.lookAt(nCols/2, nRows/2, 0);
  };

  window.addEventListener('resize', function() {
    var container = getContainer();
    camera.aspect = container.w / container.h;
    camera.updateProjectionMatrix();
    renderer.setSize(container.w, container.h);
  })

  window.sampleVae = sampleVae;

  sampleVae();
  render();
})();