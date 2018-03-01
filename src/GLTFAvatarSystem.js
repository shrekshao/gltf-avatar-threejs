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
            scene: null,
            // sceneID: null
            // asset: null
        }
    },

    // assets
    skeletons: {},

    accessories: {
        clothes: {},
        hair: {}
    },

    isLoaded: function (type, key) {
        return key in this.accessories[type];
    }
};

export { glAvatarSystem };