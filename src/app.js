// var THREE = require('three');
// THREE.OrbitControls = require('three-orbit-controls')(THREE);
// THREE.GLTFLoader = require('./GLTFLoader.js')(THREE);

import {Viewer} from './GLTFAvatarViewer.js';
// import {mergeGLTFAvatar} from './GLTFAvatarMerge.js';
// import {fileSave} from './lib/makeglb.js';

import dat from 'dat.gui';


var viewer = new Viewer();


// viewer.init();
// document.getElementById('container').appendChild(viewer.canvas);


viewer.init(document.getElementById('canvas'));