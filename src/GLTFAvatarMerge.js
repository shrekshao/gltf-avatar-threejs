// mergeGLTF util in browser


var textureWithVisibility = null;
var bodyIdLUTTexture = null;

// // this two keys are actually id for skeleton.textures
// var textureWithVisibilityKey = null;
// var bodyIdLUTTextureKey = null;

var visiblityMaterial = null;


var canvas1 = document.createElement('canvas');
var context1 = canvas1.getContext('2d');

function image2Data(img) {

    canvas1.width = img.width;
    canvas1.height = img.height;
    context1.drawImage(img, 0, 0);
    return context1.getImageData(0, 0, img.width, img.height);
}

function image2PNGDataURI(img) {
    canvas1.width = img.width;
    canvas1.height = img.height;
    context1.drawImage(img, 0, 0);
    return canvas1.toDataURL(); // default is png
}

function mergeGLTFAvatar(skeletonObject, skinObjectArray) {
    // {
    //     json: gltf json object,
    //     bins: { key: buffer, key: buffer, ...},
    //     imgs: { key: img, key: img, ...}
    // }

    console.log(skeletonObject.json);

    // TODO: change bins and imgs to array, use index instead of uri
    var merged = {
        json: Object.assign({}, skeletonObject.json),
        bins: Object.assign({}, skeletonObject.bins),
        // imgs: Object.assign({}, skeletonObject.imgs)
        imgs: {}
    };

    var skeleton = merged.json;
    // find texture with bodyIdLUT
    for (var i = 0, len = skeleton.materials.length; i < len; i++) {
        var m = skeleton.materials[i];
        if (m.extensions && m.extensions.gl_avatar && m.extensions.gl_avatar.bodyIdLUT !== undefined) {
            // m has pbr related texture
            // assume there's only one such a thing

            visiblityMaterial = m;
            // bodyIdLUTTexture = skeleton.textures[m.extensions.gl_avatar.bodyIdLUT];
            bodyIdLUTTexture = skeleton.images[skeleton.textures[m.extensions.gl_avatar.bodyIdLUT].source].uri;
            // bodyIdLUTTextureKey = m.extensions.gl_avatar.bodyIdLUT;
            // textureWithVisibility = skeleton.textures[m.pbrMetallicRoughness.baseColorTexture.index];
            textureWithVisibility = skeleton.images[skeleton.textures[m.pbrMetallicRoughness.baseColorTexture.index].source].uri;
            // textureWithVisibilityKey = m.pbrMetallicRoughness.baseColorTexture.index;

            merged.imgs[textureWithVisibility] = image2Data(skeletonObject.imgs[textureWithVisibility]);
            merged.imgs[bodyIdLUTTexture] = image2Data(skeletonObject.imgs[bodyIdLUTTexture]);

            break;
        }
    }



    // for (var key in merged.imgs) {
    //     merged.imgs[key] = image2Data(merged.imgs[key]);
    // }
    for (var key in skeletonObject.imgs) {
        if (! (key in merged.imgs)) {
            
            merged.imgs[key] = image2PNGDataURI(skeletonObject.imgs[key]);
        }
    }


    
    // merged.bins = merged.bins.concat(skeletonObject.bins);
    // merged.imgs = merged.imgs.concat(skeletonObject.imgs);



    if(!skeleton.extensions) {
        skeleton.extensions = {};
    }
    
    if (!skeleton.extensions.gl_avatar) {
        skeleton.extensions.gl_avatar = {};
    }
    
    
    if (!skeleton.extensions.gl_avatar.visibility) {
        skeleton.extensions.gl_avatar.visibility = [];
    }

    for (var i = 0, len = skinObjectArray.length; i < len; i++) {
        var skin = skinObjectArray[i];
        merge(skeleton, skin.json);

        // temp: this probably didn't support multiple export
        for (var key in skin.imgs) {
            // skin.imgs[key] = image2Data(skin.imgs[key]);
            skin.imgs[key] = image2PNGDataURI(skin.imgs[key]);
        }

        // TODO: solve duplicate key issue
        merged.bins = Object.assign( merged.bins, skin.bins );
        merged.imgs = Object.assign( merged.imgs, skin.imgs );

        bakeVisibility(merged, textureWithVisibility, bodyIdLUTTexture, skeleton.extensions.gl_avatar.visibility);
    }


    // 
    var img = merged.imgs[textureWithVisibility];
    canvas1.width = img.width;
    canvas1.height = img.height;
    context1.putImageData(img, 0, 0);
    merged.imgs[textureWithVisibility] = canvas1.toDataURL();

    delete merged.imgs[bodyIdLUTTexture];

    // send merged gltf and buffers & image to makeglb
    return merged;
}



/**
 * 
 * @param {*} skeleton gltf json
 * @param {*} skin gltf json
 */
function merge(skeleton, skin) {
    var i, len, j, lenj;

    var linkedSkeletons = skin.extensions.gl_avatar.linkedSkeletons || [];


    // buffers
    var bufferBaseId = skeleton.buffers.length;
    // for (i = 0, len = skin.buffers.length; i < len; i++) {
    //     skeleton.buffers.push(skin.buffers[i]);
    // }
    skeleton.buffers = skeleton.buffers.concat(skin.buffers);


    // bufferViews
    var bufferViewBaseId = skeleton.bufferViews.length;
    for (i = 0, len = skin.bufferViews.length; i < len; i++) {
        skeleton.bufferViews.push(skin.bufferViews[i]);
        skeleton.bufferViews[i + bufferViewBaseId].buffer += bufferBaseId;
    }

    // accessors
    var accessorBaseId = skeleton.accessors.length;
    for (i = 0, len = skin.accessors.length; i < len; i++) {
        skeleton.accessors.push(skin.accessors[i]);
        skeleton.accessors[i + accessorBaseId].bufferView += bufferViewBaseId;
    }


    // images
    // TODO: delete bodyIdLUT if exist, and change texture.source
    var imageBaseId = skeleton.images.length;
    skeleton.images = skeleton.images.concat(skin.images);

    // samplers
    var samplerBaseId = skeleton.samplers.length;
    skeleton.samplers = skeleton.samplers.concat(skin.samplers);

    // textures
    var textureBaseId = skeleton.textures.length;
    skeleton.textures = skeleton.textures.concat(skin.textures);
    for (i = 0, len = skin.textures.length; i < len; i++) {
        var t = skeleton.textures[i + textureBaseId];
        if (t.sampler !== undefined) {
            t.sampler += samplerBaseId;
        }
        if (t.source !== undefined) {
            t.source += imageBaseId;
        }
    }

    // materials
    var materialBaseId = skeleton.materials.length;

    // find texture with bodyIdLUT
    for (i = 0, len = skeleton.materials.length; i < len; i++) {
        var m = skeleton.materials[i];
        if (m.extensions && m.extensions.gl_avatar && m.extensions.gl_avatar.bodyIdLUT !== undefined) {
            // m has pbr related texture
            // assume there's only one such a thing

            visiblityMaterial = m;
            // bodyIdLUTTexture = skeleton.textures[m.extensions.gl_avatar.bodyIdLUT];
            bodyIdLUTTexture = skeleton.images[skeleton.textures[m.extensions.gl_avatar.bodyIdLUT].source].uri;
            // bodyIdLUTTextureKey = m.extensions.gl_avatar.bodyIdLUT;
            // textureWithVisibility = skeleton.textures[m.pbrMetallicRoughness.baseColorTexture.index];
            textureWithVisibility = skeleton.images[skeleton.textures[m.pbrMetallicRoughness.baseColorTexture.index].source].uri;
            // textureWithVisibilityKey = m.pbrMetallicRoughness.baseColorTexture.index;

            break;
        }
    }


    for (i = 0, len = skin.materials.length; i < len; i++) {
        skeleton.materials.push(skin.materials[i]);
        var m = skeleton.materials[i + materialBaseId];
        if (m.pbrMetallicRoughness !== undefined) {
            if (m.pbrMetallicRoughness.baseColorTexture !== undefined) {
                var bt = m.pbrMetallicRoughness.baseColorTexture;
                for (var tt in bt) {
                    bt[tt] += imageBaseId;
                }
            }
        }
    }



    // meshes
    var meshBaseId = skeleton.meshes.length;
    for (i = 0, len = skin.meshes.length; i < len; i++) {
        skeleton.meshes.push(skin.meshes[i]);
        var m = skeleton.meshes[i + meshBaseId];
        if (m.primitives !== undefined) {

            for (j = 0, lenj = m.primitives.length; j < lenj; j++) {
                var p = m.primitives[j];

                if (p.indices !== undefined) {
                    p.indices += accessorBaseId;
                }
    
                if (p.material !== undefined) {
                    p.material += materialBaseId;
                }
    
                if (p.attributes !== undefined) {
                    var a = p.attributes;
                    for (var att in a) {
                        a[att] += accessorBaseId;
                    }
                }
    
                if (p.extensions !== undefined) {
                    if (p.extensions.gl_avatar.attributes) {
                        var ea = p.extensions.gl_avatar.attributes;
                        if (!p.attributes) {
                            p.attributes = {};
                        }
                        for (var att2 in ea) {
                            p.attributes[att2] = ea[att2] + accessorBaseId;
                        }
                    }

                    delete p.extensions;
                }
            }
            
        }
    }

    // nodes
    var skinBaseId = skeleton.skins.length;

    var nodeRigidBind = {};
    var nodeBaseId = skeleton.nodes.length;
    // var numLinkedSkin = 0;
    for (i = 0, len = skin.nodes.length; i < len; i++) {
        skeleton.nodes.push(skin.nodes[i]);
        var n = skeleton.nodes[i + nodeBaseId];

        if (n.skin !== undefined) {
            n.skin += skinBaseId;
        }


        if (n.children !== undefined) {
            var c = n.children;
            for (j = 0, lenj = c.length; j < lenj; j++) {
                c[j] += nodeBaseId;
            }
        }

        if (n.mesh !== undefined) {
            n.mesh += meshBaseId;
        }

        // skins link
        if (n.extensions) {
            // create a new skin copy of skin linked
            // replace inverseBindMatrices
            if (n.extensions.gl_avatar) {
                if (n.extensions.gl_avatar.skin !== undefined) {
                    // linked skin
                    // assume linkedSkeletons exists
                    var linkedSkinInfo = linkedSkeletons[n.extensions.gl_avatar.skin];
                    var skinKey = linkedSkinInfo.skeleton;
                    var newSkin = Object.assign({}, skeleton.skins[skeleton.extensions.gl_avatar.skins[skinKey]]);
                    skeleton.skins.push(newSkin);
                    // numLinkedSkin++;
                    n.skin = skeleton.skins.length - 1;
                    newSkin.inverseBindMatrices = linkedSkinInfo.inverseBindMatrices + accessorBaseId;
                }

                var root = n.extensions.gl_avatar.root;
                if ( root !== undefined) {
                    // rigid bind / sub skeleton node
                    
                    var nid = i + nodeBaseId;
                    // nodeRigidBind[root] = nid;
                    nodeRigidBind[nid] = nid;
                    var newParentNode = skeleton.nodes[skeleton.extensions.gl_avatar.nodes[root]];
                    
                    if (!newParentNode.children) {
                        newParentNode.children = [];
                    }
                    newParentNode.children.push(nid);
                }
            }

            delete n.extensions;
        }
        
    }


    // remove rigidbind nodes' original parent node in skin
    // var finishUnparenting = false;
    var numUnparenting = (Object.keys(nodeRigidBind)).length;
    for (i = nodeBaseId, len = skeleton.nodes.length; i < len; i++) {
        var n = skeleton.nodes[i];
        if (n.children) {
            // for (j = 0, lenj = n.children.length; j < lenj; j++) {
            for (j = 0; j < n.children.length; j++) {
                if (n.children[j] in nodeRigidBind) {
                    // delete nodeRigidBind[n.children[j]];
                    n.children.splice(j, 1);
                    j--;
                    numUnparenting--;

                    if (numUnparenting == 0) {
                        i = len;    // early termination
                        break;
                    }

                }
            }
        }
    }



    // skins (sub-skeleton)
    if (skin.skins) {
        // if (!skeleton.skins) {
        //     skeleton.skins = [];
        // }

        for (i = 0, len = skin.skins.length; i < len; i++) {
            var s = skin.skins[i];

            if (s.gl_avatar) {
                // constructed linked skin in gltf loader
                continue;
            }

            skeleton.skins.push(s);

            if (s.joints) {
                for (j = 0, lenj = s.joints.length; j < lenj; j++) {
                    s.joints[j] += nodeBaseId;
                }
            }
            
            if (s.inverseBindMatrices !== undefined) {
                s.inverseBindMatrices += accessorBaseId;
            }

            if (s.skeleton !== undefined) {
                if (typeof s.skeleton == 'number') {
                    s.skeleton += nodeBaseId;
                } else {
                    s.skeleton = skeleton.extensions.gl_avatar.skins[s.skeleton];
                }
            }
        }
    }







    // scenes (assume only one scene)
    var sceneNodeBaseId = skeleton.scenes[0].nodes.length;
    skeleton.scenes[0].nodes = skeleton.scenes[0].nodes.concat(skin.scenes[0].nodes);
    for (i = 0, len = skin.scenes[0].nodes.length; i < len; i++) {
        // WARNING: TODO: the scene root node might also be rigid bind node
        skeleton.scenes[0].nodes[i + sceneNodeBaseId] += nodeBaseId;
    }

    
    // animations
    if (skin.animations) {
        if (!skeleton.animations) {
            skeleton.animations = [];
        }

        for (i = 0, len = skin.animations.length; i < len; i++) {
            var a = skin.animations[i];

            skeleton.animations.push(a);

            if (a.channels) {
                for (j = 0, lenj = a.channels.length; j < lenj; j++) {
                    var c = a.channels[j];
                    c.target.node += nodeBaseId;
                }
            }
            
            if (a.samplers) {
                for (j = 0, lenj = a.samplers.length; j < lenj; j++) {
                    var s = a.samplers[j];
                    s.input += accessorBaseId;
                    s.output += accessorBaseId;
                }
            }
        }
    }
    


    
    // TODO: cameras...


    // extensions: visibility array
    visibilityAndOperation(skeleton, skin.extensions.gl_avatar.visibility);

}




function visibilityAndOperation(skeleton, vi) {
    if (skeleton.extensions.gl_avatar.visibility.length === 0) {
        skeleton.extensions.gl_avatar.visibility = vi.slice(0);
        return;
    }

    var v = skeleton.extensions.gl_avatar.visibility;
    var vl = v.length;
    for (var i = 0, len = vi.length; i < len; i++) {
        if (vl <= i) {
            v[i] = vi[i];
        } else {
            v[i] = v[i] && vi[i];
        }
    }
}



function bakeVisibility(skeleton, texURI, bodyIdLUTURI, visibility) {
    if (texURI == null || bodyIdLUTURI == null) {
        console.log('No texture with visibility or body id lut in this model');
        return;
    }


    // console.log('texture with visibility: ', texInfo);
    // console.log('body Id LUT texture: ', bodyIdLUTInfo);

    visiblityMaterial.alphaMode = "MASK";
    visiblityMaterial.alphaCutOff = 0.5;


    // // some canvas used to get pixels array data
    // var img;
    // var canvas1 = document.createElement('canvas');
    // var context1 = canvas1.getContext('2d');
    // // img = texInfo.source;
    // img = skeleton.imgs[texURI];

    // canvas1.width = img.width;
    // canvas1.height = img.height;
    // context1.drawImage(img, 0, 0);
    // var tex = context1.getImageData(0, 0, img.width, img.height);

    // var canvas2 = document.createElement('canvas');
    // var context2 = canvas2.getContext('2d');
    // // img = bodyIdLUTInfo.source;
    // img = skeleton.imgs[bodyIdLUTURI];

    // canvas2.width = img.width;
    // canvas2.height = img.height;
    // context2.drawImage(img, 0, 0);
    // var lut = context2.getImageData(0, 0, img.width, img.height);

    var width = skeleton.imgs[texURI].width;
    var height = skeleton.imgs[texURI].height;

    var tex = skeleton.imgs[texURI].data;
    var lut = skeleton.imgs[bodyIdLUTURI].data;
    
    // temp: assume img and lut are of the same size
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var idx = (width * y + x) << 2;     // * 4
            
            var bodyId = lut[idx];

            if (visibility[bodyId] === 0) {
                tex[idx + 3] = 0;
            }
        }
    }


    // // write pixel back to image object
    // context1.putImageData(tex, 0, 0);
    


    // fs.createReadStream(texPath)
    // .pipe(new PNG({filterType: 4}))
    // .on('parsed', function() {

    //     var tex = this;

    //     fs.createReadStream(bodyIdLUTPath)
    //     .pipe(new PNG({filterType: 0}))
    //     .on('parsed', function() {
    //         var lut = this;

    //         // temp assume same size
    //         for (var y = 0; y < this.height; y++) {
    //             for (var x = 0; x < this.width; x++) {
    //                 var idx = (this.width * y + x) << 2;
                    
    //                 var bodyId = lut.data[idx];

    //                 if (visibilty[bodyId] === 0) {
    //                     tex.data[idx + 3] = 0;
    //                 }
    //             }
    //         }



    //         tex.pack().pipe(fs.createWriteStream(texPath));

    //     });



    // });
}



export {mergeGLTFAvatar};