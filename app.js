import './three.js';
import './OrbitControls.js';
import Textor from './textor/dist/texteditor.js';
import './textor/dist/javascript.js';

// import './webxr-polyfill.module.js';
// import './HelioWebXRPolyfill.js';

const topDocument = window.top.document;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localEuler = new THREE.Euler();
const localRaycaster = new THREE.Raycaster();

const scene = new THREE.Scene();

const container = new THREE.Object3D();
scene.add(container);

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.5;
camera.position.z = 2;
// camera.rotation.y = Math.PI;

const ambientLight = new THREE.AmbientLight(0x808080);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight.position.set(0.5, 1, 0.5);
scene.add(directionalLight);

/* const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 1);
directionalLight2.position.set(0, -0.25, -0.25);
scene.add(directionalLight2); */

const gridHelper = new THREE.GridHelper(10, 10);
container.add(gridHelper);

const renderer = new THREE.WebGLRenderer({
  // canvas: document.getElementById('canvas'),
  // alpha: true,
  antialias: true,
});
// console.log('set size', window.innerWidth, window.innerHeight);
renderer.setSize(window.innerWidth/2, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = false;
// renderer.domElement.id = 'canvas';
const iframeWrapper = document.getElementById('iframe-wrapper');
iframeWrapper.appendChild(renderer.domElement);

const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.screenSpacePanning = true;
orbitControls.enableMiddleZoom = false;
orbitControls.enabled = true;
orbitControls.update();

// boot

/* server.start();

const term = (window.term = new Terminal({
  theme: molokaiTheme,
}));
const terminalEl = document.getElementById('terminal');
term.open(terminalEl);
// term.fit();
vm.boot(term);
// window.term = term; */

function mod(a, n) {
  return ((a%n)+n)%n;
}
const distanceFactor = 64;
const parcelSize = 16;
const parcelGeometry = (() => {
  const tileGeometry = new THREE.PlaneBufferGeometry(1, 1)
    .applyMatrix(localMatrix.makeScale(0.95, 0.95, 1))
    .applyMatrix(localMatrix.makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2)))
    .toNonIndexed();
  const numCoords = tileGeometry.attributes.position.array.length;
  const numVerts = numCoords/3;
  const positions = new Float32Array(numCoords*parcelSize*parcelSize);
  const centers = new Float32Array(numCoords*parcelSize*parcelSize);
  const typesx = new Float32Array(numVerts*parcelSize*parcelSize);
  const typesz = new Float32Array(numVerts*parcelSize*parcelSize);
  let i = 0;
  for (let x = -parcelSize/2+0.5; x < parcelSize/2; x++) {
    for (let z = -parcelSize/2+0.5; z < parcelSize/2; z++) {
      const newTileGeometry = tileGeometry.clone()
        .applyMatrix(localMatrix.makeTranslation(x, 0, z));
      positions.set(newTileGeometry.attributes.position.array, i * newTileGeometry.attributes.position.array.length);
      for (let j = 0; j < newTileGeometry.attributes.position.array.length/3; j++) {
        localVector.set(x, 0, z).toArray(centers, i*newTileGeometry.attributes.position.array.length + j*3);
      }
      let typex = 0;
      if (mod((x + parcelSize/2-0.5), parcelSize) === 0) {
        typex = 1/8;
      } else if (mod((x + parcelSize/2-0.5), parcelSize) === parcelSize-1) {
        typex = 2/8;
      }
      let typez = 0;
      if (mod((z + parcelSize/2-0.5), parcelSize) === 0) {
        typez = 1/8;
      } else if (mod((z + parcelSize/2-0.5), parcelSize) === parcelSize-1) {
        typez = 2/8;
      }
      for (let j = 0; j < numVerts; j++) {
        typesx[i*numVerts + j] = typex;
        typesz[i*numVerts + j] = typez;
      }
      i++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('center', new THREE.BufferAttribute(centers, 3));
  geometry.setAttribute('typex', new THREE.BufferAttribute(typesx, 1));
  geometry.setAttribute('typez', new THREE.BufferAttribute(typesz, 1));
  return geometry;
})();
const floorVsh = `
  #define PI 3.1415926535897932384626433832795

  uniform vec3 uPosition;
  uniform float uAnimation;
  uniform vec4 uSelectedParcel;
  attribute vec3 center;
  attribute float typex;
  attribute float typez;
  varying vec3 vPosition;
  varying float vTypex;
  varying float vTypez;
  varying float vDepth;
  varying float vPulse;

  float range = 1.0;

  void main() {
    float height;
    vec3 c = center + uPosition;
    float selectedWidth = uSelectedParcel.z - uSelectedParcel.x;
    float selectedHeight = uSelectedParcel.w - uSelectedParcel.y;
    if (c.x >= uSelectedParcel.x && c.x < uSelectedParcel.z && c.z >= uSelectedParcel.y && c.z < uSelectedParcel.w) {
      vec2 selectedCenter = vec2((uSelectedParcel.x+uSelectedParcel.z) / 2.0, (uSelectedParcel.y+uSelectedParcel.w) / 2.0);
      float selectedSize = max(selectedWidth, selectedHeight)/2.0;
      float selectedRadius = sqrt(selectedSize*selectedSize+selectedSize*selectedSize);

      float animationRadius = uAnimation * selectedRadius;
      float currentRadius = length(c.xz - selectedCenter);
      float radiusDiff = abs(animationRadius - currentRadius);
      height = max((range - radiusDiff)/range, 0.0);
      height = sin(height*PI/2.0);
      height *= 0.2;

      vPulse = 1.0 + (1.0 - mod(uAnimation * 2.0, 1.0)/2.0) * 0.5;
    } else {
      vPulse = 1.0;
    }
    vec3 p = vec3(position.x, position.y + height, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
    vPosition = position;
    vTypex = typex;
    vTypez = typez;
    vDepth = gl_Position.z / ${distanceFactor.toFixed(8)};
  }
`;
const floorFsh = `
  #define PI 3.1415926535897932384626433832795

  uniform vec3 uColor;
  uniform float uHover;
  uniform float uAnimation;
  varying vec3 vPosition;
  varying float vTypex;
  varying float vTypez;
  varying float vDepth;
  varying float vPulse;

  void main() {
    float add = uHover * 0.2;
    vec3 f = fract(vPosition);
    if (vTypex >= 2.0/8.0) {
      if (f.x >= 0.8) {
        add = 0.2;
      }
    } else if (vTypex >= 1.0/8.0) {
      if (f.x <= 0.2) {
        add = 0.2;
      }
    }
    if (vTypez >= 2.0/8.0) {
      if (f.z >= 0.8) {
        add = 0.2;
      }
    } else if (vTypez >= 1.0/8.0) {
      if (f.z <= 0.2) {
        add = 0.2;
      }
    }
    vec3 c = (uColor + add) * vPulse;
    float a = (1.0-vDepth)*0.8;
    gl_FragColor = vec4(c, a);
  }
`;
const _makeFloorMesh = (x, z) => {
  const geometry = parcelGeometry;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPosition: {
        type: 'v3',
        value: new THREE.Vector3(),
      },
      uColor: {
        type: 'c',
        value: new THREE.Color(),//new THREE.Color().setHex(colors.normal),
      },
      uHover: {
        type: 'f',
        value: 0,
      },
      uSelectedParcel: {
        type: 'v4',
        value: new THREE.Vector4(),
      },
      uAnimation: {
        type: 'f',
        value: 1,
      },
    },
    vertexShader: floorVsh,
    fragmentShader: floorFsh,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x*parcelSize, 0, z*parcelSize);
  mesh.material.uniforms.uPosition.value.copy(mesh.position);
  mesh.frustumCulled = false;
  /* mesh.update = () => {
    const xrSite = _getFloorMeshXrSite(mesh);
    const color = _getSelectedColor(xrSite);
    material.uniforms.uColor.value.setHex(color);
  }; */
  return mesh;
};
const floorMesh = _makeFloorMesh();
scene.add(floorMesh);

const xrIframe = document.createElement('xr-iframe');
document.body.appendChild(xrIframe);

const editorEl = document.createElement('canvas');
editorEl.id = 'editor';
// iframeWrapper.appendChild(editorEl);
topDocument.querySelector('.iframe-wrapper').appendChild(editorEl);
const editor = new Textor.TextEditor(editorEl);
let textChanged = false;
editor.addEventListener('textchanged', () => {
  textChanged = true;
});
/* editor.addEventListener('focus', () => {
  console.log('got focus');
});
editor.addEventListener('blur', () => {
  console.log('got blur');
}); */
editor.language = new Textor.JavaScriptLanguage();
editor.theme = editor.themeManager.get("dark");
editor.text = `\
<xr-site>
  <script src="https://rawcdn.githack.com/mrdoob/three.js/6aad4cd4713660e9379688766c4405526683a141/build/three.js"></script>
  <script>
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    const cubeMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({
      color: 0xFF0000,
    }));
    scene.add(cubeMesh);

    const xrSite = document.querySelector('xr-site');
    xrSite.requestSession().then(session => {
      renderer.xr.enabled = true;
      renderer.xr.setSession(session);

      function animate() {
        cubeMesh.position.y = Math.sin((Date.now()%5000)/5000 * Math.PI*2);
        renderer.render(scene, camera);
      }
      renderer.xr.setAnimationLoop(animate);
    });
  </script>
</xr-site>
`;
let lastTextUrl = null;
editor._textController._textArea.addEventListener('blur', () => {
  if (textChanged) {
    if (lastTextUrl) {
      URL.revokeObjectURL(lastTextUrl);
    }
    lastTextUrl = URL.createObjectURL(new Blob([editor.text], {
      type: 'text/html',
    }));
    xrIframe.src = lastTextUrl;
    // xrIframe.src = 'data:text/html,' + editor.text;
    textChanged = false;
  }
});
editor._textController._textArea.dispatchEvent(new CustomEvent('blur'));

const rayDistance = 10;
// const planeGeometry = new THREE.PlaneBufferGeometry(width, height);
/* const xtermTextLayerEl = document.querySelector('.xterm-text-layer');
const xtermPlaneMesh = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({
  map: new THREE.Texture(
    xtermTextLayerEl,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.LinearFilter,
    THREE.LinearFilter // use mipmapping in webgl2
  ),
}));
xtermPlaneMesh.position.x = -1.5;
xtermPlaneMesh.position.y = 1;
xtermPlaneMesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/4);
xtermPlaneMesh.click = () => {
  console.log('click 1', new Error().stack);
  term.focus();
};
scene.add(xtermPlaneMesh); */

const editorPlaneMesh = (() => {
  const mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: new THREE.Texture(
      editorEl,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter // use mipmapping in webgl2
    ),
    side: THREE.DoubleSide,
  }));
  // mesh.position.x = 1.5;
  mesh.position.y = 1;
  // mesh.position.z = -1;
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/4);
  mesh.click = intersection => {
    const {x, y} = intersection;

    editorEl.dispatchEvent(new MouseEvent('mousedown', {
      clientX: x * editorEl.width,
      clientY: y * editorEl.height,
    }));
    // editor.focus();
  };
  mesh.plane = new THREE.Plane();
  mesh.leftLine = new THREE.Line3();
  mesh.topLine = new THREE.Line3();
  mesh.update = e => {
    mesh.leftLine.start
      .set(-1/2, 1/2, 0)
      .applyMatrix4(mesh.matrixWorld);
    mesh.leftLine.end
      .set(-1/2, -1/2, 0)
      .applyMatrix4(mesh.matrixWorld);

    mesh.topLine.start
      .set(-1/2, 1/2, 0)
      .applyMatrix4(mesh.matrixWorld);
    mesh.topLine.end
      .set(1/2, 1 / 2, 0)
      .applyMatrix4(mesh.matrixWorld);

    mesh.plane.setFromCoplanarPoints(
      mesh.leftLine.start,
      mesh.leftLine.end,
      mesh.topLine.end
    );
  };
  return mesh;
})();
scene.add(editorPlaneMesh);

let fakeXrDisplay = null;
const _updateSize = () => {
  const editorWidth = window.top.innerWidth/2;
  const editorHeight = window.top.innerHeight-50;
  editor.updateSize(editorWidth, editorHeight);

  editorPlaneMesh.scale.x = 2;
  editorPlaneMesh.scale.y = editorHeight/editorWidth;

  if (fakeXrDisplay) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.projectionMatrix.toArray(fakeXrDisplay.projectionMatrix);
  }
};
_updateSize();
window.addEventListener('resize', _updateSize);

let loginToken = null;
const loginUrl = 'https://login.exokit.org/';
const _setLoginToken = newLoginToken => {
  loginToken = newLoginToken;
};
async function doLogin(email, code) {
  const res = await fetch(`${loginUrl}?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`, {
    method: 'POST',
  });
  if (res.ok) {
    const newLoginToken = await res.json();

    await storage.set('loginToken', newLoginToken);

    _setLoginToken(newLoginToken);

    // loginNameStatic.innerText = loginToken.name;
    // loginEmailStatic.innerText = loginToken.email;

    topDocument.body.classList.add('logged-in');
    loginForm.classList.remove('phase-1');
    loginForm.classList.remove('phase-2');
    loginForm.classList.add('phase-3');

    await _loadInventory();

    return true;
  } else {
    return false;
  }
}
const storage = {
  async get(k) {
    const s = localStorage.getItem(k);
    if (typeof s === 'string') {
      return JSON.parse(s);
    } else {
      return undefined;
    }
  },
  async set(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  },
  async remove(k) {
    localStorage.removeItem(k);
  },
};

const loginForm = topDocument.getElementById('login-form');
const loginEmail = topDocument.getElementById('login-email');
const loginNameStatic = topDocument.getElementById('login-name-static');
const loginEmailStatic = topDocument.getElementById('login-email-static');
const statusNotConnected = topDocument.getElementById('status-not-connected');
const statusConnected = topDocument.getElementById('status-connected');
const loginVerificationCode = topDocument.getElementById('login-verification-code');
const loginNotice = topDocument.getElementById('login-notice');
const loginError = topDocument.getElementById('login-error');
const logoutButton = topDocument.getElementById('logout-button');
loginForm.onsubmit = async e => {
  e.preventDefault();

  if (loginForm.classList.contains('phase-1') && loginEmail.value) {
    loginNotice.innerHTML = '';
    loginError.innerHTML = '';
    loginForm.classList.remove('phase-1');

    const res = await fetch(`${loginUrl}?email=${encodeURIComponent(loginEmail.value)}`, {
      method: 'POST',
    })
    if (res.ok) {
      loginNotice.innerText = `Code sent to ${loginEmail.value}!`;
      loginForm.classList.add('phase-2');

      return res.blob();
    } else if (res.status === 403) {
      loginError.innerText = `${loginEmail.value} is not in the beta yet :(`;

      loginForm.classList.add('phase-1');
    } else {
      throw new Error(`invalid status code: ${res.status}`);
    }
  } else if (loginForm.classList.contains('phase-2') && loginEmail.value && loginVerificationCode.value) {
    loginNotice.innerHTML = '';
    loginError.innerHTML = '';
    loginForm.classList.remove('phase-2');

    await doLogin(loginEmail.value, loginVerificationCode.value);
  } else if (loginForm.classList.contains('phase-3')) {
    await storage.remove('loginToken');

    window.top.location.reload();
  }
};
(async () => {
  const localLoginToken = await storage.get('loginToken');
  if (localLoginToken) {
    const res = await fetch(`${loginUrl}?email=${encodeURIComponent(localLoginToken.email)}&token=${encodeURIComponent(localLoginToken.token)}`, {
      method: 'POST',
    })
    if (res.ok) {
      const newLoginToken = await res.json();

      await storage.set('loginToken', newLoginToken);

      _setLoginToken(newLoginToken);

      // loginNameStatic.innerText = loginToken.name;
      // loginEmailStatic.innerText = loginToken.email;

      topDocument.body.classList.add('logged-in');
      loginForm.classList.remove('phase-1');
      loginForm.classList.remove('phase-2');
      loginForm.classList.add('phase-3');
    } else {
      await storage.remove('loginToken');

      console.warn(`invalid status code: ${res.status}`);
    }
  }
})();

const saveDialog = topDocument.getElementById('save-dialog');
const saveNameInput = topDocument.getElementById('save-name-input');
const openDialog = topDocument.getElementById('open-dialog');
const uploadDialog = topDocument.getElementById('upload-dialog');
const uploadNameInput = topDocument.getElementById('upload-name-input');
const _keydown = async e => {
  const _closeAll = () => {
    saveDialog.classList.remove('open');
    openDialog.classList.remove('open');
    uploadDialog.classList.remove('open');
  };

  switch (e.which) {
    case 27: {
      _closeAll();
      break;
    }
    case 83: { // S
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        _closeAll();
        saveDialog.classList.add('open');
        saveNameInput.focus();
      }
      break;
    }
    case 79: { // O
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        _closeAll();
        openDialog.classList.add('open');

        const res = await fetch(`https://content.exokit.org/users/${loginToken.name}`);
        const root = await res.json();
        const files = [];
        const hashes = [];
        let keypath = '';
        const _recurse = node => {
          keypath += (keypath ? '/' : '') + node.name;

          if (node.hash) {
            files.push(keypath);
            hashes.push('0x' + node.hash);
          }
          if (node.children) {
            for (let i = 0; i < node.children.length; i++) {
              _recurse(node.children[i]);
            }
          }
        };
        _recurse(root);
        const ids = await Promise.all(hashes.map(hash => new Promise((accept, reject) => {
          // const hash = '0x' + filename.match(/([^\/]*)$/)[1];
          window.top.contract.getId(hash, (err, id) => {
            if (!err) {
              accept(id.toNumber());
            } else {
              reject(err);
            }
          });
        })));

        const _drawFiles = () => {
          openDialog.innerHTML = files.map((filename, i) => {
            const hash = '0x' + filename.match(/([^\/]*)$/)[1];
            filename = filename.replace(/\/[^\/]*?$/, '');
            const id = ids[i];
            const contentUrl = `https://content.exokit.org/${loginToken.name}/${filename}`;
            const viewerUrl = `https://viewer.exokit.org/?p=${encodeURIComponent(contentUrl)}`;
            return `<nav class=a-file draggable=true>
              <div class=overlay>
                <div class=multibutton>
                  <a href="${contentUrl}" class="button first last load-button">Load</a>
                  <input type=number value=1 min=0 class="mint-number-input">
                  <nav class="button first last mint-button" token="${hash}">Mint</nav>
                  <a href="${viewerUrl}" class="button first last view-button">View</a>
                  ${id !== 0 ?
                    `<a href="https://rinkeby.opensea.io/assets/${window.top.contract.address}/${id}" class="button first last external-link-button">OpenSea</a>`
                  :
                    ``
                  }
                </div>
              </div>
              <i class="fas fa-file"></i>
              <div class=name>${escape(filename)}</name>
            </nav>`;
          }).join('\n');
        };
        _drawFiles();
        Array.from(openDialog.querySelectorAll('.a-file')).forEach((aFile, i) => {
          const mintNumberInput = aFile.querySelector('.mint-number-input');
          const mintButton = aFile.querySelector('.mint-button');
          const hash = mintButton.getAttribute('token');
          mintButton.addEventListener('click', async () => {
            const txHash = await new Promise((accept, reject) => {
              window.top.contract.mint(hash, window.top.web3.currentProvider.selectedAddress, mintNumberInput.value, (err, txHash) => {
                if (!err) {
                  accept(txHash);
                } else {
                  reject(err);
                }
              });
            });
            console.log('minted 1', txHash);
            const receipt = await new Promise((accept, reject) => {
              const _recurse = () => {
                window.top.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
                  if (err) {
                    reject(err);
                  } else if (!receipt) {
                    setTimeout(_recurse, 500);
                  } else {
                    accept(receipt);
                  }
                });
              };
              _recurse();
            });
            console.log('minted 2', txHash, receipt);
            ids[i] = 1;
            _drawFiles();
          });
          
          const loadButton = aFile.querySelector('.load-button');
          const src = loadButton.getAttribute('href');
          loadButton.addEventListener('click', async e => {
            e.preventDefault();
            const res = await fetch(src);
            const html = await res.text();
            editor.text = html;
          });
          /* const externalLinkButton = aFile.querySelector('.external-link-button');
          externalLinkButton.addEventListener('click', () => {
            
          }); */
        });
      }
      break;
    }
  }
};
window.addEventListener('keydown', _keydown);

let animationCb = null;
saveDialog.addEventListener('submit', async e => {
  e.preventDefault();

  const screenshotBlob = await new Promise((accept, reject) => {
    const topCanvas = window.top.xrEngine.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = topCanvas.width;
    canvas.height = topCanvas.height;
    const ctx = canvas.getContext('2d');

    animationCb = () => {
      ctx.drawImage(topCanvas, 0, 0);
      canvas.toBlob(accept, 'image/png');
    };
  });
  const screenshotUrl = URL.createObjectURL(screenshotBlob);
  console.log('got screenshot', screenshotUrl);

  const username = loginToken.name;
  const filename = saveNameInput.value + '.html';
  const headers = {
    'Content-Type': 'text/html',
  };
  const res = await fetch(`https://hashes.exokit.org/${username}/${filename}?email=${encodeURIComponent(loginToken.email)}&token=${encodeURIComponent(loginToken.token)}`, {
    method: 'PUT',
    headers,
    body: editor.text,
  });
  if (res.ok) {
    const s = await res.text();
    console.log('saved html', `https://content.exokit.org/${username}/${filename}`, s);

    const res2 = await fetch(`https://preview.exokit.org/${username}/${filename}?email=${encodeURIComponent(loginToken.email)}&token=${encodeURIComponent(loginToken.token)}`, {
      method: 'PUT',
      body: screenshotBlob,
    });

    if (res2.ok) {
      const s2 = await res2.text();
      console.log('saved screenshot', `https://content.exokit.org/${username}/${filename}`, s2);

      saveDialog.classList.remove('open');
      saveNameInput.value = '';
    } else {
      throw new Error(`invalid status code: ${res.status}`);
    }
  } else {
    throw new Error(`invalid status code: ${res.status}`);
  }
});

const _uploadFile = file => {
  const username = loginToken.name;
  const filename = file.name;
  const headers = {
    'Content-Type': 'text/html',
  };
  fetch(`https://hashes.exokit.org/${username}/${filename}?email=${encodeURIComponent(loginToken.email)}&token=${encodeURIComponent(loginToken.token)}`, {
    method: 'POST',
    headers,
  })
    .then(res => {
      if (res.ok) {
        return res.text();
      } else {
        throw new Error(`invalid status code: ${res.status}`);
      }
    })
    .then(u => {
      return fetch(u, {
        method: 'PUT',
        body: file,
        headers,
      });
    })
    .then(res => {
      if (res.ok) {
        return res.text();
      } else {
        console.warn(`invalid status code: ${res.status}`);
        return Promise.resolve([]);
      }
    })
    .then(j => {
      console.log('upload complete', j);
      // const {url} = j;
    })
    .catch(err => {
      console.warn(err);
    });
};
window.document.addEventListener('dragover', e => {
  e.preventDefault();
});
window.document.addEventListener('drop', async e => {
  e.preventDefault();

  saveDialog.classList.remove('open');
  openDialog.classList.remove('open');
  uploadDialog.classList.remove('open');

  for (var i = 0; i < e.dataTransfer.items.length; i++) {
    const item = e.dataTransfer.items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      uploadDialog.classList.add('open');
      uploadDialog.file = file;
      uploadNameInput.value = file.name;
    }
  }
});
uploadDialog.addEventListener('submit', e => {
  e.preventDefault();
  _uploadFile(uploadDialog.file);
});

function animate() {
  // console.log('needs update', xtermPlaneMesh.material.map.image);
  // xtermPlaneMesh.material.map.needsUpdate = true;
  editorPlaneMesh.material.map.needsUpdate = true;

  // console.log('animate');

  if (fakeXrDisplay) {
    // console.log('copy camera', camera.position.toArray().join(','));
    fakeXrDisplay.position.copy(camera.position);
    fakeXrDisplay.quaternion.copy(camera.quaternion);
    fakeXrDisplay.pushUpdate();
  }

  renderer.render(scene, camera);

  if (animationCb) {
    animationCb();
    animationCb = null;
  }
}
renderer.setAnimationLoop(animate);

const xrSite = document.createElement('xr-site');
document.body.appendChild(xrSite);
xrSite.requestSession().then(session => {
  renderer.vr.enabled = true;
  renderer.vr.setSession(session);

  fakeXrDisplay = new FakeXRDisplay();
  camera.projectionMatrix.toArray(fakeXrDisplay.projectionMatrix);
});

const raycastMesh = new THREE.Mesh(new THREE.BoxBufferGeometry(0.02, 0.02, 0.02), new THREE.MeshPhongMaterial({
  color: 0x29b6f6,
}));
raycastMesh.frustumCulled = false;
raycastMesh.visible = false;
scene.add(raycastMesh);

let intersection = null;
renderer.domElement.addEventListener('mousemove', e => {
  // const position = new THREE.Vector3();
  const rect = renderer.domElement.getBoundingClientRect();
  const xFactor = (e.clientX - rect.left) / rect.width;
  const yFactor = -(e.clientY - rect.top) / rect.height;
  if (xFactor >= 0 && xFactor <= 1 && -yFactor >= 0 && -yFactor <= 1) {
    /* const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion),
      camera.position.clone()
        .add(new THREE.Vector3(0, 0, -3).applyQuaternion(camera.quaternion))
    ); */

    intersection = null;

    localRaycaster.setFromCamera(localVector2D.set(xFactor * 2 - 1, yFactor * 2 + 1), camera);
    editorPlaneMesh.update();
    const intersectionPoint = localRaycaster.ray.intersectPlane(editorPlaneMesh.plane, localVector);
    if (intersectionPoint) {
      const leftIntersectionPoint = editorPlaneMesh.leftLine.closestPointToPoint(intersectionPoint, true, localVector2);
      const topIntersectionPoint = editorPlaneMesh.topLine.closestPointToPoint(intersectionPoint, true, localVector3);

      const xFactor = topIntersectionPoint.distanceTo(editorPlaneMesh.topLine.start) / editorPlaneMesh.scale.x;
      const yFactor = leftIntersectionPoint.distanceTo(editorPlaneMesh.leftLine.start) / editorPlaneMesh.scale.y;
      const distance = localRaycaster.ray.origin.distanceTo(intersectionPoint);

      if (xFactor > 0 && xFactor < 0.99999 && yFactor > 0 && yFactor < 0.99999 && distance < rayDistance) {
        const x = xFactor;
        const y = yFactor;
        intersection = {
          mesh: editorPlaneMesh,
          // distance,
          x,
          y,
        };
        raycastMesh.position.copy(intersectionPoint);
        raycastMesh.visible = true;
      } else {
        raycastMesh.visible = false;
      }
    } else {
      raycastMesh.visible = false;
    }
  }
});
renderer.domElement.addEventListener('click', e => {
  if (intersection) {
    intersection.mesh.click(intersection);
  } else {
    document.activeElement.blur();
  }
});
