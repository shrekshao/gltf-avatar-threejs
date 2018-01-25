const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require('fs');

// usage: 
// node glavatar-pipeline.js foo.gltf [-S|--skeleton|-s|--skin]

const optionDefinitions = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this usage guide.'
    },
    {
        name: 'gltf',
        type: String,
        defaultOption: true,
        description: 'The input gltf file to process',
        typeLabel: '<file>'
    },
    {
        name: 'skeleton',
        alias: 'S',
        type: Boolean,
        description: 'if this gltf file is a skeleton file'
    },
    {
        name: 'skin',
        alias: 's',
        type: Boolean,
        defaultValue: true,
        description: 'if this gltf file is a skin file'
    },
    {
        name: 'outputFilename',
        alias: 'o',
        type: String,
        description: 'output filename'
    }
];
const options = commandLineArgs(optionDefinitions);

if (options.help) {
    const usage = commandLineUsage([
        {
            header: 'glAvatar Pipeline',
            content: 'Handful tool to modify glTF files with ones with glAvatar extensions'
        },
        {
            header: 'Options',
            optionList: optionDefinitions
        }
    ]);
    console.log(usage);
} else {
    let gltf = JSON.parse(fs.readFileSync(options.gltf));

    if (Array.isArray(gltf.extensionsUsed)) {
        gltf.extensionsUsed.push('gl_avatar');
    } else {
        gltf.extensionsUsed = ['gl_avatar'];
    }


    let outputFilename = options.outputFilename || 'output.gltf';

    if (options.skeleton) {
        
        // console.log('skeleton');

        gltf.extensionsUsed = gltf.extensionsUsed || {};
        gltf.extensionsUsed.push('gl_avatar');

        gltf.extensions = gltf.extensions || {};
        // sort of hard coded
        gltf.extensions.gl_avatar =  {
            type: 'skeleton',
            skins: {
                main: 0
            }
        };

        // add bodyidlut

    } else if (options.skin) {
        // console.log('skin');

        // gltf.extensionsUsed = gltf.extensionsUsed || {};
        // gltf.extensionsUsed.push('gl_avatar');

        // root extensions
        gltf.extensions = gltf.extensions || {};
        gltf.extensions.gl_avatar = {
            visibility: [
                0, 
                1, 1, 1, 1, 1, 
                1, 1, 1, 1, 1, 
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1,
                1, 1, 1, 1, 1
            ],
            type: 'skin'
        };


        // parse mesh and primitive, move JOINT and WEIGHT to extensions
        for (let i = 0, leni = gltf.meshes.length; i < leni; i++) {
            let mesh = gltf.meshes[i];
            for (let j = 0, lenj = mesh.primitives.length; j < lenj; j++) {
                let primitive = mesh.primitives[j];
                if (primitive.attributes.JOINTS_0 !== undefined) {
                    if (!primitive.extensions) {
                        primitive.extensions = {};
                    }
                    primitive.extensions.gl_avatar = {
                        'attributes': {
                            'JOINTS_0': primitive.attributes.JOINTS_0
                        }
                    };

                    delete primitive.attributes.JOINTS_0;

                    if (primitive.attributes.WEIGHTS_0 !== undefined) {
                        primitive.extensions.gl_avatar.attributes.WEIGHTS_0 = primitive.attributes.WEIGHTS_0;
                        delete primitive.attributes.WEIGHTS_0;
                    }

                    if (primitive.attributes.JOINTS_1 !== undefined) {
                        primitive.extensions.gl_avatar.attributes.JOINTS_1 = primitive.attributes.JOINTS_1;
                        delete primitive.attributes.JOINTS_1;
                    }

                    if (primitive.attributes.WEIGHTS_1 !== undefined) {
                        primitive.extensions.gl_avatar.attributes.WEIGHTS_1 = primitive.attributes.WEIGHTS_1;
                        delete primitive.attributes.WEIGHTS_1;
                    }
                }
            }
        }


        // parse nodes, move skin to extensions
        // assume only one joint array (skeleton)
        for (let i = 0, leni = gltf.nodes.length; i < leni; i++) {
            let node = gltf.nodes[i];
            if (node.skin !== undefined) {
                if (!node.extensions) {
                    node.extensions = {};
                }
                node.extensions.gl_avatar = {
                    // 'skin': {
                    //     'name': 'main',  //temp
                    //     'inverseBindMatrices': gltf.skins[node.skin].inverseBindMatrices
                    // }
                    'skin': 0   //temp
                }

                delete node.skin;
            }
        }


        // put skin info in root extensions
        var ls = gltf.extensions.gl_avatar.linkedSkeletons = gltf.skins;
        // for (let i = 0, leni = ls.length; i < leni; i++) {
        var i = 0;
        ls[i].skeleton = 'main';
        // }

        // TODO: remove skin related nodes
        delete gltf.skins;


        // delete ls.joints;


        fs.writeFileSync(outputFilename, JSON.stringify(gltf));
    } else {
        console.error('A glTF file must either be a skeleton file or skin file.');
    }
}


// console.log(gltf);
