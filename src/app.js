var THREE = require('three');
THREE.OrbitControls = require('three-orbit-controls')(THREE);
THREE.GLTFLoader = require('./GLTFLoader.js')(THREE);

import {glAvatarSystem} from './GLTFAvatarSystem.js';


// var update = THREE.Bone.prototype.update;
// THREE.Bone.prototype.update = function(parentSkinMatrix, forceUpdate) {
//     update.call(this, parentSkinMatrix, forceUpdate);
//     this.updateMatrixWorld( true );
// };

THREE.Skeleton.prototype.update = ( function () {

    var offsetMatrix = new THREE.Matrix4();
    var identityMatrix = new THREE.Matrix4();

    return function update() {

        var bones = this.bones;
        var boneInverses = this.boneInverses;
        var boneMatrices = this.boneMatrices;
        var boneTexture = this.boneTexture;

        // flatten bone matrices to array

        for ( var i = 0, il = bones.length; i < il; i ++ ) {

            // compute the offset between the current and the original transform

            var matrix = bones[ i ] ? bones[ i ].matrixWorld : identityMatrix;

            offsetMatrix.multiplyMatrices( matrix, boneInverses[ i ] );
            offsetMatrix.toArray( boneMatrices, i * 16 );


            // test
            if (bones[i]) {
                bones[i].updateMatrixWorld(true);
            }
            
        }

        if ( boneTexture !== undefined ) {

            boneTexture.needsUpdate = true;

        }

    };

} )();


// import '../css/style.css';

// var renderer	= new THREE.WebGLRenderer({
//     antialias	: true
// });
// renderer.setClearColor(new THREE.Color('lightgrey'), 1);
// renderer.setSize( window.innerWidth, window.innerHeight );
// document.body.appendChild( renderer.domElement );
// // array of functions for the rendering loop
// var onRenderFcts= [];
// // init scene and camera
// var scene	= new THREE.Scene();
// var camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
// camera.position.z = 2;
// var controls	= new THREE.OrbitControls(camera);
// //////////////////////////////////////////////////////////////////////////////////
// //		add an object in the scene
// //////////////////////////////////////////////////////////////////////////////////
// // add a torus	
// var geometry	= new THREE.TorusKnotGeometry(0.5-0.12, 0.12);
// var material	= new THREE.MeshNormalMaterial(); 
// var mesh	= new THREE.Mesh( geometry, material );
// scene.add( mesh );

// //////////////////////////////////////////////////////////////////////////////////
// //		render the whole thing on the page
// //////////////////////////////////////////////////////////////////////////////////
// // handle window resize
// window.addEventListener('resize', function(){
//     renderer.setSize( window.innerWidth, window.innerHeight )
//     camera.aspect	= window.innerWidth / window.innerHeight
//     camera.updateProjectionMatrix()		
// }, false);
// // render the scene
// onRenderFcts.push(function(){
//     renderer.render( scene, camera );		
// });

// // run the rendering loop
// var lastTimeMsec= null;
// requestAnimationFrame(function animate(nowMsec){
//     // keep looping
//     requestAnimationFrame( animate );
//     // measure time
//     lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
//     var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
//     lastTimeMsec	= nowMsec
//     // call each update function
//     onRenderFcts.forEach(function(onRenderFct){
//         onRenderFct(deltaMsec/1000, nowMsec/1000)
//     })
// });


var gltf_skeleton = null;

var orbitControls = null;
var container, camera, scene, renderer, loader;
var cameraIndex = 0;
var cameras = [];
var cameraNames = [];
var defaultCamera = null;
var gltf = null;
var mixer = null;
var clock = new THREE.Clock();

var skinMixers = [];

var animationSelector = document.getElementById('animations_list');
animationSelector.onchange = function() {
    playAnimation(animationSelector.selectedIndex);
}

function playAnimation(index) {
    // gltf_skeleton.animations[index].play();
    mixer.stopAllAction();
    mixer.clipAction( gltf_skeleton.animations[index] ).play();

    
}

function removeOptions(selectbox)
{
    var i;
    for(i = selectbox.options.length - 1 ; i >= 0 ; i--)
    {
        selectbox.remove(i);
    }
}



function onload() {
    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener( 'keydown', function(e) { onKeyDown(e); }, false );
    buildSceneList();
    // switchScene(0);
    switchScene(1);
    // switchScene(2);
    animate();
}
function initScene(index) {
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x222222 );
    defaultCamera = new THREE.PerspectiveCamera( 45, container.offsetWidth / container.offsetHeight, 0.001, 1000 );
    //defaultCamera.up = new THREE.Vector3( 0, 1, 0 );
    scene.add( defaultCamera );
    camera = defaultCamera;
    var sceneInfo = sceneList[index];
    var spot1 = null;
    if (sceneInfo.addLights) {
        var ambient = new THREE.AmbientLight( 0x222222 );
        scene.add( ambient );
        var directionalLight = new THREE.DirectionalLight( 0xdddddd );
        directionalLight.position.set( 0, 0, 1 ).normalize();
        scene.add( directionalLight );

        spot1   = new THREE.SpotLight( 0xffffff, 1 );
        // spot1.position.set( 10, 20, 10 );
        spot1.position.set( 10, 20, -30 );
        spot1.angle = 0.25;
        spot1.distance = 1024;
        spot1.penumbra = 0.75;
        if ( sceneInfo.shadows ) {
            spot1.castShadow = true;
            spot1.shadow.bias = 0.0001;
            spot1.shadow.mapSize.width = 2048;
            spot1.shadow.mapSize.height = 2048;
        }
        scene.add( spot1 );
    }
    // RENDERER
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    if (sceneInfo.shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    container.appendChild( renderer.domElement );
    var ground = null;
    if (sceneInfo.addGround) {
        var groundMaterial = new THREE.MeshPhongMaterial({
                color: 0xFFFFFF
            });
        ground = new THREE.Mesh( new THREE.PlaneBufferGeometry(512, 512), groundMaterial);
        if (sceneInfo.shadows) {
            ground.receiveShadow = true;
        }
        if (sceneInfo.groundPos) {
            ground.position.copy(sceneInfo.groundPos);
        } else {
            ground.position.z = -70;
        }
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);
    }
    loader = new THREE.GLTFLoader();
    for (var i = 0; i < extensionSelect.children.length; i++) {
        var child = extensionSelect.children[i];
        child.disabled = sceneInfo.extensions.indexOf(child.value) === -1;
        if (child.disabled && child.selected) {
            extensionSelect.value = extension = 'glTF';
        }
    }
    var url = sceneInfo.url;
    var r = eval("/" + '\%s' + "/g");
    url = url.replace(r, extension);
    if (extension === 'glTF-Binary') {
        url = url.replace('.gltf', '.glb');
    }
    var loadStartTime = performance.now();
    var status = document.getElementById("status");
    status.innerHTML = "Loading...";
    loader.load( url, function(data) {
        gltf = data;
        gltf_skeleton = gltf;


        console.log(gltf);

        var object = gltf.scene;
        status.innerHTML = "Load time: " + ( performance.now() - loadStartTime ).toFixed( 2 ) + " ms.";
        if (sceneInfo.cameraPos)
            defaultCamera.position.copy(sceneInfo.cameraPos);
        if (sceneInfo.center) {
            orbitControls.target.copy(sceneInfo.center);
        }
        if (sceneInfo.objectPosition) {
            object.position.copy(sceneInfo.objectPosition);
            if (spot1) {
                spot1.position.set(sceneInfo.objectPosition.x - 100, sceneInfo.objectPosition.y + 200, sceneInfo.objectPosition.z - 100 );
                spot1.target.position.copy(sceneInfo.objectPosition);
            }
        }
        if (sceneInfo.objectRotation)
            object.rotation.copy(sceneInfo.objectRotation);
        if (sceneInfo.objectScale)
            object.scale.copy(sceneInfo.objectScale);
        if ( sceneInfo.addEnvMap ) {
            var envMap = getEnvMap();
            object.traverse( function( node ) {
                if ( node.material && ( node.material.isMeshStandardMaterial ||
                     ( node.material.isShaderMaterial && node.material.envMap !== undefined ) ) ) {
                    node.material.envMap = envMap;
                    node.material.needsUpdate = true;
                }
            } );
            scene.background = envMap;
        }
        object.traverse( function ( node ) {
            if ( node.isMesh ) node.castShadow = true;
        } );
        cameraIndex = 0;
        cameras = [];
        cameraNames = [];
        if (gltf.cameras && gltf.cameras.length) {
            var i, len = gltf.cameras.length;
            for (i = 0; i < len; i++) {
                var addCamera = true;
                var cameraName = gltf.cameras[i].parent.name || ('camera_' + i);
                if (sceneInfo.cameras && !(cameraName in sceneInfo.cameras)) {
                        addCamera = false;
                }
                if (addCamera) {
                    cameraNames.push(cameraName);
                    cameras.push(gltf.cameras[i]);
                }
            }
            updateCamerasList();
            switchCamera(1);
        } else {
            updateCamerasList();
            switchCamera(0);
        }
        var animations = gltf.animations;
        if ( animations && animations.length ) {
            // mixer = new THREE.AnimationMixer( object );
            // for ( var i = 0; i < animations.length; i ++ ) {
            //     var animation = animations[ i ];
            //     // There's .3333 seconds junk at the tail of the Monster animation that
            //     // keeps it from looping cleanly. Clip it at 3 seconds
            //     if ( sceneInfo.animationTime )
            //         animation.duration = sceneInfo.animationTime;
            //     mixer.clipAction( animation ).play();
            // }
            removeOptions(animationSelector);
            mixer = new THREE.AnimationMixer( object );
            for ( var i = 0; i < animations.length; i ++ ) {
                var animation = animations[ i ];
                var o = document.createElement('option');
                o.text = animation.name || i;
                animationSelector.add(o);
            }
            playAnimation(0);
        }
        scene.add( object );
        onWindowResize();
    }, undefined, function ( error ) {
        console.error( error );
    } );
orbitControls = new THREE.OrbitControls(defaultCamera, renderer.domElement);
}
function onWindowResize() {
    defaultCamera.aspect = container.offsetWidth / container.offsetHeight;
    defaultCamera.updateProjectionMatrix();
    var i, len = cameras.length;
    for (i = 0; i < len; i++) { // just do it for default
        cameras[i].aspect = container.offsetWidth / container.offsetHeight;
        cameras[i].updateProjectionMatrix();
    }
    renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
    requestAnimationFrame( animate );

    var delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    for (var i = 0, len = skinMixers.length; i < len; i++) {
        skinMixers[i].update(delta);
    }

    // sub_skeleton_scene.
    if (gltf_skeleton) {
        gltf_skeleton.gl_avatar.nodes['head-end'].updateMatrixWorld(true);
    }
    

    if (cameraIndex == 0)
        orbitControls.update();

    render();
}
function render() {
    renderer.render( scene, camera );
}
function onKeyDown(event) {
    var chr = String.fromCharCode(event.keyCode);
    if (chr == ' ') {
        index = cameraIndex + 1;
        if (index > cameras.length)
        index = 0;
        switchCamera(index);
    } else {
        var index = parseInt(chr);
        if (!isNaN(index)	&& (index <= cameras.length)) {
            switchCamera(index);
        }
    }
}
var envMap;
function getEnvMap() {
    if ( envMap ) {
        return envMap;
    }
    // var path = 'textures/cube/Park2/';
    var path = 'textures/cube/sky/';
    var format = '.jpg';
    var urls = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];
    envMap = new THREE.CubeTextureLoader().load( urls );
    envMap.format = THREE.RGBFormat;
    return envMap;
}
var sceneList = [
    {
        name : 'Saber-body-walk', url : './models/gltf/saber-body-walk/saber-body-walk.gltf',
        cameraPos: new THREE.Vector3(3, 2, 3),
        objectRotation: new THREE.Euler(0, 0, 0),
        addLights: true,
        extensions: ['glTF', 'gl_avatar'],
        addEnvMap: true
    },
    {
        name : 'Saber-body-mixamo', url : './models/gltf/saber-body-mixamo-animations/saber-body-animations.gltf',
        cameraPos: new THREE.Vector3(3, 2, 3),
        objectRotation: new THREE.Euler(0, 180, 0),
        addLights: true,
        extensions: ['glTF', 'gl_avatar'],
        // addEnvMap: true
        addEnvMap: false
    },
    {
        name : 'Saber-body-mixamo-standpose', url : './models/gltf/saber-stand-pose/saber-stand-pose.gltf',
        cameraPos: new THREE.Vector3(3, 2, 3),
        objectRotation: new THREE.Euler(0, 180, 0),
        addLights: true,
        extensions: ['glTF', 'gl_avatar'],
        // addEnvMap: true
        addEnvMap: false
    },
    {
        name : 'BoomBox (PBR)', url : './models/gltf/BoomBox/%s/BoomBox.gltf',
        cameraPos: new THREE.Vector3(0.02, 0.01, 0.03),
        objectRotation: new THREE.Euler(0, Math.PI, 0),
        addLights:true,
        extensions: ['glTF', 'glTF-pbrSpecularGlossiness', 'glTF-Binary'],
        addEnvMap: true
    }
];
function buildSceneList() {
    var elt = document.getElementById('scenes_list');
    while( elt.hasChildNodes() ){
        elt.removeChild(elt.lastChild);
    }
    var i, len = sceneList.length;
    for (i = 0; i < len; i++) {
        var option = document.createElement("option");
        option.text=sceneList[i].name;
        elt.add(option);
    }
}
function switchScene(index) {
    cleanup();
    initScene(index);
    var elt = document.getElementById('scenes_list');
    elt.selectedIndex = index;
}
function selectScene() {
    var select = document.getElementById("scenes_list");
    var index = select.selectedIndex;
    if (index >= 0) {
        switchScene(index);
    }
}
function switchCamera(index) {
    cameraIndex = index;
    if (cameraIndex == 0) {
        camera = defaultCamera;
    }
    if (cameraIndex >= 1 && cameraIndex <= cameras.length) {
        camera = cameras[cameraIndex - 1];
    }
    var elt = document.getElementById('cameras_list');
    elt.selectedIndex = cameraIndex;
}
function updateCamerasList() {
    var elt = document.getElementById('cameras_list');
    while( elt.hasChildNodes() ){
        elt.removeChild(elt.lastChild);
    }
    var option = document.createElement("option");
    option.text="[default]";
    elt.add(option);
    var i, len = cameraNames.length;
    for (i = 0; i < len; i++) {
        var option = document.createElement("option");
        option.text=cameraNames[i];
        elt.add(option);
    }
}
function selectCamera() {
    var select = document.getElementById("cameras_list");
    var index = select.selectedIndex;
    if (index >= 0) {
        switchCamera(index);
    }
}
function toggleAnimations() {
    var i, len = gltf.animations.length;
    for (i = 0; i < len; i++) {
        var clip = gltf.animations[i];
        var action = mixer.existingAction( clip );
        if (action.isRunning()) {
            action.stop();
        } else {
            action.play();
        }
    }
}
var extensionSelect = document.getElementById("extensions_list");
var extension = extensionSelect.value;
function selectExtension()
{
    extension = extensionSelect.value;
    selectScene();
}
function cleanup() {
    if (container && renderer) {
        container.removeChild(renderer.domElement);
    }
    cameraIndex = 0;
    cameras = [];
    cameraNames = [];
    defaultCamera = null;
    if (!loader || !mixer)
        return;
    mixer.stopAllAction();

    // TODO: clean skinMixers
}

document.getElementById('scenes_list').onchange = selectScene;
document.getElementById('scenes_list').ondblclick = selectScene;

document.getElementById('cameras_list').onchange = selectCamera;
document.getElementById('cameras_list').ondblclick = selectCamera;

document.getElementById('extensions_list').onchange = selectExtension;

document.getElementById('animation_toggle').onclick = toggleAnimations;

onload();


var sub_skeleton_scene;

function skinOnload(type, key, data) {

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
    }

    // --------------------------

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
}







function selectGLTFAvatarSkin(type, key, uri) {

    // console.log(glAvatarSystem);
    if (glAvatarSystem.isLoaded(type, key)) {
        skinOnload(type, key, glAvatarSystem.accessories[type][key]);
    } else {
        loader.setGlAvatarOfLinkingSkeleton(gltf_skeleton.gl_avatar);
        loader.load( uri, function(data) {
            glAvatarSystem.accessories[type][key] = data;
            skinOnload(type, key, data);
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }

}


var cb = document.getElementById('clothes-btns');

var button;


button = cb.appendChild(document.createElement('button'));
button.innerHTML = 'mixamo-dress';
button.onclick = function() {
    selectGLTFAvatarSkin('clothes', 'maid-dress', 'models/gltf/saber-dress-mixamo/saber-dress.gltf');
};

button = cb.appendChild(document.createElement('button'));
button.innerHTML = 'mixamo-hair';
button.onclick = function() {
    selectGLTFAvatarSkin('hair', 'maid', 'models/gltf/saber-maid-hair-mixamo/saber-maid-hair.gltf');
};

button = cb.appendChild(document.createElement('button'));
button.innerHTML = 'mixamo-lily-hair';
button.onclick = function() {
    selectGLTFAvatarSkin('hair', 'lily', 'models/gltf/saber-lily-hair-sub-skeleton/saber-lily-hair-sub-skeleton.gltf');
};


// function createBones ( object, jsonBones ) {
// 	/* adapted from the THREE.SkinnedMesh constructor */
// 	// create bone instances from json bone data
//   const bones = jsonBones.map( gbone => {
// 		bone = new THREE.Bone()
// 		bone.name = gbone.name
// 		bone.position.fromArray( gbone.pos )
// 		bone.quaternion.fromArray( gbone.rotq )
// 		if ( gbone.scl !== undefined ) bone.scale.fromArray( gbone.scl )
// 		return bone
//   } )
//   // add bone instances to the root object
// 	jsonBones.forEach( ( gbone, index ) => {
//       if ( gbone.parent !== -1 && gbone.parent !== null && bones[ gbone.parent ] !== undefined ) {
//         bones[ gbone.parent ].add( bones[ index ] )
//       } else {
//         object.add( bones[ index ] )
//       }
//   } )
// 	return bones
// }