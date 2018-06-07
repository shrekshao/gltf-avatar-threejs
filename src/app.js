// var THREE = require('three');
// THREE.OrbitControls = require('three-orbit-controls')(THREE);
// THREE.GLTFLoader = require('./GLTFLoader.js')(THREE);

import {Viewer, AvatarSystem} from './GLTFAvatarViewer.js';
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
        clothes: 'maid-dress',

        face: 'saber'
    };

    // skeleton animations
    this.animations = 'null';

    this.mergeAndExport = function() {
        viewer.mergeAndExport();
    };
};


var control = new AvatarControl();

var gui = new dat.GUI();

// var skeletonControl = gui.add(control, 'skeleton', ['mixamo', 'stand-pose']);   // TODO: get repo from avatar system
var skeletonControl = gui.add(control, 'skeleton', Object.keys(AvatarSystem.repo.skeletons));   // TODO: get repo from avatar system
skeletonControl.onChange(function(value) {
    // console.log(value);
    viewer.selectSkeleton(value);
});


var animationFolder = gui.addFolder('animations');
animationFolder.open();


// var animationControl; 
var animationToggles = [];
viewer.skeletonUpdateCallback = function(key) {
    // if ( animationControl ) animationFolder.remove(animationControl);
    // animationControl = animationFolder.add(control, 'animations', viewer.skeletonAnimations);

    // animationControl.onChange(function(value) {
    //     if ( viewer.skeletonAnimations.length > 0) {
    //         control.animations = viewer.skeletonAnimations[0];
            
    //         for (var i = 0, len = viewer.skeletonAnimations.length; i < len; i++) {
    //             if (value == viewer.skeletonAnimations[i]) {
    //                 viewer.playAnimation(i);
    //             }
    //         }

    //         animationControl.updateDisplay();
    //     }
        
    // });


    for (var i = 0, len = animationToggles.length; i < len; i++) {
        animationFolder.remove(animationToggles[i]);
    }
    animationToggles = [];
    for (var key in viewer.skeletonActionStates) {
        var toggle = animationFolder.add(viewer.skeletonActionStates, key);
        toggle.onChange((function() {
            var k = key;
            return function(v) {
                viewer.playAnimationMixing(k, v);
            };
        })());
        animationToggles.push(toggle);
    }



};




var skinFolder = gui.addFolder('skins');
skinFolder.open();

// skinFolder.add(control.skin, 'hair', Object.keys(AvatarSystem.repo.hair)).onChange(function(value) {
//     viewer.selectSkin('hair', value);
// });
// skinFolder.add(control.skin, 'clothes', Object.keys(AvatarSystem.repo.clothes)).onChange(function(value) {
//     viewer.selectSkin('clothes', value);
// });

function getSelectSkinFunc(cat) {
    var c = cat;
    return function(value) {
        viewer.selectSkin(c, value);
    };
}

for (var cat in control.skin) {
    skinFolder.add(control.skin, cat, Object.keys(AvatarSystem.repo[cat])).onChange(
        getSelectSkinFunc(cat)
    );
}


gui.add(control, 'mergeAndExport');



// viewer.init(document.getElementById('canvas'));
viewer.init();



