// This demonstrates creating and binding a shared THREE.Skeleton to multiple THREE.SkinnedMesh instances.
//
// A THREE.Group instance is used as an armature root object.
// Body and Clothes THREE.SkinnedMesh instances, and a THREE.Bone
// heirarchy are parented to the root object.
//
// NOTE: This is using unpatched dev branch 81dev

const SCENE_URL = 'https://gist.githubusercontent.com/satori99/6f642d37999d73fafbdecd5deee0a93b/raw/human.json'

var viewport, renderer, clock, scene, camera
var root, skeleton, body, clothes
var mixer, action

init()

function init() {
	viewport = document.querySelector('#viewport')
	renderer = new THREE.WebGLRenderer( { canvas: viewport, antialias: true } )
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setSize( viewport.clientWidth, viewport.clientHeight )
  renderer.clear()
  clock = new THREE.Clock()
  document.body.appendChild( renderer.domElement )
  new THREE.ObjectLoader().load( SCENE_URL, result => {
    scene = result
    // find camera
    camera = scene.getObjectByName( 'Camera' )
    camera.aspect = viewport.clientWidth / viewport.clientHeight
    camera.updateProjectionMatrix()
    // find armature root object.
    // This is a group instance with a userData.bones property
    // containing bones in the same format as would normally be 
    // found on a SkinnedMesh Geometry instance
    root = scene.getObjectByName( 'Human' )
    // manually create bones and parent them to the root object
    // NOTE: This is normally done in the SkinnedMesh constructor
    const bones = createBones( root, root.userData.bones )
    // Important! must update world matrices before creating skeleton instance
    root.updateMatrixWorld()
    // create skeleton
    skeleton = new THREE.Skeleton( bones, undefined, true )
    // create SkinnedMesh from static mesh geometry
    body = createSkinnedMesh( root.getObjectByName( 'Body' ), skeleton )
    clothes = createSkinnedMesh( root.getObjectByName( 'Clothes' ), skeleton )
    // create skeleton helper
		helper = new THREE.SkeletonHelper( root )
		scene.add( helper )
    // skeletal animation
    mixer = new THREE.AnimationMixer( root )
		action = mixer.clipAction( scene.animations[ 0 ] ).play()
    // button events
    document.querySelector( '#toggle-body' ).onclick = ( e ) => body.visible = ! body.visible 
    document.querySelector( '#toggle-clothes' ).onclick = ( e ) => clothes.visible = ! clothes.visible 
    document.querySelector( '#toggle-skeleton' ).onclick = ( e ) => helper.visible = ! helper.visible
    document.querySelector( '#toggle-animation' ).onclick = ( e ) => action.enabled = ! action.enabled
    document.querySelector( '#arms-down' ).onclick = ( e ) => {
    	root.getObjectByName( 'Arm_L' ).rotateY( -Math.PI / 16 )
      root.getObjectByName( 'Arm_R' ).rotateY( Math.PI / 16 )
    }
    document.querySelector( '#arms-up' ).onclick = ( e ) => {
    	root.getObjectByName( 'Arm_L' ).rotateY( Math.PI / 16 )
      root.getObjectByName( 'Arm_R' ).rotateY( -Math.PI / 16 )
    }
    // start
    animate()
  } )
}

function animate() {
	requestAnimationFrame( animate )
  renderer.render( scene, camera )
  // update skeletal animcation
	mixer.update( clock.getDelta() )
  // update skeleton helper
	helper.update()
  // animate the whole character
  const v = Date.now() / 2000
	root.position.x = Math.sin( v )
  root.position.z = Math.cos( v )
}

function createBones ( object, jsonBones ) {
	/* adapted from the THREE.SkinnedMesh constructor */
	// create bone instances from json bone data
  const bones = jsonBones.map( gbone => {
		bone = new THREE.Bone()
		bone.name = gbone.name
		bone.position.fromArray( gbone.pos )
		bone.quaternion.fromArray( gbone.rotq )
		if ( gbone.scl !== undefined ) bone.scale.fromArray( gbone.scl )
		return bone
  } )
  // add bone instances to the root object
	jsonBones.forEach( ( gbone, index ) => {
      if ( gbone.parent !== -1 && gbone.parent !== null && bones[ gbone.parent ] !== undefined ) {
        bones[ gbone.parent ].add( bones[ index ] )
      } else {
        object.add( bones[ index ] )
      }
  } )
	return bones
}

function createSkinnedMesh ( mesh, skeleton ) {
	// create SkinnedMesh from static mesh geometry and swap it in the scene graph
  const skinnedMesh = new THREE.SkinnedMesh( mesh.geometry, mesh.material )
  skinnedMesh.castShadow = true
  skinnedMesh.receiveShadow = true
  // bind to skeleton
  skinnedMesh.bind( skeleton, mesh.matrixWorld )
  // swap mesh for skinned mesh
  mesh.parent.add( skinnedMesh )
  mesh.parent.remove( mesh )
  return skinnedMesh
}