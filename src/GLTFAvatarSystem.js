var glAvatarSystem = {

    curSkeleton: {
        name: null,
        scene: null,
        sceneID: null
    },

    curVisibilityArray: null,

    curAccessories: {
        clothes: {
            name: null,
            scene: null,
            sceneID: null
        },
        hair: {
            name: null,
            scene: null,
            sceneID: null
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