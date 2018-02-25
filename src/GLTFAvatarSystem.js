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

    selectAnimation: function(id) {
        if (this.curSkeleton.scene) {
            this.curSkeleton.scene.curAnimationId = id;
        }
    },

    initVisibilityArray: function() {
        for (var i = 0, len = BODY_VISIBILITY_LENGTH; i < len; i++) {
            this.curVisibilityArray[i * 4] = 1;
        }
        // glAvatarViewer.glAvatarConfig.updateBodyVisibilityBuffer(this.curVisibilityArray);
        glAvatarViewer.glAvatarConfig.curVisibilityArray = this.curVisibilityArray;
    },

    updateVisibilityArray: function(cat, v) {

        if (this.accessories[cat][this.curAccessories[cat].name]) {
            var oldVisibility = this.accessories[cat][this.curAccessories[cat].name].json.extensions.gl_avatar.visibility;
            for (var i = 0, len = BODY_VISIBILITY_LENGTH; i < len; i++) {
                this.curVisibilityArray[i * 4] = (this.curVisibilityArray[i * 4] || !oldVisibility[i]) && v[i];
            }
        } else {
            for (var i = 0, len = BODY_VISIBILITY_LENGTH; i < len; i++) {
                this.curVisibilityArray[i * 4] = this.curVisibilityArray[i * 4] && v[i];
            }
        }
        

        

        // update uniform block
        glAvatarViewer.glAvatarConfig.updateBodyVisibilityBuffer(this.curVisibilityArray);
        
    },

    init: function(canvas) {
        glAvatarViewer.init(canvas);
    },
    render: function() {
        // glTFLoader.loadGLTF(initGltfUrl, function(glTF) {
        //     glAvatarSystem.curSkeleton.name = 'saber';
        //     skeletonGltfScene = glAvatarSystem.curSkeleton.scene = glAvatarViewer.setupScene(glTF);
            
        //     glAvatarViewer.renderer.render();
        // });
        

        glAvatarSystem.selectSkeleton('saber', initGltfUrl, function(gltf){
            if (glAvatarSystem.onload) {
                glAvatarSystem.onload(gltf);
            }
            glAvatarViewer.renderer.render();
        });
    },

    onload: null
};