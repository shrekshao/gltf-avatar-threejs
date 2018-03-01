const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
// const fs = require('fs');
const fs = require('fs-extra');
const path = require('path');

const PNG = require('pngjs').PNG;

// node .\tools\gltf-avatar-merge.js -s .\models\gltf\saber-body-walk\saber-body-walk.gltf -a .\models\gltf\saber-maid-hair\saber-maid-hair.gltf .\models\gltf\saber-maid-dress\saber-maid-dress.gltf -f models/merge
// node .\tools\gltf-avatar-merge.js -s .\models\gltf\saber-body-mixamo-animations\saber-body-animations.gltf -a .\models\gltf\saber-maid-hair-mixamo\saber-maid-hair.gltf .\models\gltf\saber-dress-mixamo\saber-dress.gltf -f models/merge
// node .\tools\gltf-avatar-merge.js -s .\models\gltf\saber-stand-pose\saber-stand-pose.gltf -a .\models\gltf\saber-maid-hair-mixamo\saber-maid-hair.gltf .\models\gltf\saber-dress-mixamo\saber-dress.gltf -f models/merge


const optionDefinitions = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this usage guide.'
    },
    {
        name: 'skeletonFilePath',
        alias: 's',
        type: String,
        description: '/path/to/accessory-file/skeleton-gltf-file'
    },
    {
        name: 'accessoriesFilePath',
        alias: 'a',
        type: String,
        multiple: true,
        // defaultValue: true,
        description: '/path/to/accessory-gltf-file [multiple]'
    },
    {
        name: 'outputFolder',
        alias: 'f',
        type: String,
        defaultValue: './',
        description: '/path/to/outputFolder'
    },
    {
        name: 'outputFilename',
        alias: 'o',
        type: String,
        defaultValue: 'output.gltf',
        description: 'output filename'
    }
];

const options = commandLineArgs(optionDefinitions);

if (options.help) {
    const usage = commandLineUsage([
        {
            header: 'glAvatar Merge test',
            content: 'Merge skeleton and accessories gltf into one gltf file'
        },
        {
            header: 'Options',
            optionList: optionDefinitions
        }
    ]);
    console.log(usage);
    return;
}


// // temp
// // TODO: cmd line arg
// var skeletonGltfPath = 'demo/models/saber-body-walk/';
// var skeletonGltfFilename = 'saber-body-walk.gltf';
// var accessoryGltfPath = 'demo/models/saber-maid-hair/';
// var accessoryGltfFilename = 'saber-maid-hair.gltf';
// var outputFilename = 'models/merged/output.gltf';
// var skeleton = JSON.parse(fs.readFileSync(skeletonGltfPath + skeletonGltfFilename));
// var accessory = JSON.parse(fs.readFileSync(accessoryGltfPath + accessoryGltfFilename));


// preprocess
// TODO: all sanity checks should happen here


var skeletonGltfDir = path.dirname(options.skeletonFilePath);
var accessoryFilepaths = options.accessoriesFilePath;

console.log('skeleton filename: ', options.skeletonFilePath);
console.log('skin filenames: ');
for (var i = 0, len = accessoryFilepaths.length; i < len; i++) {
    console.log(accessoryFilepaths[i]);
}


var skeleton = JSON.parse(fs.readFileSync(options.skeletonFilePath));
if(!skeleton.extensions) {
    skeleton.extensions = {};
}

if (!skeleton.extensions.gl_avatar) {
    skeleton.extensions.gl_avatar = {};
}


if (!skeleton.extensions.gl_avatar.visibility) {
    skeleton.extensions.gl_avatar.visibility = [];
}


var textureWithVisibility = null;
var bodyIdLUTTexture = null;

var visiblityMaterial = null;


// bake visibility 
// modify body texture, let its alpha = 0
// look at alphaMode: Mask, alphaCutOff
// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#alpha-coverage

function visibilityAndOperation(vi) {
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
            visiblityMaterial = m;
            bodyIdLUTTexture = skeleton.textures[m.extensions.gl_avatar.bodyIdLUT];
            textureWithVisibility = skeleton.textures[m.pbrMetallicRoughness.baseColorTexture.index];
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
    var nodeBaseId = skeleton.nodes.length;
    // var numLinkedSkin = 0;
    for (i = 0, len = skin.nodes.length; i < len; i++) {
        skeleton.nodes.push(skin.nodes[i]);
        var n = skeleton.nodes[i + nodeBaseId];
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
            if (n.extensions.gl_avatar && n.extensions.gl_avatar.skin !== undefined) {
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

            delete n.extensions;
        }
        
    }

    // scenes (assume only one scene)
    var sceneNodeBaseId = skeleton.scenes[0].nodes.length;
    skeleton.scenes[0].nodes = skeleton.scenes[0].nodes.concat(skin.scenes[0].nodes);
    for (i = 0, len = skin.scenes[0].nodes.length; i < len; i++) {
        skeleton.scenes[0].nodes[i + sceneNodeBaseId] += nodeBaseId;
    }
    
    
    // TODO: animations, cameras...


    // extensions: visibility array
    visibilityAndOperation(skin.extensions.gl_avatar.visibility);

}


function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function copyAssets(inputFolder, outputFolder) {
    // TODO: copy recursively using ncp

    var assets = fs.readdirSync(inputFolder);
    for (var i = 0, len = assets.length; i < len; i++) {
        if (path.extname(assets[i]) !== '.gltf') {
            fs.copySync( path.join(inputFolder, assets[i]), path.join(outputFolder, assets[i]) );
        }
    }
}



function bakeVisibility(texPath, bodyIdLUTPath, visibilty) {
    console.log('Texture with visibility path: ', texPath);
    console.log('body Id LUT texture path: ', bodyIdLUTPath);

    visiblityMaterial.alphaMode = "MASK";
    visiblityMaterial.alphaCutOff = 0.5;

    fs.createReadStream(texPath)
    .pipe(new PNG({filterType: 4}))
    .on('parsed', function() {

        var tex = this;

        fs.createReadStream(bodyIdLUTPath)
        .pipe(new PNG({filterType: 0}))
        .on('parsed', function() {
            var lut = this;

            // temp assume same size
            for (var y = 0; y < this.height; y++) {
                for (var x = 0; x < this.width; x++) {
                    var idx = (this.width * y + x) << 2;
                    
                    var bodyId = lut.data[idx];

                    if (visibilty[bodyId] === 0) {
                        tex.data[idx + 3] = 0;
                    }
                }
            }



            tex.pack().pipe(fs.createWriteStream(texPath));

        });



    });
}






var outputFilename = path.join(options.outputFolder, options.outputFilename);
ensureDirectoryExistence(outputFilename);

copyAssets(skeletonGltfDir, options.outputFolder);
for (var i = 0, len = accessoryFilepaths.length; i < len; i++) {
    merge(skeleton, JSON.parse(fs.readFileSync(accessoryFilepaths[i])));
    
    copyAssets( path.dirname(accessoryFilepaths[i]), options.outputFolder );
}


// modify body texture to reflect visibility
if (textureWithVisibility && bodyIdLUTTexture){
    var textureWithVisibilityPath = path.join(options.outputFolder, skeleton.images[textureWithVisibility.source].uri);
    var textureBodyIdLUTPath = path.join(options.outputFolder, skeleton.images[bodyIdLUTTexture.source].uri);
    bakeVisibility(textureWithVisibilityPath, textureBodyIdLUTPath, skeleton.extensions.gl_avatar.visibility);
}

// TODO: delete gltf extensions
fs.writeFileSync(outputFilename, JSON.stringify(skeleton));