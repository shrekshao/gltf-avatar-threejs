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






var AvatarControl = function() {
    this.skeleton = 'mixamo';
    this.skin = {
        hair: 'maid',
        clothes: 'maid-dress'
    };

    // skeleton animations
    this.animations = 'null';

    this.mergeAndExport = function() {
        viewer.mergeAndExport();
    };
};


var control = new AvatarControl();

var gui = new dat.GUI();

var skeletonControl = gui.add(control, 'skeleton', ['mixamo', 'stand-pose']);   // TODO: get repo from avatar system
skeletonControl.onChange(function(value) {
    // console.log(value);
    viewer.selectSkeleton(value);
});


var animationFolder = gui.addFolder('animations');
animationFolder.open();


var animationControl; 
viewer.skeletonUpdateCallback = function(key) {
    if ( animationControl ) animationFolder.remove(animationControl);
    animationControl = animationFolder.add(control, 'animations', viewer.skeletonAnimations);

    animationControl.onChange(function(value) {
        if ( viewer.skeletonAnimations.length > 0) {
            control.animations = viewer.skeletonAnimations[0];
            
            for (var i = 0, len = viewer.skeletonAnimations.length; i < len; i++) {
                if (value == viewer.skeletonAnimations[i]) {
                    viewer.playAnimation(i);
                }
            }

            animationControl.updateDisplay();
        }
        
    });
    // control.animations = viewer.skeletonAnimations;
    // for (var i in gui.__controllers) {
    //     gui.__controllers[i].updateDisplay();
    // }
    console.log('a');
    // animationControl.updateDisplay();
};




var skinFolder = gui.addFolder('skins');
skinFolder.open();
// for (var cat in control.skin) {
// skinFolder.add(control.skin, cat, ['maid-dress', 'suit']);
skinFolder.add(control.skin, 'hair', ['maid', 'lily']).onChange(function(value) {
    viewer.selectSkin('hair', value);
});
skinFolder.add(control.skin, 'clothes', ['maid-dress', 'suit']).onChange(function(value) {
    viewer.selectSkin('clothes', value);
});
// }


gui.add(control, 'mergeAndExport');



viewer.init(document.getElementById('canvas'));



