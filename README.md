# gltf-avatar-threejs loader and viewer

An dynamic avatar system based on glTF which supports: 

- [x] switchable skin (clothes, hair, accessory) sharing a skeleton
- [x] fragment-granuality skin visibility
- [x] sub-skeleton and animations in skin file
- [x] rigid bind
- [x] merge and output as valid standard glTF (without need for extension support loader)
- [ ] TODO: hair, clothes physics

## glTF Avatar Spec v0.2

### Skeleton (Base / Main / Character) file

* An example of glTF avatar features in a skeleton file

```json
{
    "extensionsUsed": [
        "gl_avatar"
    ],
    "extensions": {
        "gl_avatar": {
            "type": "skeleton",
            "skins": {
                "main": 2
            },
            "nodes": {
                "head": 8,
                "head-end": 9
            }
        }
    },
    "materials": [
        {
            "name": "saber-pure-body",
            "...": "...",
            "extensions": {
                "gl_avatar": {
                    "bodyIdLUT": 2
                }
            }
        },
        "..."
    ],
    "nodes": [
        {
            "mesh": 0,
            "name": "F010_Saber_Body",
            "skin": 0,
            "extensions": {
                "gl_avatar": {
                    "skin": 2
                }
            }
        },
        "..."
    ],
    "...": "..."
}
```

* `materials[i].extensions.gl_avatar.bodyIdLUT` : bodyIdLUT is the texture id of a body id look up table texture
* `node[i].extensions.gl_avatar.skin` : this is used for threejs gltf loader to pick up this skin


### Skin (Clothes / Accessory) file


* An example of glTF avatar features in a skin file

```json
{
    "extensionsUsed": [
        "gl_avatar"
    ],
    "extensions": {
        "gl_avatar": {
            "visibility": [
                0, 
                1, 1, 1, 0, 0, 
                0, 0, 1, 1, 1, 
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1,
                1, 1, 1, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 1, 1,
                0, 0, 1, 1, 1,
                0, 0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 0
            ],
            "type": "skin",
            "linkedSkeletons": [
                {
                    "inverseBindMatrices": 174,
                    "name": "Saber_maid_dress",
                    "skeleton": "main"
                }
            ]
        }
    },
    "meshes": [
        {
            "name": "F010_Saber.003",
            "primitives": [
                {
                    "...": "...",
                    "extensions": {
                        "gl_avatar": {
                            "attributes": {
                                "JOINTS_0": 159,
                                "WEIGHTS_0": 173
                            }
                        }
                    }
                }
            ]
        }
    ],
    "nodes": [
        {
            "name": "Saber_maid_dress",
            "...": "...",
            "extensions": {
                "gl_avatar": {
                    "skin": 0
                }
            }
        },
    ],
    "skins": [
        {
            "name": "F005_Saber_Lily_Hair",
            "...": "...",
            "extensions": {
                "gl_avatar": {
                    "root": "head-end"
                }
            }
        }
    ],
    "...": "..."
}
```