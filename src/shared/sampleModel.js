

const sampleText=(textResponse, number) => {
     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'text',
    text: { body: textResponse },
  });

    return data
};


const sampleImage=(textResponse, number) => {

     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'image',
    image: { link: textResponse },
  });

    return data
};


const sampleAudio=(textResponse, number) => {

     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'audio',
    audio: { link: textResponse },
  });

    return data
};

const sampleVideo=(textResponse, number) => {

     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'video',
    video: { link: textResponse },
  });

    return data
};

const sampleDocument=(textResponse, number) => {

     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'document',
    document: { link: textResponse },
  });

    return data
};


module.exports = {
    sampleText,
    sampleImage,
    sampleAudio,
    sampleVideo,
    sampleDocument
};