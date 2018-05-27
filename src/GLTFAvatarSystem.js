var THREE = require('three');

var glAvatarSystem = {

    curSkeleton: {
        name: null,
        scene: null
        // sceneID: null
        // asset: null
    },

    curVisibilityArray: null,

    curAccessories: {
        clothes: {
            name: null,
            scene: null
            // sceneID: null
            // asset: null
        },
        hair: {
            name: null,
            scene: null
            // sceneID: null
            // asset: null
        },
        instrument: {
            name: null,
            scene: null
        }
    },

    // assets
    skeletons: {},

    accessories: {
        clothes: {},
        hair: {},
        instrument: {}
    },



    repo: {
        skeletons: {
            'mixamo': {
                url: 'models/gltf/saber-body-mixamo-animations/saber-body-animations.gltf',
                // scene info (camera, light)
                cameraPos: new THREE.Vector3(1.5, 2, 1.5),
                center: new THREE.Vector3(0, 0.8, 0),
                objectRotation: new THREE.Euler(0, 180, 0),
                // init skins
                skins: {
                    hair: 'maid',
                    clothes: 'maid-dress'
                }
            },
            'stand-pose': {
                url: 'models/gltf/saber-stand-pose/saber-stand-pose.gltf',
                
                cameraPos: new THREE.Vector3(1.5, 2, 1.5),
                center: new THREE.Vector3(0, 0.8, 0),
                objectRotation: new THREE.Euler(0, 180, 0),

                skins: {
                    hair: 'lily',
                    clothes: 'maid-dress'
                }
            }

        },
        clothes: {
            'maid-dress': 'models/gltf/saber-dress-mixamo/saber-dress.gltf',
            'suit': 'models/gltf/saber-suit/saber-suit.gltf'
        },
        hair: {
            'maid': 'models/gltf/saber-maid-hair-mixamo/saber-maid-hair.gltf',
            'lily': 'models/gltf/saber-lily-hair-sub-skeleton/saber-lily-hair-sub-skeleton.gltf'
        },
        instrument: {
            
        }
    },

    isLoaded: function (type, key) {
        return key in this.accessories[type];
    }
};

export { glAvatarSystem };