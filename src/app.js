var THREE = require('three');
THREE.OrbitControls = require('three-orbit-controls')(THREE);

import '../css/style.css';

var renderer	= new THREE.WebGLRenderer({
    antialias	: true
});
renderer.setClearColor(new THREE.Color('lightgrey'), 1);
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
// array of functions for the rendering loop
var onRenderFcts= [];
// init scene and camera
var scene	= new THREE.Scene();
var camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.z = 2;
var controls	= new THREE.OrbitControls(camera);
//////////////////////////////////////////////////////////////////////////////////
//		add an object in the scene
//////////////////////////////////////////////////////////////////////////////////
// add a torus	
var geometry	= new THREE.TorusKnotGeometry(0.5-0.12, 0.12);
var material	= new THREE.MeshNormalMaterial(); 
var mesh	= new THREE.Mesh( geometry, material );
scene.add( mesh );

//////////////////////////////////////////////////////////////////////////////////
//		render the whole thing on the page
//////////////////////////////////////////////////////////////////////////////////
// handle window resize
window.addEventListener('resize', function(){
    renderer.setSize( window.innerWidth, window.innerHeight )
    camera.aspect	= window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()		
}, false);
// render the scene
onRenderFcts.push(function(){
    renderer.render( scene, camera );		
});

// run the rendering loop
var lastTimeMsec= null;
requestAnimationFrame(function animate(nowMsec){
    // keep looping
    requestAnimationFrame( animate );
    // measure time
    lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
    var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
    lastTimeMsec	= nowMsec
    // call each update function
    onRenderFcts.forEach(function(onRenderFct){
        onRenderFct(deltaMsec/1000, nowMsec/1000)
    })
});