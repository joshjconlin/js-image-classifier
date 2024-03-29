const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
require('@tensorflow/tfjs-node');

const fs = require('fs');
const jpeg = require('jpeg-js');
const request = require('request');

const NUMBER_OF_CHANNELS = 3;

const downloadImg = async (path, filename) => {
    return new Promise((resolve) => {
        request.head(path, function(err, res, body) {
            request(path).pipe(fs.createWriteStream(filename)).on('close', () => console.log(`downloaded ${filename}`) || resolve(filename));
        });
    });
};

const readImage = async (path, filename) => {
    const imagePath = await downloadImg(path, filename);
    const buf = fs.readFileSync(imagePath);
    const pixels = jpeg.decode(buf, true);
    return pixels;
}

const imageByteArray = (image, numChannels) => {
    const pixels = image.data;
    const numPixels = image.width * image.height;
    const values = new Int32Array(numChannels * numPixels);

    for(let i = 0; i< numPixels; i++) {
        for (let channel = 0; channel < numChannels; ++channel) {
            values[i * numChannels + channel] = pixels[i * 4 + channel];
        }
    }

    return values;
}

const imageToInput = (image, numChannels) => {
    const values = imageByteArray(image, numChannels);
    const outShape = [image.height, image.width, numChannels];

    const input = tf.tensor3d(values, outShape, 'int32');

    return input;
}

const loadModel = async path => {
    const mn = mobilenet;
    mn.path = `file://${path}`;
    const model = await mn.load();
    return model;
}

const classify = async (model, path, filename) => {
    try {
        const image = await readImage(path, filename);
        const input = imageToInput(image, NUMBER_OF_CHANNELS);

        const mn_model = await loadModel(model);
        const predictions = await mn_model.classify(input);

        console.log('classification results:', predictions[0]);
    } catch(e) {
        console.warn(e);
    }
}

if (process.argv.length !== 5) throw new Error('incorrect arguments: node script.js <MODEL> <IMAGE_FILE>');

classify(process.argv[2], process.argv[3], process.argv[4]);



