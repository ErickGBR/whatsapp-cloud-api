

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

const sampleButton=(textResponse, number) => {
  
     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Choose an option:'
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'button1',
              title: 'Option 1'
            }
          },
          {
            type: 'reply',
            reply: {
              id: 'button2',
              title: 'Option 2'
            }
          }
        ]
      }
    }
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
}


const sampleList=(textResponse, number) => {
  
     const data = JSON.stringify({
    messaging_product: 'whatsapp',
    to: number,
    type: 'list',
    interactive: {
      type: 'list',
      body: {
        text: 'Please select an option:'
      },
      footer: {
        text: 'Footer text here'
      },
      action: {
        button: 'View Options',
        sections: [
          {
            title: 'Section 1',
            rows: [
              {
                id: 'option1',
                title: 'Option 1',
                description: 'Description for option 1'
              },
              {
                id: 'option2',
                title: 'Option 2',
                description: 'Description for option 2'
              }
            ]
          }
        ]
      }
    }
  });

    return data
};


module.exports = {
    sampleText,
    sampleImage,
    sampleAudio,
    sampleVideo,
    sampleDocument,
    sampleButton,
    sampleList
};