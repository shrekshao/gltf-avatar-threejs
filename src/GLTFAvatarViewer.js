import {glAvatarSystem} from './GLTFAvatarSystem.js';


function Viewer() {
    this.canvas = null;
}

// Viewer.prototype.setCanvas = function(canvas) {
//     this.canvas;
// };

Viewer.prototype.init = function(canvas) {
    this.canvas = canvas;
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
        loader.setGlAvatarOfLinkingSkeleton(gltf_skeleton.gl_avatar);
        loader.load( uri, function(data, json, bins, imgs) {
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
                    skinMixers.splice(i, 1);
                    break;
                }
            }
        }

        // refresh visibility array
        // console.log(c.glTF.gl_avatar.visibility);

        gltf_skeleton.gl_avatar.visibility.fill(255);
        for (var t in glAvatarSystem.curAccessories) {
            if (t !== type && glAvatarSystem.curAccessories[t].scene) {
                var a = glAvatarSystem.curAccessories[t];
                updateVisibilityArray(gltf_skeleton.gl_avatar.visibility, glAvatarSystem.accessories[t][a.name].gltf.gl_avatar.visibility);
            }
        }
    }

    // --------------------------

    updateVisibilityArray(gltf_skeleton.gl_avatar.visibility, data.gl_avatar.visibility);

    gltf = data;
    var object = gltf.scene;

    c.name = key;
    c.scene = object;

    // status.innerHTML = "Load time: " + ( performance.now() - loadStartTime ).toFixed( 2 ) + " ms.";

    // temp
    // console.log(gltf_skeleton);


    object.traverse( function ( node ) {
        if ( node.isMesh ) node.castShadow = true;
    } );


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


Viewer.prototype.selectSkeleton = function() {

};