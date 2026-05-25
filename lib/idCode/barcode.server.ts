// lib/idCode/barcode.server.ts
import bwipjs from 'bwip-js'

export async function generateBarcodeBuffer(options: { id: string }) {
    return await bwipjs.toBuffer({
        bcid: 'code128',
        text: options.id,
        scale: 3,
        height: 20,
        includetext: true,
        textxalign: 'center',
        textsize: 11,
        paddingwidth: 6,
        paddingheight: 4,
        backgroundcolor: '#ffffff',
        barcolor: '#000000',
        textcolor: '#000000'
    })
}