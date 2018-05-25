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
            'mixamo': 'models/gltf/saber-body-mixamo-animations/saber-body-animations.gltf',
            'stand-pose': 'models/gltf/saber-stand-pose/saber-stand-pose.gltf'

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