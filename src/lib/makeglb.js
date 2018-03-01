  var files=[];
  var fileblobs=[];
  var gltf;
  var remainingfilestoprocess=0;
  var glbfilename;

  var outputBuffers;
  var bufferMap;
  var bufferOffset;


  function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }


//   var dropZone = document.getElementById('drop_zone');
//   dropZone.addEventListener('dragover', handleDragOver, false);
//   dropZone.addEventListener('drop', handleFileSelect, false);


  function addDownloadButton() {
    var btn = document.createElement("button");
    btn.id="downloadBtn";
    btn.disabled=true;
    btn.onclick= startDownload;
    btn.appendChild(document.createTextNode("Processing..."));
    document.getElementById("download").appendChild(btn);
  }

  function startDownload(){
      document.getElementById("downloadLink").click();
  }

  function handleFileSelect(event) {
    event.stopPropagation();
    event.preventDefault();
    document.getElementById('list').innerHTML="";
    addDownloadButton();
    var items = event.dataTransfer.items;
    remainingfilestoprocess=items.length;
    for (var i=0; i<items.length; i++) {
      if (items[i].getAsEntry) {
      var entry = items[i].getAsEntry();
       } else if (items[i].webkitGetAsEntry) {
       var entry = items[i].webkitGetAsEntry();
      }
      if (entry) {
          traverseFileTree(entry);
      }
    }
  }

  function traverseFileTree(item, path) {
  path = path || "";
  if (item.isFile) {
    item.file(function(file) {
        files.push(file);
        var fileitem = '<li><strong>'+ escape(file.name)+ '</strong> ('+ file.type + ') - '+
                  file.size+ ' bytes, last modified: '+ file.lastModifiedDate +
                  '</li>';
        document.getElementById('list').innerHTML += fileitem;

        var extension = file.name.split('.').pop();
        if ( extension === "gltf")
          {
            glbfilename=file.name.substr(file.name.lastIndexOf('/')+1,file.name.lastIndexOf('.'));
          var reader = new FileReader();
          reader.readAsText(file);
          reader.onload = function(event) {
            gltf = JSON.parse(event.target.result);
            checkRemaining();
            };
        }
        else{
          var reader = new FileReader();
          reader.onload = (function(theFile) {
          return function(e) {
          fileblobs[theFile.name.toLowerCase()]=(e.target.result);
          checkRemaining();
          };
        })(file);
        reader.readAsArrayBuffer(file);
      }
    },function(error){
        console.log(error);
    });
  } else if (item.isDirectory) {
    var dirReader = item.createReader();
    dirReader.readEntries(function(entries) {
        remainingfilestoprocess+=entries.length;
        checkRemaining();
      for (var i=0; i<entries.length; i++) {
        traverseFileTree(entries[i], path + item.name + "/");
      }
    });
  }
}

function checkRemaining(){
    remainingfilestoprocess--;
    if(remainingfilestoprocess===0){
      outputBuffers = [];
      bufferMap = new Map();
      bufferOffset = 0;
      processBuffers().then(fileSave);
    }
}

function processBuffers(){
  var pendingBuffers = gltf.buffers.map(function (buffer, bufferIndex) {
    return dataFromUri(buffer)
      .then(function(data) {
        if (data !== undefined) {
          outputBuffers.push(data);
        }
        delete buffer.uri;
        buffer.byteLength = data.byteLength;
        bufferMap.set(bufferIndex, bufferOffset);
        bufferOffset += alignedLength(data.byteLength);
      });
  });

  return Promise.all(pendingBuffers)
    .then(function() {
        var bufferIndex = gltf.buffers.length;
        var images = gltf.images || [];
        var pendingImages = images.map(function (image) {
          return dataFromUri(image).then(function(data) {
            if (data === undefined) {
                delete image['uri'];
                return;
            }
            var bufferView = {
                buffer: 0,
                byteOffset: bufferOffset,
                byteLength: data.byteLength,
            };
            bufferMap.set(bufferIndex, bufferOffset);
            bufferIndex++;
            bufferOffset += alignedLength(data.byteLength);
            var bufferViewIndex = gltf.bufferViews.length;
            gltf.bufferViews.push(bufferView);
            outputBuffers.push(data);
            image['bufferView'] = bufferViewIndex;
            image['mimeType'] = getMimeType(image.uri);
            delete image['uri'];
          });
        });
        return Promise.all(pendingImages);
    });
}

// function fileSave(){
function fileSave(gltf, bins, imgs){


    var bufferMap = new Map();
    var outputBuffers = [];
    var bufferOffset = 0;

    // gltf.buffers.map(function (data, bufferIndex) {
    //     if (data !== undefined) {
    //         outputBuffers.push(data);
    //     }
    //     bufferMap.set(bufferIndex, bufferOffset);
    //     bufferOffset += alignedLength(data.byteLength);
    // });

    gltf.buffers.map(function (buffer, bufferIndex) {
        var data = bins[buffer.uri];
        if (data !== undefined) {
            outputBuffers.push(data);
        }
        delete buffer.uri;
        buffer.byteLength = data.byteLength;
        bufferMap.set(bufferIndex, bufferOffset);
        bufferOffset += alignedLength(data.byteLength);
    });


    // TODO: warning: !! the image data has to be raw array buffer received to make the following work
    // getdata from image data is not correct for output with encoding here!

    // append images as bufferview
    // now images are all image/png in datauri
    var bufferIndex = gltf.buffers.length;
    for (var i = 0, len = gltf.images.length; i < len; i++) {
        
        var image = gltf.images[i];
        // var data = imgs[image.uri].data.buffer;
        if (!(image.uri in imgs)) {
            continue;
            delete image['uri'];
        }

        // var data = decodeBase64(imgs[image.uri]);
        // var data = atob(imgs[image.uri]);
        var data = dataURItoArraybuffer(imgs[image.uri], 'image/png');

        var bufferView = {
            buffer: 0,
            byteOffset: bufferOffset,
            byteLength: data.byteLength,
        };
        bufferMap.set(bufferIndex, bufferOffset);
        bufferIndex++;
        bufferOffset += alignedLength(data.byteLength);

        var bufferViewIndex = gltf.bufferViews.length;
        gltf.bufferViews.push(bufferView);
        outputBuffers.push(data);
        image['bufferView'] = bufferViewIndex;
        // image['mimeType'] = getMimeType(image.uri);
        image['mimeType'] =  'image/png';

        delete image['uri'];
    }

    var Binary = {
        Magic: 0x46546C67
    };

    for (var _i = 0, _a = gltf.bufferViews; _i < _a.length; _i++) {
        var bufferView = _a[_i];
        if(bufferView.byteOffset=== undefined){
            bufferView.byteOffset=0;
        }
        else{
        bufferView.byteOffset = bufferView.byteOffset + bufferMap.get(bufferView.buffer);
      }
        bufferView.buffer = 0;
    }
    var binBufferSize = bufferOffset;
    gltf.buffers = [{
        byteLength: binBufferSize
    }];

    var enc = new TextEncoder();
    var jsonBuffer = enc.encode(JSON.stringify(gltf));
    var jsonAlignedLength = alignedLength(jsonBuffer.length);
    var padding;
    if (jsonAlignedLength !== jsonBuffer.length) {

        padding = jsonAlignedLength- jsonBuffer.length;
    }
    var totalSize = 12 + // file header: magic + version + length
        8 + // json chunk header: json length + type
        jsonAlignedLength +
        8 + // bin chunk header: chunk length + type
        binBufferSize;
    var finalBuffer = new ArrayBuffer(totalSize);
    var dataView = new DataView(finalBuffer);
    var bufIndex = 0;
    dataView.setUint32(bufIndex, Binary.Magic, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 2, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, totalSize, true);
    bufIndex += 4;
    // JSON
    dataView.setUint32(bufIndex, jsonAlignedLength, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 0x4E4F534A, true);
    bufIndex += 4;

    for (var j=0;j<jsonBuffer.length;j++){
        dataView.setUint8(bufIndex, jsonBuffer[j]);
        bufIndex++;
    }
    if(padding!==undefined){
        for (var j=0;j<padding;j++){
            dataView.setUint8(bufIndex, 0x20);
        bufIndex++;
    }
    }

    // BIN
    dataView.setUint32(bufIndex, binBufferSize, true);
    bufIndex += 4;
    dataView.setUint32(bufIndex, 0x004E4942, true);
    bufIndex += 4;
    for (var i = 0; i < outputBuffers.length; i++) {
      var bufoffset = bufIndex + bufferMap.get(i);
      var buf = new Uint8Array(outputBuffers[i]);
      var thisbufindex=bufoffset;
      for (var j=0;j<buf.byteLength;j++){
        dataView.setUint8(thisbufindex, buf[j]);
        thisbufindex++;
    }
    }
    var a = document.getElementById("downloadLink");
    var file = new Blob([finalBuffer],{type: 'model/json-binary'})
    a.href = URL.createObjectURL(file);
    // a.download = glbfilename+".glb";
    a.download = "merged.glb";
    // document.getElementById("downloadBtn").disabled=false;
    // document.getElementById("downloadBtn").textContent="Download .glb";
    a.click();
}




function dataURItoArraybuffer(dataURI, type) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return ia.buffer;
}



function dataURItoBlob(dataURI, type) {
    // convert base64 to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var bb = new Blob([ab], { type: type });
    return bb;
}

function isBase64(uri) {
    return uri.length < 5 ? false : uri.substr(0, 5) === "data:";
}
function decodeBase64(uri) {
    return fetch(uri).then(function(response) { return response.arrayBuffer(); });
}
function dataFromUri(buffer) {
    if (buffer.uri === undefined) {
      return Promise.resolve(undefined);
    } else if (isBase64(buffer.uri)) {
      return decodeBase64(buffer.uri);
    } else {
      var filename=buffer.uri.substr(buffer.uri.lastIndexOf('/')+1);
      return Promise.resolve(fileblobs[filename.toLowerCase()]);
    }
}
function alignedLength(value) {
    var alignValue = 4;
    if (value == 0) {
        return value;
    }
    var multiple = value % alignValue;
    if (multiple === 0) {
        return value;
    }
    return value + (alignValue - multiple);
}

function getMimeType(filename) {
    for (var mimeType in gltfMimeTypes) {
        for (var extensionIndex in gltfMimeTypes[mimeType]) {
            var extension = gltfMimeTypes[mimeType][extensionIndex];
            if (filename.toLowerCase().endsWith('.' + extension)) {
                return mimeType;
            }
        }
    }
    return 'application/octet-stream';
}

var gltfMimeTypes = {
    'image/png': ['png'],
    'image/jpeg': ['jpg', 'jpeg'],
    'text/plain': ['glsl', 'vert', 'vs', 'frag', 'fs', 'txt'],
    'image/vnd-ms.dds': ['dds']
};


export {fileSave};
