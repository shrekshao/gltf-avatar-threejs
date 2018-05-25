var THREE = require('three');
THREE.OrbitControls = require('three-orbit-controls')(THREE);
THREE.GLTFLoader = require('./GLTFLoader.js')(THREE);

import {glAvatarSystem} from './GLTFAvatarSystem.js';
import {mergeGLTFAvatar} from './GLTFAvatarMerge.js';
import {fileSave} from './lib/makeglb.js';


function Viewer() {
    // this.container = null;
    this.canvas = null;

    this.skeletonMixer = null;
    this.skinMixers = [];   // animation mixer for skin files

    this.gltf_skeleton = null;

    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.loader = null;
}

// Viewer.prototype.setCanvas = function(canvas) {
//     this.canvas;
// };

Viewer.prototype.init = function(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0x222222 );
    this.camera = new THREE.PerspectiveCamera( 45, container.offsetWidth / container.offsetHeight, 0.001, 1000 );

    this.scene.add(this.camera);

    

    this.renderer = new THREE.WebGLBufferRenderer( { canvas: this.canvas, antialias: true } );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // this.renderer.setSize( window.innerWidth, window.innerHeight );
    // this.renderer.setSize( container.width, container.height );



    // scene info: add light, add ground, shadow

    this.loader = new THREE.GLTFLoader();
};


Viewer.prototype.selectSkin = function(type, key, uri) {

    if (!uri) {
        // skin from repo
        uri = glAvatarSystem.repo[type][key];
    }

    // var uri = glAvatarSystem.repo[type][key];

    // console.log(glAvatarSystem);
    if (glAvatarSystem.isLoaded(type, key)) {
        this.skinOnload(type, key, glAvatarSystem.accessories[type][key].gltf);
    } else {
        this.loader.setGlAvatarOfLinkingSkeleton(gltf_skeleton.gl_avatar);
        this.loader.load( uri, function(data, json, bins, imgs) {
            // glAvatarSystem.accessories[type][key] = data;
            // console.log(bins);
            // console.log(imgs);

            glAvatarSystem.accessories[type][key] = {
                gltf: data,

                json: json,
                bins: bins,
                imgs: imgs
            };
            // TODO
            this.skinOnload(type, key, data);
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }

};

Viewer.prototype.skinOnload = function(type, key, data) {
    var c = glAvatarSystem.curAccessories[type];

    var skinMixers = this.skinMixers;

    if (key === c.name) {
        console.log('same ' + type);
        return;
    }


    // remove current replaced accessory
    if (c.scene) {
        // delete previous component
        c.scene.parent.remove(c.scene);
        if (c.scene.attach_child) {
            console.log('has attach child (sub skeleton or rigid bind)');
            c.scene.attach_child.parent.remove(c.scene.attach_child);
        }

        if (c.scene.skinMixer) {
            // c.scene.skinMixer.stopAllAction();

            for ( var i = 0, len = skinMixers.length; i < len; i ++ ) {
                if (skinMixers[i] == c.scene.skinMixer) {
                    // remove the skin mixer for previous skin file, if exists
                    skinMixers.splice(i, 1);
                    break;
                }
            }
        }

        // refresh visibility array
        this.gltf_skeleton.gl_avatar.visibility.fill(255);
        for (var t in glAvatarSystem.curAccessories) {
            if (t !== type && glAvatarSystem.curAccessories[t].scene) {
                var a = glAvatarSystem.curAccessories[t];
                updateVisibilityArray(this.gltf_skeleton.gl_avatar.visibility, glAvatarSystem.accessories[t][a.name].gltf.gl_avatar.visibility);
            }
        }
    }

    // --------------------------

    // update current new skin file
    updateVisibilityArray(this.gltf_skeleton.gl_avatar.visibility, data.gl_avatar.visibility);

    // gltf = data;
    var gltf = data;
    var object = gltf.scene;

    c.name = key;
    c.scene = object;

    // status.innerHTML = "Load time: " + ( performance.now() - loadStartTime ).toFixed( 2 ) + " ms.";

    // temp
    // console.log(gltf_skeleton);


    object.traverse( function ( node ) {
        if ( node.isMesh ) node.castShadow = true;
    } );


    // rigid bind, if any
    if (object.attach_child) {
        // assume attach_child has gl_avatar_base_root
        object.attach_child.gl_avatar_base_root.add(object.attach_child);
        object.attach_child.updateMatrixWorld();
        // object.attach_child.updateMatrix();
    }



    // var optionalSceneRoot = gltf_skeleton.gl_avatar.nodes['head-end'].children[0];  // point to lily hair root try

    if (!object.skinMixer) {
        var animations = gltf.animations;
        if ( animations && animations.length ) {
            // var mixer = new THREE.AnimationMixer( object );
            // var mixer = new THREE.AnimationMixer( optionalSceneRoot );
            var mixer = new THREE.AnimationMixer( object.attach_child || object );

            for ( var i = 0, len = animations.length; i < len; i ++ ) {
                var animation = animations[ i ];
                // mixer.clipAction( animation, optionalSceneRoot ).play();
                mixer.clipAction( animation ).play();
            }

            // temp: assuming only one mixer
            skinMixers.push(mixer);
            object.skinMixer = mixer;
        }
    } 
    else {
        var m = object.skinMixer;
    //     for ( var i = 0, len = m._actions.length; i < len; i ++ ) {
    //         m._actions[i].play();
    //     }
        skinMixers.push(m);
    //     // console.log(m);
    }
    

    scene.add(object);
    object.updateMatrixWorld();
    // object.updateMatrix();
    // object.children[0].updateMatrix();

    onWindowResize();
};








Viewer.prototype.selectSkeleton = function(key, uri) {
    if (!uri) {
        uri = glAvatarSystem.repo.skeletons[key];
    }


    // scene, mixer, cleanup

    this.loader.load( uri, function(data, json, bins, imgs) {
        // glAvatarSystem.accessories[type][key] = data;
        // console.log(bins);
        // console.log(imgs);

        glAvatarSystem.skeletons[key] = {
            gltf: data,

            json: json,
            bins: bins,
            imgs: imgs
        };

        this.skeletonOnLoad(key, data);
    }, undefined, function ( error ) {
        console.error( error );
    } );
};


Viewer.prototype.skeletonOnLoad = function(key, data) {
    var gltf = data;

    glAvatarSystem.curSkeleton.name = key;
    glAvatarSystem.curSkeleton.scene = gltf.scene;

    // clear accessories (TODO: these logic should go into gltfavatarsystem)
    for (var cat in glAvatarSystem.curAccessories) {
        glAvatarSystem.curAccessories[cat].name = null;
        glAvatarSystem.curAccessories[cat].scene = null;
    }

    for (var cat in glAvatarSystem.accessories) {
        glAvatarSystem.accessories[cat] = {};
    }

    // TODO: scene info


    // animations
    var animations = gltf.animations;
    if ( animations && animations.length ) {


        // TODO: gui interface
        // removeOptions(animationSelector);

        this.skeletonMixer = new THREE.AnimationMixer( gltf.scene );
        for ( var i = 0; i < animations.length; i ++ ) {
            var animation = animations[ i ];
            // var o = document.createElement('option');
            // o.text = animation.name || i;
            // animationSelector.add(o);
        }
        playAnimation(0);
    }
    this.scene.add( gltf.scene );
};