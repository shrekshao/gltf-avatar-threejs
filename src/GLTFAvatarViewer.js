var THREE = require('three');
THREE.OrbitControls = require('three-orbit-controls')(THREE);
THREE.GLTFLoader = require('./GLTFLoader.js')(THREE);

import {glAvatarSystem} from './GLTFAvatarSystem.js';
import {mergeGLTFAvatar} from './GLTFAvatarMerge.js';
import {fileSave} from './lib/makeglb.js';

var clock = new THREE.Clock();




function Viewer(preserveDrawingBuffer) {

    // for canvas snapshot purpose
    this.preserveDrawingBuffer = preserveDrawingBuffer || false;

    // this.container = null;
    this.canvas = null;
    this.fullWindow = true;

    this.skeletonMixer = null;
    this.skinMixers = [];   // animation mixer for skin files

    this.gltf_skeleton = null;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.orbitControls = null;

    this.loader = null;


    this.skeletonAnimations = [];   // temp for control block, just animation name || id
    this.skeletonClips = {};        // for mixing
    this.skeletonActionStates = {}; // true or false
    // // exposed for gui
    // this.control = {

    // };

    this.skeletonUpdateCallback = null; // (key) => void
    this.skinUpdateCallback = null; // (cat, key) => void
}

// Viewer.prototype.setCanvas = function(canvas) {
//     this.canvas;
// };

Viewer.prototype.init = function(canvas) {
    

    
    if (canvas) {
        this.canvas = canvas;
        this.fullWindow = false;
        this.renderer = new THREE.WebGLRenderer( 
            { 
                canvas: this.canvas, 
                antialias: true,
                preserveDrawingBuffer: this.preserveDrawingBuffer
            } 
        );
    } else {
        this.renderer = new THREE.WebGLRenderer( { 
            antialias: true ,
            preserveDrawingBuffer: this.preserveDrawingBuffer
        } );
        this.canvas = this.renderer.domElement;
        this.fullWindow = true;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.renderer.setSize( window.innerWidth, window.innerHeight ); // test
        document.getElementById('container').appendChild(this.canvas);
    }

    
    // this.camera = new THREE.PerspectiveCamera( 45, container.offsetWidth / container.offsetHeight, 0.001, 1000 );

    
    // this.renderer.setSize( this.canvas.width, this.canvas.height ); // test
    this.camera = new THREE.PerspectiveCamera( 45, this.canvas.width / this.canvas.height, 0.01, 100 );

    this.renderer.setPixelRatio(window.devicePixelRatio);
    // this.renderer.setPixelRatio(this.canvas.width / this.canvas.height);

    // this.renderer.setSize( window.innerWidth, window.innerHeight );
    // this.renderer.setSize( container.width, container.height );

    // scene info: add light, add ground, shadow

    this.loader = new THREE.GLTFLoader();
    this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);


    this.onWindowResize();
    window.addEventListener( 'resize', this.onWindowResize.bind(this), false );


    this.initScene();
    

    // this.selectSkeleton('mixamo');
    this.selectSkeleton(Object.keys(glAvatarSystem.repo.skeletons)[0]);

    this.animate();

};

Viewer.prototype.initScene = function () {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0x222222 );

    this.scene.add(this.camera);
    // test add lights
    var ambient = new THREE.AmbientLight( 0x222222 );
    this.scene.add( ambient );
    var directionalLight = new THREE.DirectionalLight( 0xdddddd );
    directionalLight.position.set( 1, 1, 1 ).normalize();
    this.scene.add( directionalLight );

    var spot1   = new THREE.SpotLight( 0xffffff, 1 );
    // spot1.position.set( 10, 20, 10 );
    spot1.position.set( 10, 20, -30 );
    spot1.angle = 0.25;
    spot1.distance = 1024;
    spot1.penumbra = 0.75;
    // if ( sceneInfo.shadows ) {
    //     spot1.castShadow = true;
    //     spot1.shadow.bias = 0.0001;
    //     spot1.shadow.mapSize.width = 2048;
    //     spot1.shadow.mapSize.height = 2048;
    // }
    this.scene.add( spot1 );
};

Viewer.prototype.cleanup = function() {
    if (this.skeletonMixer) {
        this.skeletonMixer.stopAllAction();
        this.skeletonMixer = null;
    }

    if (this.skinMixers) {
        for (var i = 0, len = this.skinMixers.length; i < len; i++) {
            this.skinMixers[i].stopAllAction();
        }
        this.skinMixers = [];
    }

    if (this.scene) {
        for (var i = 0, len = this.scene.children.length; i < len; i++) {
            this.scene.remove(this.scene.children[i]);
        }
    }

    this.initScene();
    
};

var onWindowResize = Viewer.prototype.onWindowResize = function() {
    
    // var i, len = cameras.length;
    // for (i = 0; i < len; i++) { // just do it for default
    //     cameras[i].aspect = container.offsetWidth / container.offsetHeight;
    //     cameras[i].updateProjectionMatrix();
    // }
    // renderer.setSize( window.innerWidth, window.innerHeight );
    if (this.fullWindow) {
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    } else {
        this.renderer.setSize(this.canvas.width, this.canvas.height);
    }
    
    this.camera.aspect = this.canvas.width / this.canvas.height;
    this.camera.updateProjectionMatrix();
};

var animate = Viewer.prototype.animate = function() {
    requestAnimationFrame( this.animate.bind(this) );
    // requestAnimationFrame( animate );

    var delta = clock.getDelta();

    if (this.skeletonMixer) {
        this.skeletonMixer.update(delta);
    }

    for (var i = 0, len = this.skinMixers.length; i < len; i++) {
        this.skinMixers[i].update(delta);
    }

    // if (cameraIndex == 0)
    //     orbitControls.update();
    this.orbitControls.update();

    // render();
    this.renderer.render(this.scene, this.camera);
};

// TODO: get envmap

// skeleton animation
Viewer.prototype.playAnimation = function(index) {
    if (this.skeletonMixer) {
        this.skeletonMixer.stopAllAction();
        this.skeletonMixer.clipAction(this.gltf_skeleton.animations[index]).play();
    }
};

// skeleton animation
Viewer.prototype.playAnimationMixing = function(key, isPlaying) {
    if (this.skeletonMixer) {
        var action = this.skeletonMixer.clipAction(this.skeletonClips[key]);
        action.setEffectiveTimeScale(1);
        isPlaying ? action.play() : action.stop();
    }
};

Viewer.prototype.updateVisibilityArray = function(v, v1) {
    for (var i = 0, len = v1.length; i < len; i++) {
        v[i] = v1[i] ? v[i] : 0;
    }

    // // gl_avatar_linked_skeleton.visibilityLUT.data = gl_avatar_linked_skeleton.visibility;
    // for (var i, len = v.length; i < len; i++) {
    // 	gl_avatar_linked_skeleton.visibilityLUT.image.data[i] = v[i] * 255;
    // }
    this.gltf_skeleton.gl_avatar.visibilityLUT.needsUpdate = true;
};

Viewer.prototype.updateVisibilityValue = function(id, value) {
    this.gltf_skeleton.gl_avatar.visibility[id] = value ? 255 : 0;


    this.gltf_skeleton.gl_avatar.visibilityLUT.needsUpdate = true;
};

Viewer.prototype.getVisibilityArray = function() {
    return this.gltf_skeleton.gl_avatar.visibility;
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
        var self = this;
        this.loader.setGlAvatarOfLinkingSkeleton(this.gltf_skeleton.gl_avatar);
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
            self.skinOnload(type, key, data);
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
                this.updateVisibilityArray(this.gltf_skeleton.gl_avatar.visibility, glAvatarSystem.accessories[t][a.name].gltf.gl_avatar.visibility);
            }
        }
    }

    // --------------------------

    // update current new skin file
    if (this.loader.enableGLTFAvatar) {
        this.updateVisibilityArray(this.gltf_skeleton.gl_avatar.visibility, data.gl_avatar.visibility);
    }

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
    

    this.scene.add(object);
    object.updateMatrixWorld();
    // object.updateMatrix();
    // object.children[0].updateMatrix();

    // this.onWindowResize();

    if (this.skinUpdateCallback) {
        this.skinUpdateCallback(type, key);
    }
};








Viewer.prototype.selectSkeleton = function(key, uri) {
    var info = null;
    if (!uri) {
        // uri = glAvatarSystem.repo.skeletons[key].url;
        info = glAvatarSystem.repo.skeletons[key];
        uri = info.url;
    }


    


    // scene, mixer, cleanup
    var self = this;

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


        self.cleanup();

        // camera setting
        if (info) {
            self.camera.position.copy(info.cameraPos);
            self.orbitControls.target.copy(info.center);
            data.scene.rotation.copy(info.objectRotation);

            // self.skeletonOnLoad(key, data);

            
        }

        self.skeletonOnLoad(key, data);

        if (info) {
            for (var key in info.skins) {
                var skin = info.skins[key];
                if (skin) {
                    self.selectSkin(key, info.skins[key]);
                }
            }
        }
        
        
    }, undefined, function ( error ) {
        console.error( error );
    } );
};


Viewer.prototype.skeletonOnLoad = function(key, data) {
    var gltf = data;

    this.gltf_skeleton = gltf;

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

    // animations
    var animations = gltf.animations;
    if ( animations && animations.length ) {


        // TODO: gui interface
        // removeOptions(animationSelector);
        this.skeletonAnimations = [];   // for control block

        this.skeletonClips = {};
        this.skeletonActionStates = {};
        this.skeletonVisibilityId2Name = gltf.gl_avatar.visibilityId2Name || []; 
        // this.skeletonActionStates = new Map();

        this.skeletonMixer = new THREE.AnimationMixer( gltf.scene );
        for ( var i = 0; i < animations.length; i ++ ) {
            var animation = animations[ i ];
            // var o = document.createElement('option');
            // o.text = animation.name || i;
            // animationSelector.add(o);
            this.skeletonAnimations.push(animation.name || i.toFixed());


            // clips mixing
            var key = animation.name || i;
            this.skeletonActionStates[key] = false;
            this.skeletonClips[key] = animation;

            if (i === 0) {
                this.skeletonActionStates[key] = true;
                this.playAnimationMixing(key, true);
            }
        }

        // this.playAnimation(0);
    }
    this.scene.add( gltf.scene );

    if (this.skeletonUpdateCallback) {
        this.skeletonUpdateCallback(key);
    }
};


Viewer.prototype.mergeAndExport = function() {
    var skinArray = [];

    for (var cat in glAvatarSystem.curAccessories) {
        var c = glAvatarSystem.curAccessories[cat];
        if (c.name) {
            skinArray.push(glAvatarSystem.accessories[cat][c.name]);
        }
    }

    var merged = mergeGLTFAvatar(
        glAvatarSystem.skeletons[glAvatarSystem.curSkeleton.name],
        skinArray
    );

    fileSave(merged.json, merged.bins, merged.imgs);
};


var AvatarSystem = glAvatarSystem;
export { Viewer, AvatarSystem };