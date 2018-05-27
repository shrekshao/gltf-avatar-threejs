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



var AvatarControl = function() {
    this.skeleton = 'mixamo';
    this.skin = {
        hair: 'maid',
        clothes: 'maid-dress'
    };
};


var control = new AvatarControl();

var gui = new dat.GUI();

var skeletonControl = gui.add(control, 'skeleton', ['mixamo', 'stand-pose']);   // TODO: get repo from avatar system
skeletonControl.onChange(function(value) {
    // console.log(value);
    viewer.selectSkeleton(value);
});

var skinFolder = gui.addFolder('skins');
// for (var cat in control.skin) {
// skinFolder.add(control.skin, cat, ['maid-dress', 'suit']);
skinFolder.add(control.skin, 'hair', ['maid', 'lily']).onChange(function(value) {
    viewer.selectSkin('hair', value);
});
skinFolder.add(control.skin, 'clothes', ['maid-dress', 'suit']).onChange(function(value) {
    viewer.selectSkin('clothes', value);
});
// }


